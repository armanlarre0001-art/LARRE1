// Admin Dashboard Panel Controller

function initAdminPage() {
  calculateKPIs();
  renderAdminProducts();
  renderAdminOrders();
}

function calculateKPIs() {
  const orders = getOrdersFromDB();
  const products = getProductsFromDB();

  // 1. Revenue
  const totalRevenue = orders.reduce((sum, ord) => sum + ord.total, 0);
  document.getElementById("kpi-revenue").textContent = `₹${totalRevenue.toLocaleString()}`;

  // 2. Orders Count
  document.getElementById("kpi-orders").textContent = orders.length;

  // 3. Average Order Value (AOV)
  const aov = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;
  document.getElementById("kpi-aov").textContent = `₹${aov.toLocaleString()}`;

  // 4. Low Stock count (Stock < 5)
  const lowStockCount = products.filter(p => p.stock < 5).length;
  const kpiStock = document.getElementById("kpi-stock");
  kpiStock.textContent = lowStockCount;
  if (lowStockCount > 0) {
    kpiStock.style.color = "#EF4444";
  } else {
    kpiStock.style.color = "var(--text-primary)";
  }
}

// Render Products CRUD Table
function renderAdminProducts() {
  const productsBody = document.getElementById("admin-products-table-body");
  if (!productsBody) return;

  const products = getProductsFromDB();

  productsBody.innerHTML = products.map((product, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${product.colors[0].images[0]}" alt="${product.name}" style="width: 40px; aspect-ratio: 3/4; object-fit: cover;">
          <span style="font-weight: 500; text-transform: uppercase;">${product.name}</span>
        </div>
      </td>
      <td>${product.category}</td>
      <td>₹${product.price.toLocaleString()}</td>
      <td>
        <span style="font-weight: 600; color: ${product.stock < 5 ? '#EF4444' : 'inherit'}">
          ${product.stock} units
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 0.75rem;">
          <button onclick="openEditProductModal('${product.id}')" style="color: var(--color-gold); font-weight: 500; font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase;">Edit</button>
          <button onclick="deleteProduct('${product.id}')" style="color: #EF4444; font-weight: 500; font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase;">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// Render Orders Tracker
function renderAdminOrders() {
  const ordersBody = document.getElementById("admin-orders-table-body");
  if (!ordersBody) return;

  const orders = getOrdersFromDB();

  ordersBody.innerHTML = orders.map(order => `
    <tr>
      <td style="font-weight: 600; font-family: monospace;">${order.id}</td>
      <td>
        <div>
          <div style="font-weight: 600;">${order.customer}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${order.email}</div>
        </div>
      </td>
      <td>${order.date}</td>
      <td>${order.itemsCount} items</td>
      <td style="font-weight: 600;">₹${order.total.toLocaleString()}</td>
      <td>
        <select class="sort-select" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onchange="updateOrderStatus('${order.id}', this.value)">
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
          <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
        </select>
      </td>
    </tr>
  `).join("");
}

// Order CRUD action - Syncs to Server
async function updateOrderStatus(orderId, newStatus) {
  await updateOrderStatusOnServer(orderId, newStatus);
  calculateKPIs();
  showToast(`Order ${orderId} status set to ${newStatus}`);
}

// Product Management CRUD Logic
let editingProductId = null;

function openAddProductModal() {
  editingProductId = null;
  document.getElementById("product-modal-title").textContent = "Add Luxury Product";
  document.getElementById("product-form").reset();
  openModal("product-crud-modal");
}

function openEditProductModal(productId) {
  editingProductId = productId;
  const products = getProductsFromDB();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  document.getElementById("product-modal-title").textContent = "Edit Product Details";
  document.getElementById("prod-name").value = product.name;
  document.getElementById("prod-category").value = product.category;
  document.getElementById("prod-subcategory").value = product.subcategory;
  document.getElementById("prod-price").value = product.price;
  document.getElementById("prod-original-price").value = product.originalPrice || product.price;
  document.getElementById("prod-stock").value = product.stock;
  document.getElementById("prod-image").value = product.colors[0].images[0];
  document.getElementById("prod-desc").value = product.description;

  openModal("product-crud-modal");
}

async function saveProductSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("prod-name").value.trim().toUpperCase();
  const category = document.getElementById("prod-category").value;
  const subcategory = document.getElementById("prod-subcategory").value.trim();
  const price = parseInt(document.getElementById("prod-price").value);
  const originalPrice = parseInt(document.getElementById("prod-original-price").value) || price;
  const stock = parseInt(document.getElementById("prod-stock").value);
  const image = document.getElementById("prod-image").value.trim();
  const description = document.getElementById("prod-desc").value.trim();

  if (!name || !subcategory || isNaN(price) || isNaN(stock) || !image || !description) {
    showToast("Please fill in all required inputs", "error");
    return;
  }

  const products = getProductsFromDB();

  if (editingProductId) {
    // Edit flow
    const index = products.findIndex(p => p.id === editingProductId);
    if (index > -1) {
      const updatedProduct = {
        ...products[index],
        name,
        category,
        subcategory,
        price,
        originalPrice,
        stock,
        description,
        colors: [
          {
            name: products[index].colors[0].name,
            value: products[index].colors[0].value,
            images: [image, products[index].colors[0].images[1] || image]
          }
        ]
      };
      
      await saveProductToServer(updatedProduct, false);
      showToast("Product updated successfully");
    }
  } else {
    // Add flow
    const newId = "p" + (products.length + 10);
    const newProduct = {
      id: newId,
      name,
      category,
      subcategory,
      price,
      originalPrice,
      rating: 5.0,
      reviewsCount: 1,
      colors: [
        {
          name: "Standard",
          value: "#000000",
          images: [image, image]
        }
      ],
      sizes: ["S", "M", "L", "XL"],
      description,
      specifications: [
        "Premium crafted tailoring details",
        "Handcrafted quality build",
        "Comfort and versatility fit"
      ],
      featured: true,
      stock,
      newArrival: true,
      sale: false
    };
    
    await saveProductToServer(newProduct, true);
    showToast("New Product Added!");
  }

  closeModal("product-crud-modal");
  
  // Refresh views
  initAdminPage();
}

async function deleteProduct(productId) {
  if (confirm("Are you sure you want to retire this product from inventory?")) {
    await deleteProductFromServer(productId);
    initAdminPage();
    showToast("Product retired from inventory");
  }
}
