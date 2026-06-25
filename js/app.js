// Central Application Controller & Router

document.addEventListener("DOMContentLoaded", async () => {
  // Sync databases from Python API backend first
  await syncDataFromServer();

  // Initialize state
  initAppTheme();
  setupEventListeners();
  
  // Router Initialization
  handleRouting();
  window.addEventListener("hashchange", handleRouting);

  // Initialize UI counts
  updateCartUI();
  updateWishlistUI();
});

// 1. ROUTING CONTROLLER
function handleRouting() {
  const hash = window.location.hash || "#home";
  
  // Close any open drawers or modals
  closeAllDrawers();
  closeAllModals();

  // Reset scroll position
  window.scrollTo(0, 0);

  // View switches
  const views = ["home", "shop", "product", "checkout", "admin"];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add("hidden");
  });

  // Dynamic Navigation state
  updateNavbarActiveState(hash);

  if (hash === "#home" || hash === "") {
    document.getElementById("view-home").classList.remove("hidden");
    initHomePage();
  } else if (hash === "#shop") {
    document.getElementById("view-shop").classList.remove("hidden");
    initShopPage();
  } else if (hash.startsWith("#product/")) {
    const prodId = hash.split("/")[1];
    document.getElementById("view-product").classList.remove("hidden");
    renderProductDetailsPage(prodId);
  } else if (hash === "#checkout") {
    document.getElementById("view-checkout").classList.remove("hidden");
    initCheckoutPage();
  } else if (hash === "#admin") {
    document.getElementById("view-admin").classList.remove("hidden");
    initAdminPage();
  } else {
    // Fallback to Home
    document.getElementById("view-home").classList.remove("hidden");
  }
}

function navigateTo(path) {
  window.location.hash = path;
}

function updateNavbarActiveState(hash) {
  const links = document.querySelectorAll(".nav-link");
  links.forEach(link => {
    const href = link.getAttribute("href");
    if (href === hash) {
      link.style.color = "var(--color-gold)";
    } else {
      link.style.color = "inherit";
    }
  });
}

// 2. THEME CONTROLLER
function initAppTheme() {
  const savedTheme = localStorage.getItem("larre_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeToggleIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("larre_theme", next);
  updateThemeToggleIcon(next);
  showToast(`Theme switched to ${next} mode`);
}

function updateThemeToggleIcon(theme) {
  const icon = document.getElementById("theme-toggle-icon");
  if (icon) {
    if (theme === "dark") {
      icon.className = "ri-sun-line";
    } else {
      icon.className = "ri-moon-line";
    }
  }
}

// 3. PAGE INITIALIZERS & RENDERING
function initHomePage() {
  // Render high-end curated featured grid
  const products = getProductsFromDB();
  const featured = products.filter(p => p.featured).slice(0, 4);
  
  const grid = document.getElementById("home-featured-grid");
  if (grid) {
    grid.innerHTML = featured.map(product => {
      const isWish = inWishlist(product.id);
      const isSale = product.originalPrice > product.price;
      
      return `
        <div class="product-card">
          <div class="product-image-wrapper">
            ${isSale ? '<div class="product-badge badge-sale">Sale</div>' : ''}
            <button class="product-wishlist-btn ${isWish ? 'active' : ''}" data-wishlist-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist('${product.id}')">
              <i class="${isWish ? 'ri-heart-fill' : 'ri-heart-line'}"></i>
            </button>
            <a href="#product/${product.id}">
              <img src="${product.colors[0].images[0]}" alt="${product.name}" class="product-image">
              <img src="${product.colors[0].images[1] || product.colors[0].images[0]}" alt="${product.name}" class="product-image-hover">
            </a>
            <button class="product-quick-add" onclick="quickAddModal('${product.id}')">Quick Shop</button>
          </div>
          <div class="product-info">
            <span class="product-category">${product.category} / ${product.subcategory}</span>
            <h3 class="product-name"><a href="#product/${product.id}">${product.name}</a></h3>
            <div class="product-price-row">
              <span class="price-current">₹${product.price.toLocaleString()}</span>
              ${isSale ? `<span class="price-old">₹${product.originalPrice.toLocaleString()}</span>` : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
}

let activeDetailColor = "";
let activeDetailSize = "";
let selectedDetailQty = 1;

function renderProductDetailsPage(productId) {
  const products = getProductsFromDB();
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    document.getElementById("view-product").innerHTML = `
      <div class="container" style="padding-top: 140px; padding-bottom: 6rem; text-align: center;">
        <h2 class="luxury-heading center">Product Not Found</h2>
        <button class="btn btn-solid" onclick="navigateTo('shop')">Back to Shop</button>
      </div>
    `;
    return;
  }

  // Initialize selected item properties
  activeDetailColor = product.colors[0].name;
  activeDetailSize = product.sizes[0];
  selectedDetailQty = 1;

  // Build specifications list HTML
  const specsHTML = product.specifications.map(spec => `<li>• ${spec}</li>`).join("");

  // Build details container structure
  const pageContainer = document.getElementById("view-product");
  pageContainer.innerHTML = `
    <div class="container">
      <div class="product-detail-layout">
        
        <!-- Gallery Columns -->
        <div class="detail-gallery">
          <div class="gallery-thumbs" id="detail-thumbs-container">
            <!-- Rendered Dynamically -->
          </div>
          <div class="gallery-main" id="detail-main-img-wrapper" onmousemove="zoomProductImage(event)" onmouseleave="resetProductImageZoom()">
            <img src="${product.colors[0].images[0]}" id="detail-main-img" alt="${product.name}">
          </div>
        </div>

        <!-- Info Details Column -->
        <div class="detail-info">
          <div>
            <span class="product-category">${product.category} / ${product.subcategory}</span>
            <h1 class="detail-title">${product.name}</h1>
            
            <div class="detail-rating">
              <div class="stars">
                ${'<i class="ri-star-fill"></i>'.repeat(Math.floor(product.rating))}
                ${product.rating % 1 !== 0 ? '<i class="ri-star-half-line"></i>' : ''}
              </div>
              <span style="font-size: 0.85rem; color: var(--text-secondary);">(${product.reviewsCount} Customer Reviews)</span>
            </div>
          </div>

          <div class="detail-price">
            <span class="text-gold">₹${product.price.toLocaleString()}</span>
            ${product.originalPrice > product.price ? `<span class="price-old" style="font-size: 1.25rem;">₹${product.originalPrice.toLocaleString()}</span>` : ""}
          </div>

          <p class="detail-desc">${product.description}</p>

          <!-- Color swatches selection -->
          <div>
            <div class="input-label" style="margin-bottom: 0.75rem;">Color: <span id="selected-detail-color-label" style="font-weight: 500;">${activeDetailColor}</span></div>
            <div class="color-swatches">
              ${product.colors.map(c => `
                <div class="color-swatch ${c.name === activeDetailColor ? 'active' : ''}" 
                     style="background-color: ${c.value};" 
                     title="${c.name}"
                     onclick="setDetailColor('${product.id}', '${c.name}')"></div>
              `).join("")}
            </div>
          </div>

          <!-- Size Selector selection -->
          <div>
            <div class="input-label" style="margin-bottom: 0.75rem;">Size:</div>
            <div class="size-pills">
              ${product.sizes.map(s => `
                <div class="size-pill ${s === activeDetailSize ? 'active' : ''}" 
                     onclick="setDetailSize(this, '${s}')">${s}</div>
              `).join("")}
            </div>
          </div>

          <!-- Quantity selection and Buttons action -->
          <div style="display: flex; gap: 1.5rem; align-items: center; margin-top: 1rem;">
            <div class="qty-selector">
              <button class="qty-btn" onclick="updateDetailQty(-1)">-</button>
              <input type="text" class="qty-input" id="detail-qty-input" value="1" readonly>
              <button class="qty-btn" onclick="updateDetailQty(1)">+</button>
            </div>
            
            <button class="btn btn-solid" style="flex-grow: 1;" onclick="addToCart('${product.id}', activeDetailColor, activeDetailSize, selectedDetailQty)">Add to Shopping Bag</button>
            
            <button class="header-btn" style="width: 48px; height: 48px; border: 1px solid var(--border-color);" onclick="toggleWishlist('${product.id}')">
              <i class="ri-heart-line" data-wishlist-id="${product.id}"></i>
            </button>
          </div>

          <!-- Accordion spec sheets -->
          <div class="info-accordions">
            <div class="accordion-item active">
              <div class="accordion-header" onclick="toggleAccordion(this)">
                <span>Specifications</span>
                <i class="ri-arrow-down-s-line"></i>
              </div>
              <div class="accordion-content">
                <ul style="display: flex; flex-direction: column; gap: 0.5rem; list-style: none;">
                  ${specsHTML}
                </ul>
              </div>
            </div>
            
            <div class="accordion-item">
              <div class="accordion-header" onclick="toggleAccordion(this)">
                <span>Luxury Shipping & Returns</span>
                <i class="ri-arrow-down-s-line"></i>
              </div>
              <div class="accordion-content">
                <p>Enjoy complimentary express shipping across India on all luxury orders. Delivered in our signature black packaging case. Returns or size exchanges accepted within 14 days of delivery in pristine unworn condition.</p>
              </div>
            </div>

            <div class="accordion-item" id="reviews-accordion-section">
              <!-- Render Reviews dynamically -->
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  // Initialize thumbs gallery
  setDetailGalleryColor(product, activeDetailColor);

  // Sync Wishlist button
  const wishlistBtn = pageContainer.querySelector(`[data-wishlist-id="${product.id}"]`);
  if (wishlistBtn) {
    if (inWishlist(product.id)) {
      wishlistBtn.className = "ri-heart-fill";
      wishlistBtn.parentElement.classList.add("active");
    }
  }

  // Render Reviews tab asynchronously
  renderProductReviews(product);
}

// Hover zoom magnification logic
function zoomProductImage(e) {
  const wrapper = document.getElementById("detail-main-img-wrapper");
  const img = document.getElementById("detail-main-img");
  if (!wrapper || !img) return;

  const rect = wrapper.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const percentX = (x / rect.width) * 100;
  const percentY = (y / rect.height) * 100;

  img.style.transformOrigin = `${percentX}% ${percentY}%`;
  img.style.transform = "scale(1.8)";
}

function resetProductImageZoom() {
  const img = document.getElementById("detail-main-img");
  if (img) {
    img.style.transform = "scale(1)";
    img.style.transformOrigin = "center center";
  }
}

// Swatch helpers
function setDetailColor(productId, colorName) {
  const products = getProductsFromDB();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  activeDetailColor = colorName;
  document.getElementById("selected-detail-color-label").textContent = colorName;

  // Active swatch border highlight
  const swatches = document.querySelectorAll(".color-swatch");
  swatches.forEach(sw => {
    sw.classList.toggle("active", sw.title === colorName);
  });

  // Switch image gallery views
  setDetailGalleryColor(product, colorName);
}

function setDetailGalleryColor(product, colorName) {
  const colorObj = product.colors.find(c => c.name === colorName);
  if (!colorObj || !colorObj.images) return;

  // Set Main Image
  const mainImg = document.getElementById("detail-main-img");
  if (mainImg) mainImg.src = colorObj.images[0];

  // Set Thumbnails
  const thumbsContainer = document.getElementById("detail-thumbs-container");
  if (thumbsContainer) {
    thumbsContainer.innerHTML = colorObj.images.map((imgUrl, i) => `
      <div class="thumb-item ${i === 0 ? 'active' : ''}" onclick="setMainImageFromThumb(this, '${imgUrl}')">
        <img src="${imgUrl}" alt="${product.name} gallery thumbnail">
      </div>
    `).join("");
  }
}

function setMainImageFromThumb(thumbEl, imgUrl) {
  const mainImg = document.getElementById("detail-main-img");
  if (mainImg) mainImg.src = imgUrl;

  document.querySelectorAll(".thumb-item").forEach(item => item.classList.remove("active"));
  thumbEl.classList.add("active");
}

function setDetailSize(pillEl, sizeName) {
  activeDetailSize = sizeName;
  document.querySelectorAll(".size-pill").forEach(p => p.classList.remove("active"));
  pillEl.classList.add("active");
}

function updateDetailQty(delta) {
  selectedDetailQty = Math.max(1, selectedDetailQty + delta);
  document.getElementById("detail-qty-input").value = selectedDetailQty;
}

function toggleAccordion(header) {
  const item = header.parentElement;
  item.classList.toggle("active");
}

// 4. REVIEWS MANAGEMENT (API Interfaced)
async function renderProductReviews(product) {
  const reviewsContainer = document.getElementById("reviews-accordion-section");
  if (!reviewsContainer) return;

  let reviews = [];
  try {
    const res = await fetch(`/api/reviews?prodId=${product.id}`);
    if (res.ok) {
      reviews = await res.json();
    } else {
      throw new Error("Failed to load reviews");
    }
  } catch (err) {
    console.warn("Reviews API failed. Falling back to default list.");
    reviews = [
      { name: "Suresh M.", rating: 5, date: "2026-06-15", text: "Exceptional quality. True to fit. The fabric feels amazing." },
      { name: "Devansh K.", rating: 4, date: "2026-06-10", text: "Elegant and minimal shirt. The gold collar button is a stellar design touch." }
    ];
  }

  reviewsContainer.innerHTML = `
    <div class="accordion-header" onclick="toggleAccordion(this)">
      <span>Reviews (${reviews.length})</span>
      <i class="ri-arrow-down-s-line"></i>
    </div>
    <div class="accordion-content">
      <div style="display: flex; flex-direction: column; gap: 1.5rem;" id="reviews-list-container">
        ${reviews.map(r => `
          <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <span style="font-weight: 600; font-size: 0.95rem;">${r.name}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${r.date}</span>
            </div>
            <div class="stars" style="font-size: 0.8rem; margin-bottom: 0.5rem;">
              ${'<i class="ri-star-fill"></i>'.repeat(r.rating)}
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary);">${r.text}</p>
          </div>
        `).join("")}
      </div>

      <!-- Add Review Form -->
      <form id="add-review-form" style="margin-top: 2rem; display: flex; flex-direction: column; gap: 1rem;" onsubmit="submitReview(event, '${product.id}')">
        <h4 style="text-transform: uppercase; font-size: 0.9rem; letter-spacing: 0.05em;">Write a Review</h4>
        <div class="form-grid" style="margin-bottom: 0;">
          <div class="input-group">
            <label class="input-label">Your Name</label>
            <input type="text" id="review-name" class="input-field" placeholder="Enter name" required>
          </div>
          <div class="input-group">
            <label class="input-label">Rating</label>
            <select id="review-rating" class="input-field" required>
              <option value="5">5 Stars (Excellent)</option>
              <option value="4">4 Stars (Good)</option>
              <option value="3">3 Stars (Average)</option>
              <option value="2">2 Stars (Poor)</option>
              <option value="1">1 Star (Very Poor)</option>
            </select>
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">Review Details</label>
          <textarea id="review-text" class="input-field" style="height: 100px; padding: 0.75rem;" placeholder="Share your experience..." required></textarea>
        </div>
        <button type="submit" class="btn btn-solid" style="align-self: flex-start; padding: 0.75rem 2rem;">Submit Review</button>
      </form>
    </div>
  `;
}

async function submitReview(e, productId) {
  e.preventDefault();
  const name = document.getElementById("review-name").value.trim();
  const rating = parseInt(document.getElementById("review-rating").value);
  const text = document.getElementById("review-text").value.trim();

  if (!name || !text) return;

  const today = new Date().toISOString().split('T')[0];
  const newReview = { name, rating, date: today, text };

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, review: newReview })
    });
    
    if (res.ok) {
      showToast("Thank you for your rating!");
      
      // Update local product reviews counts in PRODUCTS_CACHE directly
      const prod = PRODUCTS_CACHE.find(p => p.id === productId);
      if (prod) {
        prod.reviewsCount += 1;
      }
    } else {
      throw new Error("API post error");
    }
  } catch (err) {
    console.error("Reviews API fail. Saving locally.", err);
    // fallback
    const all = JSON.parse(localStorage.getItem("larre_reviews")) || {};
    if (!all[productId]) all[productId] = [];
    all[productId].push(newReview);
    localStorage.setItem("larre_reviews", JSON.stringify(all));
    showToast("Review saved locally!");
  }

  // Re-render
  renderProductDetailsPage(productId);
}

// 5. CHECKOUT PAGE CONTROLLER
function initCheckoutPage() {
  renderCheckoutSummary();
  
  const form = document.getElementById("checkout-form");
  if (form) {
    // Prevent duplicate triggers
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener("submit", processOrderCheckout);
  }
}

function renderCheckoutSummary() {
  const summaryList = document.getElementById("checkout-items-list");
  if (!summaryList) return;

  const cartItems = getCart();
  if (cartItems.length === 0) {
    summaryList.innerHTML = `<p style="color: var(--text-muted);">No items in cart</p>`;
    return;
  }

  summaryList.innerHTML = cartItems.map(item => `
    <div style="display: flex; gap: 1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
      <img src="${item.image}" alt="${item.name}" style="width: 50px; aspect-ratio: 3/4; object-fit: cover;">
      <div style="flex-grow: 1;">
        <div style="font-size: 0.85rem; font-weight: 500; text-transform: uppercase;">${item.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Size: ${item.size} | Color: ${item.color} x ${item.quantity}</div>
      </div>
      <div style="font-size: 0.85rem; font-weight: 600;">₹${(item.price * item.quantity).toLocaleString()}</div>
    </div>
  `).join("");

  const subtotal = getCartSubtotal();
  const discount = getCartDiscountAmount();
  const total = getCartTotal();

  document.getElementById("chk-subtotal").textContent = `₹${subtotal.toLocaleString()}`;
  if (discount > 0) {
    document.getElementById("chk-discount-row").classList.remove("hidden");
    document.getElementById("chk-discount").textContent = `-₹${discount.toLocaleString()}`;
  } else {
    document.getElementById("chk-discount-row").classList.add("hidden");
  }
  document.getElementById("chk-total").textContent = `₹${total.toLocaleString()}`;
}

async function processOrderCheckout(e) {
  e.preventDefault();
  
  const cartItems = getCart();
  if (cartItems.length === 0) {
    showToast("Your cart is empty", "error");
    return;
  }

  const name = document.getElementById("chk-name").value.trim();
  const email = document.getElementById("chk-email").value.trim();
  const address = document.getElementById("chk-address").value.trim();
  const city = document.getElementById("chk-city").value.trim();
  const state = document.getElementById("chk-state").value.trim();
  const zip = document.getElementById("chk-zip").value.trim();

  if (!name || !email || !address || !city || !state || !zip) {
    showToast("Please fill in shipping details", "error");
    return;
  }

  // Open simulated payment spinner
  openModal("payment-process-modal");

  // Create Order Structure
  const orderIdVal = Math.floor(1000 + Math.random() * 9000);
  const newOrder = {
    orderId: orderIdVal,
    customer: name,
    email: email,
    date: new Date().toISOString().split('T')[0],
    itemsCount: cartItems.reduce((s, i) => s + i.quantity, 0),
    total: getCartTotal(),
    status: "pending",
    items: cartItems
  };

  // Dispatch to Python server
  await submitOrderToServer(newOrder);

  setTimeout(() => {
    // Close payment, open Success modal
    closeModal("payment-process-modal");
    document.getElementById("success-order-id").textContent = `ORD-${orderIdVal}`;
    openModal("order-success-modal");

    // Reset Cart
    clearCart();
    removePromoCode();
  }, 2500); // 2.5 seconds checkout spinner
}

// 6. UI HANDLERS & MODALS
function setupEventListeners() {
  // Theme button toggle
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    const newThemeToggle = themeToggle.cloneNode(true);
    themeToggle.parentNode.replaceChild(newThemeToggle, themeToggle);
    newThemeToggle.addEventListener("click", toggleTheme);
  }

  // Header background tint scroll effect
  window.addEventListener("scroll", () => {
    const header = document.querySelector("header");
    if (header) {
      if (window.scrollY > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }
  });

  // Modal close overlays clicks
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeAllModals();
      }
    });
  });

  // Drawer close clicks
  document.querySelectorAll(".drawer-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeAllDrawers();
      }
    });
  });

  // Search input dropdown quick search
  const searchInput = document.getElementById("search-input-header");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      const resultsContainer = document.getElementById("search-results-overlay");
      
      if (q.length < 2) {
        resultsContainer.classList.add("hidden");
        return;
      }

      const products = getProductsFromDB();
      const matched = products.filter(p => p.name.toLowerCase().includes(q) || p.subcategory.toLowerCase().includes(q)).slice(0, 5);

      if (matched.length === 0) {
        resultsContainer.innerHTML = `<div style="padding: 1rem; font-size: 0.85rem; color: var(--text-muted);">No results matches</div>`;
      } else {
        resultsContainer.innerHTML = matched.map(p => `
          <a href="#product/${p.id}" onclick="closeSearchOverlay(); navigateTo('product/${p.id}')" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
            <img src="${p.colors[0].images[0]}" style="width: 30px; aspect-ratio: 3/4; object-fit: cover;">
            <div>
              <div style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">${p.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-gold);">₹${p.price.toLocaleString()}</div>
            </div>
          </a>
        `).join("");
      }
      resultsContainer.classList.remove("hidden");
    });
  }
}

// Drawer Open/Close functions
function openDrawer(drawerId) {
  closeAllDrawers();
  document.getElementById("drawer-overlay").classList.add("active");
  document.getElementById(drawerId).classList.add("active");
}

function closeAllDrawers() {
  const overlay = document.getElementById("drawer-overlay");
  if (overlay) overlay.classList.remove("active");
  document.querySelectorAll(".drawer").forEach(d => d.classList.remove("active"));
}

// Modal Open/Close functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function closeAllModals() {
  document.querySelectorAll(".modal-backdrop").forEach(mb => mb.classList.remove("active"));
}

// Search Overlay toggle
function toggleSearchOverlay() {
  const searchInput = document.getElementById("search-input-header");
  const row = document.getElementById("search-row-dropdown");
  row.classList.toggle("hidden");
  if (!row.classList.contains("hidden")) {
    searchInput.focus();
  }
}

function closeSearchOverlay() {
  document.getElementById("search-row-dropdown").classList.add("hidden");
  document.getElementById("search-results-overlay").classList.add("hidden");
  document.getElementById("search-input-header").value = "";
}

// Quick Add modal rendering
let quickAddProductId = "";
let selectedQuickSize = "";

function quickAddModal(productId) {
  const products = getProductsFromDB();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  quickAddProductId = productId;
  selectedQuickSize = product.sizes[0];

  const container = document.getElementById("quick-add-modal-content");
  container.innerHTML = `
    <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
      <img src="${product.colors[0].images[0]}" alt="${product.name}" style="width: 180px; aspect-ratio: 3/4; object-fit: cover; border: 1px solid var(--border-color);">
      <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 1rem; min-width: 250px;">
        <div>
          <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted);">${product.category}</span>
          <h3 style="font-size: 1.5rem; text-transform: uppercase; font-family: var(--font-serif);">${product.name}</h3>
        </div>
        <div style="font-weight: 600; font-size: 1.2rem; color: var(--color-gold);">₹${product.price.toLocaleString()}</div>
        
        <!-- Sizes selection -->
        <div>
          <div class="input-label" style="margin-bottom: 0.5rem;">Select Size:</div>
          <div class="size-pills">
            ${product.sizes.map((s, i) => `
              <div class="size-pill ${i === 0 ? 'active' : ''}" onclick="setQuickAddSize(this, '${s}')">${s}</div>
            `).join("")}
          </div>
        </div>

        <button class="btn btn-solid" style="margin-top: 1rem;" onclick="submitQuickAdd()">Add to Shopping Bag</button>
      </div>
    </div>
  `;

  openModal("quick-add-modal");
}

function setQuickAddSize(pillEl, size) {
  selectedQuickSize = size;
  document.querySelectorAll("#quick-add-modal-content .size-pill").forEach(p => p.classList.remove("active"));
  pillEl.classList.add("active");
}

function submitQuickAdd() {
  const products = getProductsFromDB();
  const product = products.find(p => p.id === quickAddProductId);
  if (product) {
    addToCart(quickAddProductId, product.colors[0].name, selectedQuickSize, 1);
    closeModal("quick-add-modal");
  }
}

// User Profile Login / Register Simulation (API Interfaced)
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value.trim();

  if (!email || !pass) return;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass })
    });
    
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("larre_user", JSON.stringify({ email: email, name: data.name }));
      closeModal("auth-modal");
      showToast(`Welcome back, ${data.name}`);
      updateAuthHeaderUI();
    }
  } catch (err) {
    // Offline fallback
    localStorage.setItem("larre_user", JSON.stringify({ email: email, name: email.split("@")[0].toUpperCase() }));
    closeModal("auth-modal");
    showToast(`Welcome back, ${email.split("@")[0].toUpperCase()} (Offline)`);
    updateAuthHeaderUI();
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById("register-email").value.trim();
  const pass = document.getElementById("register-pass").value.trim();

  if (!email || !pass) return;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass })
    });
    if (res.ok) {
      closeModal("auth-modal");
      openModal("otp-modal");
    }
  } catch (err) {
    closeModal("auth-modal");
    openModal("otp-modal");
  }
}

function verifyOTP(e) {
  e.preventDefault();
  const code = document.getElementById("otp-code").value.trim();
  if (code.length === 6) {
    localStorage.setItem("larre_user", JSON.stringify({ email: "newuser@example.com", name: "LUXURY GUEST" }));
    closeModal("otp-modal");
    showToast("Email verification successful!");
    updateAuthHeaderUI();
  } else {
    showToast("Invalid verification code (must be 6 digits)", "error");
  }
}

function logoutUser() {
  localStorage.removeItem("larre_user");
  showToast("Logged out successfully");
  updateAuthHeaderUI();
  navigateTo("home");
}

function updateAuthHeaderUI() {
  const user = JSON.parse(localStorage.getItem("larre_user"));
  const headerBtn = document.getElementById("auth-header-btn");
  if (headerBtn) {
    if (user) {
      headerBtn.innerHTML = `<i class="ri-user-shared-line"></i>`;
      headerBtn.title = `Profile (${user.name}) - Click to Logout`;
      headerBtn.setAttribute("onclick", "logoutUser()");
    } else {
      headerBtn.innerHTML = `<i class="ri-user-line"></i>`;
      headerBtn.title = "Login / Register";
      headerBtn.setAttribute("onclick", "openModal('auth-modal')");
    }
  }
}

// Newsletter sign up simulation
function subscribeNewsletter(e) {
  e.preventDefault();
  const input = e.target.querySelector("input");
  if (input && input.value) {
    showToast("Subscribed! Welcoming discount code sent to email.");
    input.value = "";
  }
}

// Quick auth tab trigger
function toggleAuthTabs(tab) {
  if (tab === 'login') {
    document.getElementById("login-tab-form").classList.remove("hidden");
    document.getElementById("register-tab-form").classList.add("hidden");
    document.getElementById("tab-btn-login").style.borderBottom = "2px solid var(--color-gold)";
    document.getElementById("tab-btn-register").style.borderBottom = "none";
  } else {
    document.getElementById("register-tab-form").classList.remove("hidden");
    document.getElementById("login-tab-form").classList.add("hidden");
    document.getElementById("tab-btn-register").style.borderBottom = "2px solid var(--color-gold)";
    document.getElementById("tab-btn-login").style.borderBottom = "none";
  }
}
