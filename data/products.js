// Database Proxy & Syncer for LARRE (Inspired by Rare Rabbit)

let PRODUCTS_CACHE = [];
let ORDERS_CACHE = [];

// Fallback initial products
const FALLBACK_PRODUCTS = [
  {
    "id": "p1",
    "name": "PRIMA TEXTURED SHIRT",
    "category": "Men",
    "subcategory": "Shirts",
    "price": 3450,
    "originalPrice": 4200,
    "rating": 4.8,
    "reviewsCount": 24,
    "colors": [
      { "name": "Ecru", "value": "#F5F2EB", "images": [
        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=800"
      ]}
    ],
    "sizes": ["S", "M", "L", "XL"],
    "description": "Tailored from ultra-premium long-staple cotton, the Prima Textured Shirt exhibits a subtle herringbone weave.",
    "specifications": ["100% Giza Cotton"],
    "featured": true,
    "stock": 12,
    "newArrival": true,
    "sale": false
  }
];

// Synchronize caches with REST API
async function syncDataFromServer() {
  try {
    // 1. Fetch Products
    const prodRes = await fetch('/api/products');
    if (prodRes.ok) {
      PRODUCTS_CACHE = await prodRes.json();
      localStorage.setItem("larre_products", JSON.stringify(PRODUCTS_CACHE));
    } else {
      throw new Error("Failed to load products API");
    }
  } catch (err) {
    console.warn("Backend API Offline. Falling back to LocalStorage for products.", err);
    PRODUCTS_CACHE = JSON.parse(localStorage.getItem("larre_products")) || FALLBACK_PRODUCTS;
  }

  try {
    // 2. Fetch Orders
    const ordRes = await fetch('/api/orders');
    if (ordRes.ok) {
      ORDERS_CACHE = await ordRes.json();
      localStorage.setItem("larre_orders", JSON.stringify(ORDERS_CACHE));
    } else {
      throw new Error("Failed to load orders API");
    }
  } catch (err) {
    console.warn("Backend API Offline. Falling back to LocalStorage for orders.", err);
    ORDERS_CACHE = JSON.parse(localStorage.getItem("larre_orders")) || [];
  }
}

// Synchronous Getters (return cache)
function getProductsFromDB() {
  if (PRODUCTS_CACHE.length === 0) {
    PRODUCTS_CACHE = JSON.parse(localStorage.getItem("larre_products")) || FALLBACK_PRODUCTS;
  }
  return PRODUCTS_CACHE;
}

function getOrdersFromDB() {
  if (ORDERS_CACHE.length === 0) {
    ORDERS_CACHE = JSON.parse(localStorage.getItem("larre_orders")) || [];
  }
  return ORDERS_CACHE;
}

// Asynchronous Write Proxies
async function saveProductToServer(product, isNew = false) {
  // Update local cache first
  if (isNew) {
    PRODUCTS_CACHE.push(product);
  } else {
    const idx = PRODUCTS_CACHE.findIndex(p => p.id === product.id);
    if (idx > -1) PRODUCTS_CACHE[idx] = product;
  }
  localStorage.setItem("larre_products", JSON.stringify(PRODUCTS_CACHE));

  try {
    let url = '/api/products';
    let method = 'POST';
    if (!isNew) {
      url = `/api/products/${product.id}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) console.error("Server failed to save product changes.");
  } catch (err) {
    console.error("Network error while saving product.", err);
  }
}

async function deleteProductFromServer(productId) {
  // Update local cache first
  PRODUCTS_CACHE = PRODUCTS_CACHE.filter(p => p.id !== productId);
  localStorage.setItem("larre_products", JSON.stringify(PRODUCTS_CACHE));

  try {
    const res = await fetch(`/api/products/${productId}`, {
      method: 'DELETE'
    });
    if (!res.ok) console.error("Server failed to delete product.");
  } catch (err) {
    console.error("Network error while deleting product.", err);
  }
}

async function submitOrderToServer(order) {
  // Add to local cache first
  ORDERS_CACHE.unshift(order);
  localStorage.setItem("larre_orders", JSON.stringify(ORDERS_CACHE));

  // Subtract quantity from local products cache
  order.items.forEach(orderItem => {
    const dbProd = PRODUCTS_CACHE.find(p => p.name === orderItem.name);
    if (dbProd) {
      dbProd.stock = Math.max(0, dbProd.stock - orderItem.qty);
    }
  });
  localStorage.setItem("larre_products", JSON.stringify(PRODUCTS_CACHE));

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (!res.ok) console.error("Server failed to write order checkout.");
  } catch (err) {
    console.error("Network error submitting order.", err);
  }
}

async function updateOrderStatusOnServer(orderId, newStatus) {
  // Update local cache first
  const idx = ORDERS_CACHE.findIndex(o => o.id === orderId);
  if (idx > -1) {
    ORDERS_CACHE[idx].status = newStatus;
    localStorage.setItem("larre_orders", JSON.stringify(ORDERS_CACHE));
  }

  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) console.error("Server failed to set order status.");
  } catch (err) {
    console.error("Network error updating order status.", err);
  }
}

// Deprecated old local sync functions kept for compatibility
function saveProductsToDB(products) {
  PRODUCTS_CACHE = products;
  localStorage.setItem("larre_products", JSON.stringify(products));
}
function saveOrdersToDB(orders) {
  ORDERS_CACHE = orders;
  localStorage.setItem("larre_orders", JSON.stringify(orders));
}
