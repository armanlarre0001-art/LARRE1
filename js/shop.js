// Shop Listing and Filter Controller

let selectedCategories = [];
let selectedSizes = [];
let selectedColors = [];
let maxPrice = 25000;
let searchQuery = "";
let currentSort = "featured";
let currentGridCols = 4; // 2 or 4 columns layout

function initShopPage() {
  // Initialize Price Slider
  const priceSlider = document.getElementById("price-range-slider");
  const priceLabel = document.getElementById("price-slider-value");
  if (priceSlider && priceLabel) {
    priceSlider.value = maxPrice;
    priceLabel.textContent = `₹${parseInt(maxPrice).toLocaleString()}`;

    priceSlider.addEventListener("input", (e) => {
      maxPrice = parseInt(e.target.value);
      priceLabel.textContent = `₹${maxPrice.toLocaleString()}`;
      filterAndRenderProducts();
    });
  }

  // Bind category checkbox listeners
  const catCheckboxes = document.querySelectorAll(".category-filter-input");
  catCheckboxes.forEach(cb => {
    cb.checked = selectedCategories.includes(cb.value);
    cb.addEventListener("change", (e) => {
      if (e.target.checked) {
        selectedCategories.push(e.target.value);
      } else {
        selectedCategories = selectedCategories.filter(c => c !== e.target.value);
      }
      filterAndRenderProducts();
    });
  });

  // Bind size pill listeners
  const sizePills = document.querySelectorAll(".size-filter-pill");
  sizePills.forEach(pill => {
    pill.classList.toggle("active", selectedSizes.includes(pill.dataset.size));
    pill.addEventListener("click", () => {
      const val = pill.dataset.size;
      if (selectedSizes.includes(val)) {
        selectedSizes = selectedSizes.filter(s => s !== val);
        pill.classList.remove("active");
      } else {
        selectedSizes.push(val);
        pill.classList.add("active");
      }
      filterAndRenderProducts();
    });
  });

  // Bind color swatch listeners
  const colorSwatches = document.querySelectorAll(".color-filter-swatch");
  colorSwatches.forEach(swatch => {
    swatch.classList.toggle("active", selectedColors.includes(swatch.dataset.color));
    swatch.addEventListener("click", () => {
      const val = swatch.dataset.color;
      if (selectedColors.includes(val)) {
        selectedColors = selectedColors.filter(c => c !== val);
        swatch.classList.remove("active");
      } else {
        selectedColors.push(val);
        swatch.classList.add("active");
      }
      filterAndRenderProducts();
    });
  });

  // Bind sort listener
  const sortSelect = document.getElementById("shop-sort-select");
  if (sortSelect) {
    sortSelect.value = currentSort;
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      filterAndRenderProducts();
    });
  }

  // Bind search inputs
  const mainSearch = document.getElementById("search-input-main");
  if (mainSearch) {
    mainSearch.value = searchQuery;
    mainSearch.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      filterAndRenderProducts();
    });
  }

  // Bind layout grid toggles
  const grid2Btn = document.getElementById("grid-mode-2");
  const grid4Btn = document.getElementById("grid-mode-4");
  if (grid2Btn && grid4Btn) {
    grid2Btn.addEventListener("click", () => {
      currentGridCols = 2;
      grid2Btn.classList.add("active");
      grid4Btn.classList.remove("active");
      renderProductsGrid();
    });
    grid4Btn.addEventListener("click", () => {
      currentGridCols = 4;
      grid4Btn.classList.add("active");
      grid2Btn.classList.remove("active");
      renderProductsGrid();
    });
  }

  // Initial Filter & Render
  filterAndRenderProducts();
}

// Global Category Filter Trigger (from navbar search or mega menu clicks)
function applyNavbarCategoryFilter(category) {
  selectedCategories = [category];
  const catCheckboxes = document.querySelectorAll(".category-filter-input");
  catCheckboxes.forEach(cb => {
    cb.checked = (cb.value === category);
  });
  filterAndRenderProducts();
}

let filteredProducts = [];

function filterAndRenderProducts() {
  const products = getProductsFromDB();

  filteredProducts = products.filter(product => {
    // 1. Category Filter (e.g. Men, Women, Accessories)
    if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
      return false;
    }

    // 2. Size Filter
    if (selectedSizes.length > 0) {
      const match = product.sizes.some(size => selectedSizes.includes(size));
      if (!match) return false;
    }

    // 3. Color Filter
    if (selectedColors.length > 0) {
      const productColors = product.colors.map(c => c.name.toLowerCase());
      const match = selectedColors.some(color => productColors.includes(color.toLowerCase()));
      if (!match) return false;
    }

    // 4. Max Price Filter
    if (product.price > maxPrice) {
      return false;
    }

    // 5. Search Text Filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchName = product.name.toLowerCase().includes(query);
      const matchDesc = product.description.toLowerCase().includes(query);
      const matchCat = product.category.toLowerCase().includes(query);
      const matchSub = product.subcategory.toLowerCase().includes(query);
      if (!matchName && !matchDesc && !matchCat && !matchSub) return false;
    }

    return true;
  });

  // Sort Results
  sortFilteredProducts();

  // Update counts
  const resultsCounter = document.getElementById("results-count-value");
  if (resultsCounter) {
    resultsCounter.textContent = `${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'}`;
  }

  // Render Grid
  renderProductsGrid();
}

function sortFilteredProducts() {
  if (currentSort === "price-low") {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (currentSort === "price-high") {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else if (currentSort === "rating") {
    filteredProducts.sort((a, b) => b.rating - a.rating);
  } else if (currentSort === "newest") {
    // Sort by newArrival first
    filteredProducts.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
  } else {
    // Featured / default sorting: featured items first
    filteredProducts.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }
}

function renderProductsGrid() {
  const gridContainer = document.getElementById("shop-products-grid");
  if (!gridContainer) return;

  if (filteredProducts.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: span 4; text-align: center; padding: 5rem 0; color: var(--text-muted);">
        <i class="ri-search-line" style="font-size: 3rem; color: var(--color-gold);"></i>
        <p style="margin-top: 1.5rem; font-family: var(--font-serif); font-size: 1.25rem; text-transform: uppercase;">No products found</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Try adjusting your filters or search terms.</p>
        <button class="btn btn-outline" style="margin-top: 2rem;" onclick="clearAllFilters()">Reset Filters</button>
      </div>
    `;
    return;
  }

  // Handle columns view classes
  gridContainer.className = "products-grid";
  if (currentGridCols === 2) {
    gridContainer.classList.add("grid-cols-2");
  }

  gridContainer.innerHTML = filteredProducts.map(product => {
    const isWish = inWishlist(product.id);
    const defaultColorObj = product.colors[0];
    const secondaryImage = defaultColorObj.images && defaultColorObj.images[1] ? defaultColorObj.images[1] : defaultColorObj.images[0];
    const originalPrice = product.originalPrice > product.price ? `₹${product.originalPrice.toLocaleString()}` : "";
    const isSale = product.originalPrice > product.price;

    return `
      <div class="product-card animate-fade-in-up">
        <div class="product-image-wrapper">
          ${isSale ? '<div class="product-badge badge-sale">Sale</div>' : (product.newArrival ? '<div class="product-badge">New</div>' : '')}
          <button class="product-wishlist-btn ${isWish ? 'active' : ''}" data-wishlist-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist('${product.id}')">
            <i class="${isWish ? 'ri-heart-fill' : 'ri-heart-line'}"></i>
          </button>
          
          <a href="#product/${product.id}" onclick="navigateTo('product/${product.id}')">
            <img src="${defaultColorObj.images[0]}" alt="${product.name}" class="product-image">
            <img src="${secondaryImage}" alt="${product.name} alternate view" class="product-image-hover">
          </a>
          
          <button class="product-quick-add" onclick="quickAddModal('${product.id}')">Quick Shop</button>
        </div>
        <div class="product-info">
          <span class="product-category">${product.category} / ${product.subcategory}</span>
          <h3 class="product-name">
            <a href="#product/${product.id}" onclick="navigateTo('product/${product.id}')">${product.name}</a>
          </h3>
          <div class="product-price-row">
            <span class="price-current">₹${product.price.toLocaleString()}</span>
            ${originalPrice ? `<span class="price-old">${originalPrice}</span>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function clearAllFilters() {
  selectedCategories = [];
  selectedSizes = [];
  selectedColors = [];
  maxPrice = 25000;
  searchQuery = "";
  
  // Uncheck inputs
  document.querySelectorAll(".category-filter-input").forEach(cb => cb.checked = false);
  document.querySelectorAll(".size-filter-pill").forEach(pill => pill.classList.remove("active"));
  document.querySelectorAll(".color-filter-swatch").forEach(swatch => swatch.classList.remove("active"));
  
  const mainSearch = document.getElementById("search-input-main");
  if (mainSearch) mainSearch.value = "";

  const priceSlider = document.getElementById("price-range-slider");
  const priceLabel = document.getElementById("price-slider-value");
  if (priceSlider) priceSlider.value = 25000;
  if (priceLabel) priceLabel.textContent = `₹25,000`;

  filterAndRenderProducts();
  showToast("Filters Reset Successful");
}
