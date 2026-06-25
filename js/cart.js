// Cart and Wishlist Management Controller

let cart = JSON.parse(localStorage.getItem("larre_cart")) || [];
let wishlist = JSON.parse(localStorage.getItem("larre_wishlist")) || [];
let activeDiscount = JSON.parse(localStorage.getItem("larre_discount")) || 0; // percentage, e.g. 10

// Cart Operations
function getCart() {
  return cart;
}

function saveCart() {
  localStorage.setItem("larre_cart", JSON.stringify(cart));
  updateCartUI();
}

function addToCart(productId, colorName, size, quantity = 1) {
  const products = getProductsFromDB();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  // Find color details
  const colorObj = product.colors.find(c => c.name === colorName) || product.colors[0];
  const itemImage = colorObj.images ? colorObj.images[0] : "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=800";

  // Check if item with exact same color and size is already in cart
  const existingIndex = cart.findIndex(item => item.id === productId && item.color === colorObj.name && item.size === size);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      id: productId,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      color: colorObj.name,
      colorHex: colorObj.value,
      size: size,
      image: itemImage,
      quantity: quantity
    });
  }

  saveCart();
  showToast(`${product.name} added to cart`);
}

function updateCartQty(productId, colorName, size, newQty) {
  const itemIndex = cart.findIndex(item => item.id === productId && item.color === colorName && item.size === size);
  if (itemIndex > -1) {
    if (newQty <= 0) {
      cart.splice(itemIndex, 1);
    } else {
      cart[itemIndex].quantity = parseInt(newQty);
    }
    saveCart();
  }
}

function removeFromCart(productId, colorName, size) {
  cart = cart.filter(item => !(item.id === productId && item.color === colorName && item.size === size));
  saveCart();
}

function clearCart() {
  cart = [];
  saveCart();
}

function applyPromoCode(code) {
  if (code.toUpperCase() === "LUXURY10") {
    activeDiscount = 10;
    localStorage.setItem("larre_discount", JSON.stringify(activeDiscount));
    updateCartUI();
    showToast("Promo Code applied: 10% Discount!");
    return true;
  } else {
    showToast("Invalid Promo Code", "error");
    return false;
  }
}

function removePromoCode() {
  activeDiscount = 0;
  localStorage.setItem("larre_discount", JSON.stringify(activeDiscount));
  updateCartUI();
}

function getCartSubtotal() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function getCartDiscountAmount() {
  return Math.round((getCartSubtotal() * activeDiscount) / 100);
}

function getCartTotal() {
  return getCartSubtotal() - getCartDiscountAmount();
}

// Wishlist Operations
function getWishlist() {
  return wishlist;
}

function saveWishlist() {
  localStorage.setItem("larre_wishlist", JSON.stringify(wishlist));
  updateWishlistUI();
}

function toggleWishlist(productId) {
  const index = wishlist.indexOf(productId);
  const products = getProductsFromDB();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (index > -1) {
    wishlist.splice(index, 1);
    showToast(`${product.name} removed from Wishlist`);
  } else {
    wishlist.push(productId);
    showToast(`${product.name} added to Wishlist`);
  }
  saveWishlist();
  
  // Update details or listing pages to show filled hearts
  const heartBtns = document.querySelectorAll(`[data-wishlist-id="${productId}"]`);
  heartBtns.forEach(btn => {
    if (wishlist.includes(productId)) {
      btn.classList.add("active");
      btn.innerHTML = `<i class="ri-heart-fill"></i>`;
    } else {
      btn.classList.remove("active");
      btn.innerHTML = `<i class="ri-heart-line"></i>`;
    }
  });
}

function inWishlist(productId) {
  return wishlist.includes(productId);
}

// UI Synchronizations
function updateCartUI() {
  // Update header badges
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const badges = document.querySelectorAll(".cart-count-badge");
  badges.forEach(badge => {
    badge.textContent = totalItems;
    if (totalItems === 0) {
      badge.classList.add("hidden");
    } else {
      badge.classList.remove("hidden");
    }
  });

  // Render Cart Drawer Content
  renderCartDrawer();
  
  // Render Checkout Order Summary if checkout is visible
  if (typeof renderCheckoutSummary === "function") {
    renderCheckoutSummary();
  }
}

function updateWishlistUI() {
  const badge = document.querySelector(".wishlist-count-badge");
  if (badge) {
    badge.textContent = wishlist.length;
    if (wishlist.length === 0) {
      badge.classList.add("hidden");
    } else {
      badge.classList.remove("hidden");
    }
  }

  // Render Wishlist Drawer
  renderWishlistDrawer();
}

function renderCartDrawer() {
  const cartList = document.getElementById("cart-drawer-list");
  if (!cartList) return;

  if (cart.length === 0) {
    cartList.innerHTML = `
      <div style="text-align: center; padding: 3rem 0; color: var(--text-muted);">
        <i class="ri-shopping-bag-line" style="font-size: 3rem; color: var(--color-gold);"></i>
        <p style="margin-top: 1rem; font-family: var(--font-serif); font-size: 1.1rem; text-transform: uppercase;">Your cart is empty</p>
        <button class="btn btn-outline" style="margin-top: 1.5rem;" onclick="closeAllDrawers(); navigateTo('shop');">Explore Collections</button>
      </div>
    `;
    document.getElementById("cart-subtotal-val").textContent = "₹0";
    document.getElementById("cart-discount-row").classList.add("hidden");
    document.getElementById("cart-total-val").textContent = "₹0";
    document.getElementById("checkout-drawer-btn").disabled = true;
    document.getElementById("checkout-drawer-btn").style.opacity = "0.5";
    return;
  }

  document.getElementById("checkout-drawer-btn").disabled = false;
  document.getElementById("checkout-drawer-btn").style.opacity = "1";

  cartList.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.name}</h4>
        <div class="cart-item-meta">Color: ${item.color} | Size: ${item.size}</div>
        <div class="cart-item-price">₹${item.price.toLocaleString()}</div>
        <div class="cart-item-actions">
          <div class="qty-selector" style="height: 32px;">
            <button class="qty-btn" style="width: 32px;" onclick="updateCartQty('${item.id}', '${item.color}', '${item.size}', ${item.quantity - 1})">-</button>
            <input type="text" class="qty-input" style="width: 32px;" value="${item.quantity}" readonly>
            <button class="qty-btn" style="width: 32px;" onclick="updateCartQty('${item.id}', '${item.color}', '${item.size}', ${item.quantity + 1})">+</button>
          </div>
          <span class="cart-item-remove" onclick="removeFromCart('${item.id}', '${item.color}', '${item.size}')">Remove</span>
        </div>
      </div>
    </div>
  `).join("");

  const subtotal = getCartSubtotal();
  const discount = getCartDiscountAmount();
  const total = getCartTotal();

  document.getElementById("cart-subtotal-val").textContent = `₹${subtotal.toLocaleString()}`;
  if (activeDiscount > 0) {
    document.getElementById("cart-discount-row").classList.remove("hidden");
    document.getElementById("cart-discount-val").textContent = `-₹${discount.toLocaleString()}`;
  } else {
    document.getElementById("cart-discount-row").classList.add("hidden");
  }
  document.getElementById("cart-total-val").textContent = `₹${total.toLocaleString()}`;
}

function renderWishlistDrawer() {
  const wishList = document.getElementById("wishlist-drawer-list");
  if (!wishList) return;

  if (wishlist.length === 0) {
    wishList.innerHTML = `
      <div style="text-align: center; padding: 3rem 0; color: var(--text-muted);">
        <i class="ri-heart-line" style="font-size: 3rem; color: var(--color-gold);"></i>
        <p style="margin-top: 1rem; font-family: var(--font-serif); font-size: 1.1rem; text-transform: uppercase;">Your Wishlist is empty</p>
      </div>
    `;
    return;
  }

  const products = getProductsFromDB();
  const wishlistItems = products.filter(p => wishlist.includes(p.id));

  wishList.innerHTML = wishlistItems.map(item => {
    const defaultColor = item.colors[0];
    const image = defaultColor.images ? defaultColor.images[0] : "";
    return `
      <div class="cart-item">
        <img src="${image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-details">
          <h4 class="cart-item-name">${item.name}</h4>
          <div class="cart-item-price">₹${item.price.toLocaleString()}</div>
          <div style="display: flex; gap: 1rem; align-items: center; margin-top: 1rem;">
            <button class="btn btn-solid" style="padding: 0.5rem 1rem; font-size: 0.7rem; letter-spacing: 0.1em;" onclick="closeAllDrawers(); navigateTo('product/${item.id}')">View Product</button>
            <span class="cart-item-remove" onclick="toggleWishlist('${item.id}')">Remove</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Toast Notifications Helper
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = "position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.75rem;";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.style.cssText = `
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border-left: 4px solid ${type === "success" ? "var(--color-gold)" : "#E02424"};
    padding: 1rem 1.75rem;
    box-shadow: var(--shadow-md);
    font-size: 0.85rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transform: translateX(120%);
    transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
    display: flex;
    align-items: center;
    gap: 0.75rem;
  `;
  
  const icon = type === "success" ? '<i class="ri-checkbox-circle-line" style="color: var(--color-gold); font-size: 1.1rem;"></i>' : '<i class="ri-error-warning-line" style="color: #E02424; font-size: 1.1rem;"></i>';
  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  // Trigger Slide-in
  setTimeout(() => {
    toast.style.transform = "translateX(0)";
  }, 50);

  // Auto Dismiss after 3s
  setTimeout(() => {
    toast.style.transform = "translateX(120%)";
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3000);
}
