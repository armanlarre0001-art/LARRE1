import os
import json
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingTCPServer

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# MIME types dictionary
MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
}

class LarreBackendHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # Allow CORS for easy API requests if testing externally
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path_query = urllib.parse.parse_qs(parsed_url.query)
        path = parsed_url.path

        # ----------------------------------------------------
        # REST API Endpoints
        # ----------------------------------------------------
        if path == '/api/products':
            self.serve_json_file('data/products.json')
            return

        elif path == '/api/orders':
            self.serve_json_file('data/orders.json')
            return

        elif path == '/api/reviews':
            prod_id = path_query.get('prodId', [None])[0]
            if not prod_id:
                self.send_error_response(400, 'Missing prodId parameter')
                return

            reviews = self.read_json_file('data/reviews.json')
            prod_reviews = reviews.get(prod_id, [])
            self.send_success_response(prod_reviews)
            return

        # ----------------------------------------------------
        # Static Files Serving
        # ----------------------------------------------------
        else:
            # Map path to local filesystem
            local_path = path.lstrip('/')
            if local_path == '' or local_path == '#':
                local_path = 'index.html'

            full_path = os.path.join(DIRECTORY, local_path)

            # Prevent Directory Traversal vulnerability
            normalized_path = os.path.normpath(full_path)
            if not normalized_path.startswith(DIRECTORY):
                self.send_error_response(403, 'Forbidden')
                return

            if os.path.exists(normalized_path) and os.path.isfile(normalized_path):
                ext = os.path.splitext(normalized_path)[1].lower()
                mime = MIME_TYPES.get(ext, 'application/octet-stream')

                try:
                    with open(normalized_path, 'rb') as f:
                        content = f.read()
                    self.send_response(200)
                    self.send_header('Content-Type', mime)
                    self.send_header('Content-Length', len(content))
                    self.end_headers()
                    self.wfile.write(content)
                except Exception as e:
                    self.send_error_response(500, f'Internal Server Error: {str(e)}')
            else:
                self.send_error_response(404, 'File Not Found')

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        # Read POST body contents
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b''
        
        try:
            body = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            self.send_error_response(400, 'Invalid JSON body')
            return

        # ----------------------------------------------------
        # API: Create Product (Admin CRUD)
        # ----------------------------------------------------
        if path == '/api/products':
            products = self.read_json_file('data/products.json')
            new_id = f"p{len(products) + 10}"
            
            new_product = {
                "id": new_id,
                "name": body.get("name", "").upper(),
                "category": body.get("category", "Men"),
                "subcategory": body.get("subcategory", "General"),
                "price": int(body.get("price", 0)),
                "originalPrice": int(body.get("originalPrice", body.get("price", 0))),
                "rating": 5.0,
                "reviewsCount": 0,
                "colors": [
                    {
                        "name": "Standard",
                        "value": "#000000",
                        "images": [body.get("image", ""), body.get("image", "")]
                    }
                ],
                "sizes": ["S", "M", "L", "XL"],
                "description": body.get("description", ""),
                "specifications": [
                    "Premium crafted tailoring details",
                    "Handcrafted quality build",
                    "Comfort and versatility fit"
                ],
                "featured": True,
                "stock": int(body.get("stock", 0)),
                "newArrival": True,
                "sale": False
            }
            
            products.append(new_product)
            self.write_json_file('data/products.json', products)
            self.send_success_response({"message": "Product created successfully", "product": new_product})

        # ----------------------------------------------------
        # API: Submit Checkout Order
        # ----------------------------------------------------
        elif path == '/api/orders':
            orders = self.read_json_file('data/orders.json')
            products = self.read_json_file('data/products.json')

            order_items = body.get('items', [])
            if not order_items:
                self.send_error_response(400, 'Order has no items')
                return

            # Decrement inventory stock counts
            for item in order_items:
                prod_id = item.get('id')
                qty = int(item.get('quantity', 0))
                db_prod = next((p for p in products if p['id'] == prod_id), None)
                if db_prod:
                    db_prod['stock'] = max(0, db_prod['stock'] - qty)

            # Generate receipt structure
            order_id = f"ORD-{json.loads(post_data.decode('utf-8')).get('orderId', int(1000 + (hash(str(post_data)) % 9000)))}"
            new_order = {
                "id": order_id,
                "customer": body.get('customer', 'Guest'),
                "email": body.get('email', ''),
                "date": body.get('date', ''),
                "itemsCount": sum(item.get('quantity', 1) for item in order_items),
                "total": int(body.get('total', 0)),
                "status": "pending",
                "items": [
                    {
                        "name": i.get('name', 'Product'),
                        "size": i.get('size', 'M'),
                        "color": i.get('color', 'Standard'),
                        "price": int(i.get('price', 0)),
                        "qty": int(i.get('quantity', 1))
                    } for i in order_items
                ]
            }

            orders.insert(0, new_order)
            self.write_json_file('data/orders.json', orders)
            self.write_json_file('data/products.json', products)
            self.send_success_response({"message": "Order created successfully", "orderId": order_id})

        # ----------------------------------------------------
        # API: Submit Product Review
        # ----------------------------------------------------
        elif path == '/api/reviews':
            prod_id = body.get('productId')
            review = body.get('review')
            if not prod_id or not review:
                self.send_error_response(400, 'Missing review metadata')
                return

            # Append to reviews JSON
            reviews_db = self.read_json_file('data/reviews.json')
            if prod_id not in reviews_db:
                reviews_db[prod_id] = []
            
            reviews_db[prod_id].append(review)
            self.write_json_file('data/reviews.json', reviews_db)

            # Recalculate average rating in products database
            products_db = self.read_json_file('data/products.json')
            db_idx = next((i for i, p in enumerate(products_db) if p['id'] == prod_id), None)
            if db_idx is not None:
                rev_list = reviews_db[prod_id]
                avg_rating = sum(r['rating'] for r in rev_list) / len(rev_list)
                products_db[db_idx]['rating'] = round(avg_rating, 1)
                products_db[db_idx]['reviewsCount'] = len(rev_list)
                self.write_json_file('data/products.json', products_db)

            self.send_success_response({"message": "Review submitted successfully"})

        # ----------------------------------------------------
        # API: Mock User Logins / Signup
        # ----------------------------------------------------
        elif path == '/api/auth/login':
            self.send_success_response({"status": "authenticated", "name": body.get('email', '').split('@')[0].upper()})

        elif path == '/api/auth/register':
            self.send_success_response({"status": "otp_sent"})

        else:
            self.send_error_response(404, 'Endpoint Not Found')

    def do_PUT(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        body = json.loads(post_data.decode('utf-8')) if post_data else {}

        # ----------------------------------------------------
        # API: Edit Product details (Admin CRUD)
        # ----------------------------------------------------
        if path.startswith('/api/products/'):
            prod_id = path.split('/')[-1]
            products = self.read_json_file('data/products.json')
            
            idx = next((i for i, p in enumerate(products) if p['id'] == prod_id), None)
            if idx is None:
                self.send_error_response(404, 'Product Not Found')
                return

            products[idx]["name"] = body.get("name", products[idx]["name"]).upper()
            products[idx]["category"] = body.get("category", products[idx]["category"])
            products[idx]["subcategory"] = body.get("subcategory", products[idx]["subcategory"])
            products[idx]["price"] = int(body.get("price", products[idx]["price"]))
            products[idx]["originalPrice"] = int(body.get("originalPrice", products[idx]["originalPrice"]))
            products[idx]["stock"] = int(body.get("stock", products[idx]["stock"]))
            products[idx]["description"] = body.get("description", products[idx]["description"])
            
            # Edit first image
            if body.get("image"):
                products[idx]["colors"][0]["images"][0] = body.get("image")

            self.write_json_file('data/products.json', products)
            self.send_success_response({"message": "Product updated successfully", "product": products[idx]})

        # ----------------------------------------------------
        # API: Update Order Status (Admin Tracking)
        # ----------------------------------------------------
        elif path.startswith('/api/orders/'):
            order_id = path.split('/')[-1]
            orders = self.read_json_file('data/orders.json')

            idx = next((i for i, o in enumerate(orders) if o['id'] == order_id), None)
            if idx is None:
                self.send_error_response(404, 'Order Not Found')
                return

            orders[idx]["status"] = body.get("status", orders[idx]["status"])
            self.write_json_file('data/orders.json', orders)
            self.send_success_response({"message": "Order status updated successfully", "order": orders[idx]})
        
        else:
            self.send_error_response(404, 'Endpoint Not Found')

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        # ----------------------------------------------------
        # API: Delete/Retire Product (Admin CRUD)
        # ----------------------------------------------------
        if path.startswith('/api/products/'):
            prod_id = path.split('/')[-1]
            products = self.read_json_file('data/products.json')
            
            filtered_prods = [p for p in products if p['id'] != prod_id]
            if len(filtered_prods) == len(products):
                self.send_error_response(404, 'Product Not Found')
                return

            self.write_json_file('data/products.json', filtered_prods)
            self.send_success_response({"message": "Product retired from catalog"})
        else:
            self.send_error_response(404, 'Endpoint Not Found')

    # ----------------------------------------------------
    # Helper File IO and Network Response Utilities
    # ----------------------------------------------------
    def read_json_file(self, filename):
        full_path = os.path.join(DIRECTORY, filename)
        if not os.path.exists(full_path):
            return [] if 'products' in filename or 'orders' in filename else {}
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return [] if 'products' in filename or 'orders' in filename else {}

    def write_json_file(self, filename, data):
        full_path = os.path.join(DIRECTORY, filename)
        with open(full_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def serve_json_file(self, filename):
        data = self.read_json_file(filename)
        self.send_success_response(data)

    def send_success_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_header('Content-Length', len(response_bytes))
        self.end_headers()
        self.wfile.write(response_bytes)

    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        error_payload = json.dumps({"error": message}).encode('utf-8')
        self.wfile.write(error_payload)

class ThreadedLarreServer(ThreadingTCPServer):
    allow_reuse_address = True

if __name__ == '__main__':
    server_address = ('', PORT)
    httpd = ThreadedLarreServer(server_address, LarreBackendHandler)
    print(f"Luxury LARRE Server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Luxury LARRE Server...")
        httpd.server_close()
