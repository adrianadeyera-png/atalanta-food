// Atalanta Produce Sales Application & Video Engine
const state = {
  products: [],
  settings: {
    farmName: 'Atalanta',
    companyType: 'Agricultural Sales & Produce Distribution',
    tagline: 'Direct-From-Source Produce Sales & Commercial Wholesale Supply',
    whatsappNumber: '2348012345678',
    currency: '₦',
    contactPhone: '+234 801 234 5678',
    contactEmail: 'sales@atalanta.ng',
    address: 'Atalanta Commercial Distribution Hub',
    city: 'Lagos, Nigeria',
    deliveryFee: 2500,
    freeDeliveryThreshold: 50000,
    pickupLocation: 'Atalanta Central Distribution Depot, Depot Bay 4',
    announcement: '🌱 Bulk Produce Supply Active: Supplying Restaurants, Retailers & Homes with Fresh Farm Harvest!'
  },
  cart: [],
  currentCategory: 'all',
  searchQuery: '',
  onlyInStock: false,
  sortBy: 'featured',
  activeModalProduct: null,
  isCartOpen: false,
  isCheckoutOpen: false,
  deliveryMethod: 'delivery',
  // Hero Video State
  currentHeroVideo: 1,
  isHeroVideoMuted: true
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  loadCartFromStorage();
  await fetchSettings();
  await fetchProducts();
  setupEventListeners();
  initHeroVideoEngine();
  setupWholesaleForm();
  renderApp();
});

function renderApp() {
  renderProducts();
  updateCategoryCounts();
  updateCartBadge();
  renderCartDrawer();
}

// ----------------------------------------------------
// HERO BACKGROUND VIDEO ENGINE
// ----------------------------------------------------
function initHeroVideoEngine() {
  const vid1 = document.getElementById('hero-bg-video-1');
  const vid2 = document.getElementById('hero-bg-video-2');
  if (!vid1 || !vid2) return;

  // Set initial state
  vid1.style.opacity = '1';
  vid2.style.opacity = '0';
  vid1.muted = true;
  vid2.muted = true;

  // Auto transition when video 1 ends
  vid1.addEventListener('ended', () => {
    switchHeroVideo(2);
  });

  // Auto transition when video 2 ends
  vid2.addEventListener('ended', () => {
    switchHeroVideo(1);
  });

  // Start playing vid1
  vid1.play().catch(e => console.log('Autoplay deferred:', e));
}

function switchHeroVideo(index) {
  const vid1 = document.getElementById('hero-bg-video-1');
  const vid2 = document.getElementById('hero-bg-video-2');
  if (!vid1 || !vid2) return;

  state.currentHeroVideo = index;
  vid1.muted = true;
  vid2.muted = true;

  if (index === 1) {
    vid1.currentTime = 0;
    vid1.play().catch(() => {});
    vid1.style.opacity = '1';
    vid2.style.opacity = '0';
  } else {
    vid2.currentTime = 0;
    vid2.play().catch(() => {});
    vid2.style.opacity = '1';
    vid1.style.opacity = '0';
  }
}

// (audio toggle removed - all videos permanently muted)

// ----------------------------------------------------
// LOCAL STORAGE & DATA LOADING
// ----------------------------------------------------
function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('atalanta_cart');
    if (saved) {
      state.cart = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse cart:', e);
    state.cart = [];
  }
}

function saveCartToStorage() {
  localStorage.setItem('atalanta_cart', JSON.stringify(state.cart));
  updateCartBadge();
  renderCartDrawer();
  renderProducts();
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      state.settings = { ...state.settings, ...data };
      updateSettingsInDOM();
    }
  } catch (err) {
    console.warn('Could not load remote settings, using defaults.', err);
  }
}

async function fetchProducts() {
  const container = document.getElementById('products-grid');
  if (container) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent"></div>
        <p class="mt-4 text-emerald-800 font-medium">Fetching today's catalogue from Atalanta...</p>
      </div>
    `;
  }

  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      state.products = await res.json();
    } else {
      throw new Error(`Product API returned ${res.status}`);
    }
  } catch (err) {
    try {
      const localRes = await fetch('/data/products.json');
      if (!localRes.ok) throw new Error(`Local product data returned ${localRes.status}`);
      state.products = (await localRes.json()).map(product => ({
        ...product,
        image: product.image?.replace(/^\/images\//, '/public/images/')
      }));
    } catch (localErr) {
      console.error('Could not load products from the API or local data:', localErr);
    }
  } finally {
    renderProducts();
    updateCategoryCounts();
  }
}

function updateSettingsInDOM() {
  document.querySelectorAll('.farm-name-text').forEach(el => el.textContent = state.settings.farmName);
  document.querySelectorAll('.farm-tagline-text').forEach(el => el.textContent = state.settings.tagline);
  document.querySelectorAll('.farm-address-text').forEach(el => el.textContent = state.settings.address);
  document.querySelectorAll('.farm-phone-text').forEach(el => el.textContent = state.settings.contactPhone);
  document.querySelectorAll('.farm-email-text').forEach(el => el.textContent = state.settings.contactEmail);
  
  const announcementEl = document.getElementById('announcement-banner');
  if (announcementEl && state.settings.announcement) {
    announcementEl.textContent = state.settings.announcement;
    announcementEl.parentElement.classList.remove('hidden');
  }

  const directWaLinks = document.querySelectorAll('.direct-whatsapp-link');
  directWaLinks.forEach(link => {
    const cleanNum = state.settings.whatsappNumber.replace(/[^0-9]/g, '');
    link.href = `https://wa.me/${cleanNum}?text=${encodeURIComponent("Hello Atalanta! I would like to inquire about your produce sales and wholesale supply.")}`;
  });
}

function formatMoney(amount) {
  const num = Number(amount) || 0;
  return `${state.settings.currency}${num.toLocaleString('en-NG')}`;
}

// ----------------------------------------------------
// CATALOGUE FILTERING & RENDERING
// ----------------------------------------------------
function getFilteredProducts() {
  let list = [...state.products];

  if (state.currentCategory !== 'all') {
    list = list.filter(p => p.category && p.category.toLowerCase() === state.currentCategory.toLowerCase());
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }

  // Admin-controlled storefront visibility: hide sold out items if configured by manager
  if (state.settings && state.settings.hideOutOfStock) {
    list = list.filter(p => p.stockStatus !== 'out_of_stock');
  }

  if (state.onlyInStock) {
    list = list.filter(p => p.stockStatus === 'in_stock');
  }

  if (state.sortBy === 'price-low') {
    list.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-high') {
    list.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  return list;
}

function renderProducts() {
  const container = document.getElementById('products-grid');
  if (!container) return;

  const products = getFilteredProducts();

  if (products.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center bg-[#121614] rounded-3xl border border-dashed border-emerald-800/60 p-8">
        <div class="w-16 h-16 mx-auto bg-emerald-950 text-emerald-400 rounded-full flex items-center justify-center text-3xl mb-4">
          🌾
        </div>
        <h3 class="text-xl font-bold text-white mb-2">No Produce Found</h3>
        <p class="text-slate-400 max-w-md mx-auto mb-6">
          We couldn't find any produce matching your current search or category filter. Try clearing your filters or contact our wholesale desk directly.
        </p>
        <button onclick="resetFilters()" class="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl transition shadow-sm cursor-pointer">
          Reset Filters
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => {
    const inCartItem = state.cart.find(item => item.id === product.id);
    const cartQty = inCartItem ? inCartItem.quantity : 0;
    const isOutOfStock = product.stockStatus === 'out_of_stock';
    const isLowStock = product.stockStatus === 'low_stock';

    let stockBadge = '';
    if (isOutOfStock) {
      stockBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Sold Out</span>`;
    } else if (isLowStock) {
      stockBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Low Stock</span>`;
    } else {
      stockBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-600"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> In Stock</span>`;
    }

    const customBadge = product.badge ? `
      <span class="absolute top-3 left-3 px-3 py-1 text-xs font-black rounded-full shadow-md bg-emerald-500 text-black">
        ${product.badge}
      </span>
    ` : '';

    return `
      <div class="produce-card bg-[#121614] rounded-3xl overflow-hidden border border-[#1e2a22] hover:border-emerald-500 shadow-md flex flex-col justify-between group transition duration-300">
        <div>
          <!-- Image Container -->
          <div class="relative h-56 w-full overflow-hidden bg-black cursor-pointer" onclick="openProductModal('${product.id}')">
            <img 
              src="${product.image}" 
              alt="${product.name}" 
              loading="lazy" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onerror="this.src='https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <span class="text-xs text-black bg-emerald-400 px-3 py-1.5 rounded-full font-black flex items-center gap-1">
                🔍 View Produce Specifications
              </span>
            </div>
            ${customBadge}
            <div class="absolute top-3 right-3">
              ${stockBadge}
            </div>
          </div>

          <!-- Product Details -->
          <div class="p-5">
            <div class="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <span>${getCategoryIcon(product.category)} ${product.category}</span>
              <span class="text-slate-400 font-normal lowercase">${product.harvestSeason || 'Direct Sourced'}</span>
            </div>

            <h3 class="text-lg font-bold text-white group-hover:text-emerald-400 transition line-clamp-1 cursor-pointer" onclick="openProductModal('${product.id}')">
              ${product.name}
            </h3>

            <p class="mt-2 text-sm text-slate-300 line-clamp-2 leading-relaxed">
              ${product.description || 'Farm-fresh produce sourced for retail households & bulk commercial catering.'}
            </p>

            <div class="mt-4 pt-3 border-t border-emerald-950/80 flex items-baseline justify-between">
              <div>
                <span class="text-2xl font-black text-emerald-400">${formatMoney(product.price)}</span>
                <span class="block text-xs font-medium text-slate-400">${product.unit || 'per unit'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action / Cart Stepper -->
        <div class="p-5 pt-0">
          ${isOutOfStock ? `
            <button disabled class="w-full py-3 bg-slate-900 text-slate-600 rounded-2xl font-semibold cursor-not-allowed text-sm">
              Currently Unavailable
            </button>
          ` : cartQty > 0 ? `
            <div class="flex items-center justify-between bg-black border border-emerald-500 rounded-2xl p-1.5">
              <button onclick="decrementCart('${product.id}')" class="w-10 h-10 rounded-xl bg-slate-900 hover:bg-emerald-900 text-emerald-400 font-bold flex items-center justify-center transition active:scale-95 text-lg cursor-pointer">
                –
              </button>
              <div class="text-center px-2">
                <span class="text-base font-black text-white">${cartQty} in basket</span>
                <span class="block text-xs text-emerald-400 font-bold">${formatMoney(product.price * cartQty)}</span>
              </div>
              <button onclick="incrementCart('${product.id}')" class="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black flex items-center justify-center transition active:scale-95 text-lg cursor-pointer">
                +
              </button>
            </div>
          ` : `
            <button onclick="addToCart('${product.id}')" class="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition group/btn cursor-pointer">
              <svg class="w-5 h-5 text-black group-hover/btn:translate-y-[-1px] transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              <span>Add to Basket</span>
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function getCategoryIcon(cat) {
  switch ((cat || '').toLowerCase()) {
    case 'peppers': return '🌶️';
    case 'vegetables': return '🥬';
    case 'tubers': return '🍠';
    case 'grains': return '🌽';
    case 'fruits': return '🥑';
    default: return '🌱';
  }
}

function updateCategoryCounts() {
  const counts = { all: state.products.length, peppers: 0, vegetables: 0, tubers: 0, grains: 0, fruits: 0 };
  state.products.forEach(p => {
    const c = (p.category || '').toLowerCase();
    if (counts[c] !== undefined) counts[c]++;
  });

  Object.keys(counts).forEach(cat => {
    const el = document.getElementById(`count-${cat}`);
    if (el) el.textContent = counts[cat];
  });
}

// ----------------------------------------------------
// CART & RETAIL WHATSAPP CHECKOUT
// ----------------------------------------------------
function addToCart(productId, qty = 1) {
  const product = state.products.find(p => p.id === productId);
  if (!product || product.stockStatus === 'out_of_stock') return;

  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      image: product.image,
      category: product.category,
      quantity: qty
    });
  }

  triggerCartAnimation();
  saveCartToStorage();
}

function incrementCart(productId) {
  const item = state.cart.find(i => i.id === productId);
  if (item) {
    item.quantity++;
    saveCartToStorage();
  }
}

function decrementCart(productId) {
  const itemIndex = state.cart.findIndex(i => i.id === productId);
  if (itemIndex > -1) {
    if (state.cart[itemIndex].quantity > 1) {
      state.cart[itemIndex].quantity--;
    } else {
      state.cart.splice(itemIndex, 1);
    }
    saveCartToStorage();
  }
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  saveCartToStorage();
}

function clearCart() {
  if (confirm('Are you sure you want to empty your harvest basket?')) {
    state.cart = [];
    saveCartToStorage();
  }
}

function triggerCartAnimation() {
  const cartBtn = document.getElementById('cart-floating-btn');
  const cartNavBtn = document.getElementById('nav-cart-btn');
  [cartBtn, cartNavBtn].forEach(btn => {
    if (btn) {
      btn.classList.add('cart-bump');
      setTimeout(() => btn.classList.remove('cart-bump'), 400);
    }
  });
}

function updateCartBadge() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badges = document.querySelectorAll('.cart-count-badge');
  badges.forEach(badge => {
    badge.textContent = totalCount;
    if (totalCount > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  });
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-list');
  const emptyState = document.getElementById('cart-empty-state');
  const footer = document.getElementById('cart-footer');
  if (!container) return;

  if (state.cart.length === 0) {
    container.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    if (footer) footer.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  if (footer) footer.classList.remove('hidden');

  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryCost = state.deliveryMethod === 'delivery' 
    ? (subtotal >= state.settings.freeDeliveryThreshold ? 0 : state.settings.deliveryFee) 
    : 0;
  const grandTotal = subtotal + deliveryCost;

  container.innerHTML = state.cart.map(item => `
    <div class="flex items-center gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-2xl object-cover bg-slate-100 flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'"/>
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-slate-800 text-sm truncate">${item.name}</h4>
        <p class="text-xs text-slate-500">${formatMoney(item.price)} ${item.unit ? `(${item.unit})` : ''}</p>
        <div class="flex items-center gap-2 mt-2">
          <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <button onclick="decrementCart('${item.id}')" class="px-2 py-0.5 text-slate-600 hover:bg-slate-200 font-bold transition text-xs cursor-pointer">–</button>
            <span class="px-3 py-0.5 text-xs font-bold text-slate-900 bg-white">${item.quantity}</span>
            <button onclick="incrementCart('${item.id}')" class="px-2 py-0.5 text-slate-600 hover:bg-slate-200 font-bold transition text-xs cursor-pointer">+</button>
          </div>
          <button onclick="removeFromCart('${item.id}')" class="text-xs text-rose-500 hover:text-rose-700 transition cursor-pointer">Remove</button>
        </div>
      </div>
      <div class="text-right">
        <span class="font-bold text-emerald-900 text-sm block">${formatMoney(item.price * item.quantity)}</span>
      </div>
    </div>
  `).join('');

  const subtotalEl = document.getElementById('cart-subtotal-val');
  const deliveryEl = document.getElementById('cart-delivery-val');
  const totalEl = document.getElementById('cart-total-val');
  
  if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
  if (deliveryEl) {
    if (state.deliveryMethod === 'pickup') {
      deliveryEl.textContent = 'FREE (Depot Pickup)';
    } else if (subtotal >= state.settings.freeDeliveryThreshold) {
      deliveryEl.innerHTML = `<span class="text-emerald-600 font-bold">FREE (Bulk Supply Offer)</span>`;
    } else {
      deliveryEl.textContent = formatMoney(deliveryCost);
    }
  }
  if (totalEl) totalEl.textContent = formatMoney(grandTotal);

  const progressBar = document.getElementById('delivery-progress-fill');
  const progressText = document.getElementById('delivery-progress-text');
  if (progressBar && progressText) {
    if (subtotal >= state.settings.freeDeliveryThreshold) {
      progressBar.style.width = '100%';
      progressText.innerHTML = `🎉 <strong>Congratulations!</strong> Order qualifies for <strong>FREE Delivery</strong>!`;
    } else {
      const remaining = state.settings.freeDeliveryThreshold - subtotal;
      const pct = Math.min(100, Math.round((subtotal / state.settings.freeDeliveryThreshold) * 100));
      progressBar.style.width = `${pct}%`;
      progressText.innerHTML = `Add <strong>${formatMoney(remaining)}</strong> more to unlock <strong>FREE Delivery</strong>`;
    }
  }
}

function openCart() {
  state.isCartOpen = true;
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (drawer && backdrop) {
    backdrop.classList.remove('hidden');
    setTimeout(() => {
      drawer.classList.remove('translate-x-full');
      backdrop.classList.remove('opacity-0');
    }, 10);
  }
  renderCartDrawer();
}

function closeCart() {
  state.isCartOpen = false;
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (drawer && backdrop) {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('opacity-0');
    setTimeout(() => backdrop.classList.add('hidden'), 300);
  }
}

// ----------------------------------------------------
// PRODUCT DETAIL MODAL
// ----------------------------------------------------
function openProductModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  state.activeModalProduct = product;

  const modal = document.getElementById('product-detail-modal');
  const inCartItem = state.cart.find(i => i.id === product.id);
  const cartQty = inCartItem ? inCartItem.quantity : 0;

  document.getElementById('modal-img').src = product.image;
  document.getElementById('modal-category').textContent = `${getCategoryIcon(product.category)} ${product.category.toUpperCase()}`;
  document.getElementById('modal-title').textContent = product.name;
  document.getElementById('modal-price').textContent = formatMoney(product.price);
  document.getElementById('modal-unit').textContent = product.unit || 'per unit';
  document.getElementById('modal-description').textContent = product.description;
  document.getElementById('modal-season').textContent = product.harvestSeason || 'Direct Sourcing';
  document.getElementById('modal-storage').textContent = product.storageTip || 'Keep stored in a cool ventilated place.';

  const actionArea = document.getElementById('modal-action-area');
  if (actionArea) {
    if (product.stockStatus === 'out_of_stock') {
      actionArea.innerHTML = `
        <button disabled class="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl cursor-not-allowed">
          Currently Sold Out
        </button>
      `;
    } else {
      actionArea.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-3">
          <button onclick="addToCart('${product.id}'); updateModalAction('${product.id}');" class="flex-1 py-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-2xl shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer">
            <span>Add to Basket (${cartQty > 0 ? `${cartQty} in cart` : 'Start order'})</span>
          </button>
          <a href="#wholesale" onclick="closeProductModal(); preselectWholesaleProduce('${product.name}');" class="px-6 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl transition text-center text-sm flex items-center justify-center">
            Order in Bulk / Wholesale
          </a>
        </div>
      `;
    }
  }

  modal.classList.remove('hidden');
}

function updateModalAction(productId) {
  openProductModal(productId);
}

function closeProductModal() {
  const modal = document.getElementById('product-detail-modal');
  if (modal) modal.classList.add('hidden');
  state.activeModalProduct = null;
}

// ----------------------------------------------------
// RETAIL CHECKOUT MODAL & WHATSAPP
// ----------------------------------------------------
function openCheckoutModal() {
  if (state.cart.length === 0) {
    alert('Your harvest basket is empty. Please select produce first!');
    return;
  }
  closeCart();
  const modal = document.getElementById('checkout-modal');
  if (modal) {
    modal.classList.remove('hidden');
    updateCheckoutPreview();
  }
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.classList.add('hidden');
}

function generateRetailWhatsAppMessage(formData) {
  const refCode = 'AT-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isDelivery = formData.method === 'delivery';
  const deliveryCost = isDelivery 
    ? (subtotal >= state.settings.freeDeliveryThreshold ? 0 : state.settings.deliveryFee) 
    : 0;
  const grandTotal = subtotal + deliveryCost;

  let msg = `🌿 *PRODUCE ORDER - ATALANTA SALES* 🌿\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📋 *Order Ref:* #${refCode}\n`;
  msg += `📅 *Date:* ${dateStr}\n\n`;

  msg += `👤 *CUSTOMER INFORMATION:*\n`;
  msg += `• *Name:* ${formData.name || 'Not provided'}\n`;
  msg += `• *Phone:* ${formData.phone || 'Not provided'}\n`;
  msg += `• *Dispatch:* ${isDelivery ? '🚚 Direct Delivery' : '🏪 Atalanta Depot Pickup'}\n`;
  if (isDelivery) {
    msg += `• *Delivery Address:* ${formData.address || 'Address to be confirmed'}\n`;
  } else {
    msg += `• *Pickup Hub:* ${state.settings.pickupLocation}\n`;
  }
  if (formData.deliveryDate) {
    msg += `• *Preferred Slot:* ${formData.deliveryDate}\n`;
  }
  msg += `\n📦 *PRODUCE LIST:*\n`;

  state.cart.forEach((item, idx) => {
    msg += `${idx + 1}. *${item.name}*\n`;
    msg += `   └ ${item.quantity} x ${item.unit || 'unit'} @ ${formatMoney(item.price)} = ${formatMoney(item.price * item.quantity)}\n`;
  });

  msg += `\n🧾 *PAYMENT SUMMARY:*\n`;
  msg += `• Subtotal: ${formatMoney(subtotal)}\n`;
  if (isDelivery) {
    msg += `• Delivery Fee: ${deliveryCost === 0 ? 'FREE' : formatMoney(deliveryCost)}\n`;
  } else {
    msg += `• Depot Pickup: FREE\n`;
  }
  msg += `⭐ *TOTAL ESTIMATED: ${formatMoney(grandTotal)}*\n\n`;

  if (formData.notes && formData.notes.trim()) {
    msg += `📝 *Notes/Packaging Instructions:* ${formData.notes.trim()}\n\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Sent via Atalanta Sales Website._ Please reply with availability and invoice/payment details!`;

  return msg;
}

function updateCheckoutPreview() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  const previewBox = document.getElementById('whatsapp-preview-text');
  if (!previewBox) return; // preview box removed from UI

  const formData = {
    name: form.elements['customer_name']?.value || '',
    phone: form.elements['customer_phone']?.value || '',
    method: state.deliveryMethod,
    address: form.elements['customer_address']?.value || '',
    deliveryDate: form.elements['delivery_date']?.value || '',
    notes: form.elements['customer_notes']?.value || ''
  };

  previewBox.textContent = generateRetailWhatsAppMessage(formData);
}

function submitOrderToWhatsApp(e) {
  e.preventDefault();
  const form = document.getElementById('checkout-form');
  if (!form) return;

  const name = form.elements['customer_name'].value.trim();
  const phone = form.elements['customer_phone'].value.trim();
  const address = form.elements['customer_address']?.value.trim();

  if (!name) { alert('Please enter your full name.'); return; }
  if (!phone) { alert('Please enter your WhatsApp/Phone number.'); return; }
  if (state.deliveryMethod === 'delivery' && !address) { alert('Please enter your delivery address.'); return; }

  const formData = {
    name,
    phone,
    method: state.deliveryMethod,
    address,
    deliveryDate: form.elements['delivery_date']?.value || '',
    notes: form.elements['customer_notes']?.value || ''
  };

  const messageText = generateRetailWhatsAppMessage(formData);
  const cleanPhone = state.settings.whatsappNumber.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

  window.open(waUrl, '_blank');
  showOrderSuccessModal(name, cleanPhone);
}

function showOrderSuccessModal(name, phone) {
  closeCheckoutModal();
  const successModal = document.getElementById('order-success-modal');
  if (successModal) {
    document.getElementById('success-customer-name').textContent = name;
    successModal.classList.remove('hidden');
  }
}

function closeSuccessModal() {
  const successModal = document.getElementById('order-success-modal');
  if (successModal) successModal.classList.add('hidden');
  state.cart = [];
  saveCartToStorage();
}

// ----------------------------------------------------
// B2B WHOLESALE & BULK ORDER WHATSAPP ENGINE
// ----------------------------------------------------
function setupWholesaleForm() {
  const wholesaleForm = document.getElementById('wholesale-inquiry-form');
  if (!wholesaleForm) return;

  wholesaleForm.addEventListener('input', updateWholesalePreview);
  wholesaleForm.addEventListener('change', updateWholesalePreview);
  wholesaleForm.addEventListener('submit', handleWholesaleSubmit);
  updateWholesalePreview();
}

function getSelectedWholesaleProduce() {
  const checkboxes = document.querySelectorAll('input[name="bulk_produce"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

function preselectWholesaleProduce(produceName) {
  const checkboxes = document.querySelectorAll('input[name="bulk_produce"]');
  checkboxes.forEach(cb => {
    if (produceName.toLowerCase().includes(cb.value.toLowerCase())) {
      cb.checked = true;
    }
  });
  updateWholesalePreview();
}

function generateWholesaleWhatsAppMessage(data) {
  const refCode = 'AT-BULK-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  let msg = `🏢 *WHOLESALE & BULK INQUIRY - ATALANTA SALES* 🏢\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 *RFQ Reference:* #${refCode}\n`;
  msg += `📅 *Date:* ${dateStr}\n\n`;

  msg += `👤 *BUYER CREDENTIALS:*\n`;
  msg += `• *Business/Entity:* ${data.companyName || 'Not specified'}\n`;
  msg += `• *Contact Person:* ${data.contactName || 'Not specified'}\n`;
  msg += `• *WhatsApp Phone:* ${data.phone || 'Not specified'}\n`;
  msg += `• *Business Category:* ${data.buyerType || 'Bulk Buyer'}\n`;
  msg += `• *Target Delivery City:* ${data.destination || 'Lagos Region'}\n\n`;

  msg += `📦 *BULK PRODUCE REQUIRED:*\n`;
  if (data.produceList && data.produceList.length > 0) {
    data.produceList.forEach(item => {
      msg += `  ✔ ${item}\n`;
    });
  } else {
    msg += `  (Produce to be specified in discussion)\n`;
  }

  msg += `\n📊 *VOLUME & FREQUENCY:*\n`;
  msg += `• *Estimated Quantity:* ${data.volume || 'Commercial quantities (to be estimated)'}\n`;
  msg += `• *Supply Frequency:* ${data.frequency || 'Weekly regular supply'}\n`;

  if (data.notes && data.notes.trim()) {
    msg += `\n📝 *Specific Sourcing & Packaging Requirements:*\n`;
    msg += `${data.notes.trim()}\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Sent via Atalanta Produce Sales Portal._ Please provide your B2B wholesale quotation, MOQ, and contract supply terms.`;

  return msg;
}

function updateWholesalePreview() {
  const form = document.getElementById('wholesale-inquiry-form');
  if (!form) return;

  const previewEl = document.getElementById('wholesale-preview-text');
  if (!previewEl) return; // preview box removed from UI

  const data = {
    companyName: form.elements['company_name']?.value || '',
    contactName: form.elements['contact_name']?.value || '',
    phone: form.elements['wholesale_phone']?.value || '',
    buyerType: form.elements['buyer_type']?.value || '',
    produceList: getSelectedWholesaleProduce(),
    volume: form.elements['volume_estimate']?.value || '',
    frequency: form.elements['supply_frequency']?.value || '',
    destination: form.elements['delivery_city']?.value || '',
    notes: form.elements['wholesale_notes']?.value || ''
  };

  previewEl.textContent = generateWholesaleWhatsAppMessage(data);
}

function handleWholesaleSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('wholesale-inquiry-form');
  if (!form) return;

  const companyName = form.elements['company_name'].value.trim();
  const contactName = form.elements['contact_name'].value.trim();
  const phone = form.elements['wholesale_phone'].value.trim();
  const volume = form.elements['volume_estimate'].value.trim();

  if (!companyName) { alert('Please enter your business or company name.'); return; }
  if (!contactName) { alert('Please enter the contact person name.'); return; }
  if (!phone) { alert('Please enter your WhatsApp phone number.'); return; }

  const data = {
    companyName,
    contactName,
    phone,
    buyerType: form.elements['buyer_type'].value,
    produceList: getSelectedWholesaleProduce(),
    volume,
    frequency: form.elements['supply_frequency'].value,
    destination: form.elements['delivery_city'].value.trim(),
    notes: form.elements['wholesale_notes'].value.trim()
  };

  const messageText = generateWholesaleWhatsAppMessage(data);
  const cleanPhone = state.settings.whatsappNumber.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

  window.open(waUrl, '_blank');
  alert(`Thank you ${contactName}! Your wholesale inquiry has been opened on WhatsApp. Our Atalanta sales team will provide wholesale quote & supply terms immediately.`);
}

// ----------------------------------------------------
// UI FILTERS & CONTROLS
// ----------------------------------------------------
function resetFilters() {
  state.currentCategory = 'all';
  state.searchQuery = '';
  state.onlyInStock = false;
  state.sortBy = 'featured';

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  const inStockCheck = document.getElementById('in-stock-only');
  if (inStockCheck) inStockCheck.checked = false;

  updateActiveCategoryTab();
  renderProducts();
}

function updateActiveCategoryTab() {
  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    const cat = btn.getAttribute('data-cat');
    if (cat === state.currentCategory) {
      btn.className = 'cat-pill-btn active px-5 py-2.5 rounded-full text-sm font-black bg-emerald-500 text-black border border-emerald-400 shadow-md flex items-center gap-2 transition cursor-pointer';
    } else {
      btn.className = 'cat-pill-btn px-5 py-2.5 rounded-full text-sm font-semibold bg-[#121614] text-slate-300 hover:text-emerald-400 hover:border-emerald-500 border border-[#1e2a22] flex items-center gap-2 transition cursor-pointer';
    }
  });
}

function setupEventListeners() {
  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentCategory = btn.getAttribute('data-cat') || 'all';
      updateActiveCategoryTab();
      renderProducts();
    });
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderProducts();
    });
  }

  const inStockCheck = document.getElementById('in-stock-only');
  if (inStockCheck) {
    inStockCheck.addEventListener('change', (e) => {
      state.onlyInStock = e.target.checked;
      renderProducts();
    });
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderProducts();
    });
  }

  const methodDeliveryBtn = document.getElementById('method-delivery-btn');
  const methodPickupBtn = document.getElementById('method-pickup-btn');
  const addressFieldContainer = document.getElementById('address-field-container');

  if (methodDeliveryBtn && methodPickupBtn) {
    methodDeliveryBtn.addEventListener('click', () => {
      state.deliveryMethod = 'delivery';
      methodDeliveryBtn.classList.add('border-emerald-700', 'bg-emerald-50', 'text-emerald-900');
      methodDeliveryBtn.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
      methodPickupBtn.classList.remove('border-emerald-700', 'bg-emerald-50', 'text-emerald-900');
      methodPickupBtn.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
      if (addressFieldContainer) addressFieldContainer.classList.remove('hidden');
      renderCartDrawer();
      updateCheckoutPreview();
    });

    methodPickupBtn.addEventListener('click', () => {
      state.deliveryMethod = 'pickup';
      methodPickupBtn.classList.add('border-emerald-700', 'bg-emerald-50', 'text-emerald-900');
      methodPickupBtn.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
      methodDeliveryBtn.classList.remove('border-emerald-700', 'bg-emerald-50', 'text-emerald-900');
      methodDeliveryBtn.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
      if (addressFieldContainer) addressFieldContainer.classList.add('hidden');
      renderCartDrawer();
      updateCheckoutPreview();
    });
  }

  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('input', updateCheckoutPreview);
    checkoutForm.addEventListener('submit', submitOrderToWhatsApp);
  }
}

// Global functions for inline HTML calls
window.switchHeroVideo = switchHeroVideo;
window.addToCart = addToCart;
window.incrementCart = incrementCart;
window.decrementCart = decrementCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.openCart = openCart;
window.closeCart = closeCart;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.updateModalAction = updateModalAction;
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.submitOrderToWhatsApp = submitOrderToWhatsApp;
window.closeSuccessModal = closeSuccessModal;
window.resetFilters = resetFilters;
window.preselectWholesaleProduce = preselectWholesaleProduce;
