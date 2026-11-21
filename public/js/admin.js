// Atalanta Food — Sales Manager Portal Engine
let adminToken = sessionStorage.getItem('atalanta_admin_token') || localStorage.getItem('atalanta_admin_token') || '';
let allProducts = [];
let companySettings = {};

const CURATED_PRESETS = [
  { name: 'Habanero / Ata Rodo', url: '/images/habanero-peppers.jpg' },
  { name: 'Bell Peppers (Tatashe)', url: '/images/bell-peppers.jpg' },
  { name: 'Green Bell Pepper', url: '/images/green-bell-peppers.jpg' },
  { name: 'Jos Plum Tomatoes', url: '/images/fresh-tomatoes.jpg' },
  { name: 'Fresh Ugu Leaves', url: '/images/ugu-leaves.png' },
  { name: 'Benue White Yam', url: '/images/yam.png' },
  { name: 'Greenhouse Cucumbers', url: '/images/cucumbers.jpg' },
  { name: 'Tender Green Okra', url: '/images/okra.jpg' },
  { name: 'Golden Sweet Corn', url: '/images/sweet-corn.jpg' },
  { name: 'Organic Soursop', url: '/images/soursop.png' },
  { name: 'Buttery Avocado', url: '/images/avocado.jpg' },
  { name: 'Atalanta Brand Logo', url: '/images/atalanta-logo.jpg' }
];

document.addEventListener('DOMContentLoaded', () => {
  setupLoginHandler();
  setupSettingsHandler();
  setupProductFormHandler();
  setupFiltersAndSearch();
  initImagePresets();

  if (adminToken) {
    verifyAndLoadDashboard();
  } else {
    showLoginView();
  }
});

// ── AUTHENTICATION ──────────────────────────────────────────────────────────
function setupLoginHandler() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordInput = document.getElementById('admin-password-input');
    const errorBox = document.getElementById('login-error');
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (errorBox) {
      errorBox.classList.add('hidden');
      errorBox.textContent = '';
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        adminToken = data.token;
        sessionStorage.setItem('atalanta_admin_token', adminToken);
        localStorage.setItem('atalanta_admin_token', adminToken);
        showDashboardView();
        await loadDashboardData();
      } else {
        showLoginError(data.error || 'Invalid security access key. Please try again.');
      }
    } catch (err) {
      showLoginError('Network connection error. Is the server running?');
    }
  });
}

function showLoginError(msg) {
  const errorBox = document.getElementById('login-error');
  if (errorBox) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }
}

async function verifyAndLoadDashboard() {
  try {
    const res = await fetch('/api/admin/products', {
      headers: { 'x-admin-token': adminToken }
    });
    if (res.ok) {
      showDashboardView();
      await loadDashboardData();
    } else {
      adminToken = '';
      sessionStorage.removeItem('atalanta_admin_token');
      localStorage.removeItem('atalanta_admin_token');
      showLoginView();
    }
  } catch (err) {
    showLoginView();
  }
}

function showLoginView() {
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  if (loginView) loginView.classList.remove('hidden');
  if (dashboardView) dashboardView.classList.add('hidden');
}

function showDashboardView() {
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  if (loginView) loginView.classList.add('hidden');
  if (dashboardView) dashboardView.classList.remove('hidden');
}

function handleLogout() {
  adminToken = '';
  sessionStorage.removeItem('atalanta_admin_token');
  localStorage.removeItem('atalanta_admin_token');
  showLoginView();
}

// ── DATA FETCHING & RENDERING ───────────────────────────────────────────────
async function loadDashboardData() {
  await Promise.all([loadSettings(), loadProducts()]);
}

async function loadSettings() {
  try {
    const res = await fetch('/api/admin/settings', {
      headers: { 'x-admin-token': adminToken }
    });
    if (!res.ok) return;
    companySettings = await res.json();

    const farmNameEl = document.getElementById('admin-farm-name');
    if (farmNameEl) farmNameEl.textContent = companySettings.farmName || 'Atalanta';

    const activeWaEl = document.getElementById('active-whatsapp-display');
    if (activeWaEl) activeWaEl.textContent = companySettings.whatsappNumber ? `+${companySettings.whatsappNumber}` : 'Not configured';

    const form = document.getElementById('settings-form');
    if (form) {
      form.elements['farmName'].value = companySettings.farmName || '';
      form.elements['whatsappNumber'].value = companySettings.whatsappNumber || '';
      form.elements['currency'].value = companySettings.currency || '₦';
      form.elements['deliveryFee'].value = companySettings.deliveryFee || 2500;
      form.elements['freeDeliveryThreshold'].value = companySettings.freeDeliveryThreshold || 50000;
      form.elements['announcement'].value = companySettings.announcement || '';
      form.elements['contactPhone'].value = companySettings.contactPhone || '';
      form.elements['contactEmail'].value = companySettings.contactEmail || '';
      form.elements['address'].value = companySettings.address || '';
      form.elements['pickupLocation'].value = companySettings.pickupLocation || '';
      if (form.elements['hideOutOfStock']) {
        form.elements['hideOutOfStock'].checked = companySettings.hideOutOfStock !== false;
      }
      if (form.elements['newPassword']) form.elements['newPassword'].value = '';
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

async function loadProducts() {
  try {
    const res = await fetch('/api/admin/products', {
      headers: { 'x-admin-token': adminToken }
    });
    if (!res.ok) return;
    allProducts = await res.json();
    updateStats();
    renderProductsTable();
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

function updateStats() {
  const total = allProducts.length;
  const inStock = allProducts.filter(p => p.stockStatus === 'in_stock').length;
  const outStock = allProducts.filter(p => p.stockStatus === 'out_of_stock').length;

  const totalEl = document.getElementById('stat-total');
  const inStockEl = document.getElementById('stat-in-stock');
  const outStockEl = document.getElementById('stat-out-stock');

  if (totalEl) totalEl.textContent = total;
  if (inStockEl) inStockEl.textContent = inStock;
  if (outStockEl) outStockEl.textContent = outStock;
}

function renderProductsTable() {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  const searchQuery = (document.getElementById('admin-search-input')?.value || '').toLowerCase().trim();
  const categoryFilter = document.getElementById('admin-filter-category')?.value || 'all';

  let filtered = allProducts.filter(p => {
    const matchesCat = categoryFilter === 'all' || (p.category || '').toLowerCase() === categoryFilter.toLowerCase();
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery) || 
      (p.description || '').toLowerCase().includes(searchQuery) ||
      (p.category || '').toLowerCase().includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400 text-sm">
          No produce found matching your current filter.
        </td>
      </tr>
    `;
    return;
  }

  const currency = companySettings.currency || '₦';

  tbody.innerHTML = filtered.map(p => {
    const isOut = p.stockStatus === 'out_of_stock';
    const isLow = p.stockStatus === 'low_stock';

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition" id="row-${p.id}">
        <!-- Produce Info -->
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img 
              src="${p.image || '/images/atalanta-logo.jpg'}" 
              alt="${p.name}" 
              class="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
              onerror="this.src='/images/atalanta-logo.jpg'"
            />
            <div class="min-w-0">
              <span class="font-bold text-slate-900 text-sm block truncate max-w-[200px] sm:max-w-[260px]">${p.name}</span>
              <span class="text-[11px] text-slate-400 block">${p.harvestSeason || 'Direct Sourced'}</span>
            </div>
          </div>
        </td>

        <!-- Category -->
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getCategoryBadgeClass(p.category)}">
            ${p.category || 'general'}
          </span>
        </td>

        <!-- Quick Price Edit -->
        <td class="py-3 px-4">
          <div class="flex items-center gap-1">
            <span class="text-xs font-bold text-slate-500">${currency}</span>
            <input 
              type="number" 
              value="${p.price}" 
              class="w-24 px-2 py-1 text-sm font-black text-slate-900 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              onchange="handleQuickPriceChange('${p.id}', this.value)"
            />
          </div>
        </td>

        <!-- Unit Description -->
        <td class="py-3 px-4 text-xs font-medium text-slate-600">
          ${p.unit || 'per unit'}
        </td>

        <!-- Stock Status Toggle -->
        <td class="py-3 px-4">
          <select 
            onchange="handleQuickStockChange('${p.id}', this.value)" 
            class="text-xs font-bold rounded-lg px-2.5 py-1 border border-slate-200 cursor-pointer ${
              isOut ? 'bg-rose-50 text-rose-700 border-rose-200' : 
              isLow ? 'bg-amber-50 text-amber-700 border-amber-200' : 
              'bg-emerald-50 text-emerald-800 border-emerald-200'
            }"
          >
            <option value="in_stock" ${p.stockStatus === 'in_stock' ? 'selected' : ''}>🟢 In Stock</option>
            <option value="low_stock" ${p.stockStatus === 'low_stock' ? 'selected' : ''}>🟡 Low Stock</option>
            <option value="out_of_stock" ${p.stockStatus === 'out_of_stock' ? 'selected' : ''}>🔴 Sold Out</option>
          </select>
        </td>

        <!-- Featured -->
        <td class="py-3 px-4 text-center">
          <button 
            onclick="handleToggleFeatured('${p.id}')" 
            class="text-base transition hover:scale-110 cursor-pointer"
            title="${p.featured ? 'Featured on storefront' : 'Not featured'}"
          >
            ${p.featured ? '⭐' : '☆'}
          </button>
        </td>

        <!-- Actions -->
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button 
              onclick="openEditProductModal('${p.id}')" 
              class="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition font-bold text-xs cursor-pointer"
              title="Edit Produce"
            >
              ✏️ Edit
            </button>
            <button 
              onclick="handleDeleteProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}')" 
              class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition font-bold text-xs cursor-pointer"
              title="Delete Produce"
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getCategoryBadgeClass(cat) {
  switch ((cat || '').toLowerCase()) {
    case 'peppers': return 'bg-rose-100 text-rose-800';
    case 'vegetables': return 'bg-emerald-100 text-emerald-800';
    case 'tubers': return 'bg-amber-100 text-amber-900';
    case 'grains': return 'bg-yellow-100 text-yellow-800';
    case 'fruits': return 'bg-purple-100 text-purple-800';
    default: return 'bg-slate-100 text-slate-800';
  }
}

// ── QUICK INLINE ACTIONS ────────────────────────────────────────────────────
async function handleQuickPriceChange(id, newPrice) {
  const priceNum = Number(newPrice);
  if (isNaN(priceNum) || priceNum < 0) {
    alert('Please enter a valid price number.');
    return;
  }

  try {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      },
      body: JSON.stringify({ price: priceNum })
    });
    if (res.ok) {
      const prod = allProducts.find(p => p.id === id);
      if (prod) prod.price = priceNum;
    } else {
      alert('Failed to update price. Please try again.');
    }
  } catch (err) {
    alert('Error updating price: ' + err.message);
  }
}

async function handleQuickStockChange(id, newStatus) {
  try {
    const res = await fetch(`/api/admin/products/${id}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      },
      body: JSON.stringify({ stockStatus: newStatus })
    });
    if (res.ok) {
      const prod = allProducts.find(p => p.id === id);
      if (prod) prod.stockStatus = newStatus;
      updateStats();
      renderProductsTable();
    }
  } catch (err) {
    alert('Error updating stock status: ' + err.message);
  }
}

async function handleToggleFeatured(id) {
  const prod = allProducts.find(p => p.id === id);
  if (!prod) return;
  const newFeatured = !prod.featured;

  try {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      },
      body: JSON.stringify({ featured: newFeatured })
    });
    if (res.ok) {
      prod.featured = newFeatured;
      renderProductsTable();
    }
  } catch (err) {
    alert('Error updating featured status: ' + err.message);
  }
}

async function handleDeleteProduct(id, name) {
  if (!confirm(`Are you sure you want to remove "${name}" from Atalanta produce catalogue?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': adminToken }
    });
    if (res.ok) {
      allProducts = allProducts.filter(p => p.id !== id);
      updateStats();
      renderProductsTable();
    } else {
      alert('Failed to delete produce.');
    }
  } catch (err) {
    alert('Error deleting produce: ' + err.message);
  }
}

// ── ADD / EDIT PRODUCE MODAL ────────────────────────────────────────────────
function openAddProductModal() {
  const modal = document.getElementById('produce-modal');
  const title = document.getElementById('produce-modal-title');
  const form = document.getElementById('produce-form');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('produce-id-input').value = '';
  document.getElementById('image-preview').src = '/images/atalanta-logo.jpg';
  document.getElementById('produce-image-input').value = '/images/atalanta-logo.jpg';
  if (title) title.textContent = 'Add New Produce to Atalanta';

  modal.classList.remove('hidden');
}

function openEditProductModal(id) {
  const modal = document.getElementById('produce-modal');
  const title = document.getElementById('produce-modal-title');
  const form = document.getElementById('produce-form');
  const prod = allProducts.find(p => p.id === id);
  if (!modal || !form || !prod) return;

  form.reset();
  document.getElementById('produce-id-input').value = prod.id;
  form.elements['name'].value = prod.name || '';
  form.elements['category'].value = prod.category || 'vegetables';
  form.elements['price'].value = prod.price || 0;
  form.elements['unit'].value = prod.unit || '';
  form.elements['stockStatus'].value = prod.stockStatus || 'in_stock';
  form.elements['badge'].value = prod.badge || '';
  form.elements['harvestSeason'].value = prod.harvestSeason || '';
  form.elements['description'].value = prod.description || '';
  form.elements['storageTip'].value = prod.storageTip || '';
  form.elements['featured'].checked = !!prod.featured;

  const imgUrl = prod.image || '/images/atalanta-logo.jpg';
  document.getElementById('produce-image-input').value = imgUrl;
  document.getElementById('image-preview').src = imgUrl;

  if (title) title.textContent = `Edit: ${prod.name}`;
  modal.classList.remove('hidden');
}

function closeProduceModal() {
  const modal = document.getElementById('produce-modal');
  if (modal) modal.classList.add('hidden');
}

function setupProductFormHandler() {
  const form = document.getElementById('produce-form');
  if (!form) return;

  const imgInput = document.getElementById('produce-image-input');
  if (imgInput) {
    imgInput.addEventListener('input', () => {
      document.getElementById('image-preview').src = imgInput.value.trim() || '/images/atalanta-logo.jpg';
    });
  }

  const fileInput = document.getElementById('produce-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusText = document.getElementById('upload-status-text');
      if (statusText) statusText.textContent = `Selected: ${file.name}`;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        document.getElementById('image-preview').src = dataUrl;
        document.getElementById('produce-image-input').value = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('produce-id-input').value;
    const isEdit = !!id;

    const payload = {
      name: form.elements['name'].value.trim(),
      category: form.elements['category'].value,
      price: Number(form.elements['price'].value) || 0,
      unit: form.elements['unit'].value.trim(),
      stockStatus: form.elements['stockStatus'].value,
      badge: form.elements['badge'].value.trim(),
      harvestSeason: form.elements['harvestSeason'].value.trim(),
      image: form.elements['image'].value.trim() || '/images/atalanta-logo.jpg',
      description: form.elements['description'].value.trim(),
      storageTip: form.elements['storageTip'].value.trim(),
      featured: form.elements['featured'].checked
    };

    const url = isEdit ? `/api/admin/products/${id}` : '/api/admin/products';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        closeProduceModal();
        await loadProducts();
      } else {
        alert('Failed to save produce: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      alert('Error saving produce: ' + err.message);
    }
  });
}

function initImagePresets() {
  const container = document.getElementById('preset-image-picker');
  if (!container) return;

  container.innerHTML = CURATED_PRESETS.map(preset => `
    <button 
      type="button" 
      onclick="selectImagePreset('${preset.url}')"
      class="border border-slate-200 hover:border-emerald-600 rounded-xl overflow-hidden p-1 bg-white transition hover:shadow-xs flex flex-col items-center group cursor-pointer"
      title="${preset.name}"
    >
      <img src="${preset.url}" alt="${preset.name}" class="w-12 h-12 object-cover rounded-lg group-hover:scale-105 transition" onerror="this.src='/images/atalanta-logo.jpg'"/>
      <span class="text-[9px] text-slate-500 truncate w-full text-center mt-1 font-semibold">${preset.name}</span>
    </button>
  `).join('');
}

function selectImagePreset(url) {
  document.getElementById('produce-image-input').value = url;
  document.getElementById('image-preview').src = url;
}

// ── SETTINGS FORM HANDLER ───────────────────────────────────────────────────
function setupSettingsHandler() {
  const form = document.getElementById('settings-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      farmName: form.elements['farmName'].value.trim(),
      whatsappNumber: form.elements['whatsappNumber'].value.trim(),
      currency: form.elements['currency'].value.trim(),
      deliveryFee: Number(form.elements['deliveryFee'].value) || 0,
      freeDeliveryThreshold: Number(form.elements['freeDeliveryThreshold'].value) || 0,
      announcement: form.elements['announcement'].value.trim(),
      contactPhone: form.elements['contactPhone'].value.trim(),
      contactEmail: form.elements['contactEmail'].value.trim(),
      address: form.elements['address'].value.trim(),
      pickupLocation: form.elements['pickupLocation'].value.trim(),
      hideOutOfStock: form.elements['hideOutOfStock'] ? form.elements['hideOutOfStock'].checked : true
    };

    const newPass = form.elements['newPassword']?.value.trim();
    if (newPass) {
      payload.adminPassword = newPass;
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (newPass) {
          adminToken = newPass;
          sessionStorage.setItem('atalanta_admin_token', adminToken);
          localStorage.setItem('atalanta_admin_token', adminToken);
        }
        companySettings = data.settings;
        alert('Company settings and WhatsApp routing line saved successfully!');
        await loadSettings();
      } else {
        alert('Failed to save settings: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      alert('Error updating settings: ' + err.message);
    }
  });
}

// ── FILTERS & SEARCH ────────────────────────────────────────────────────────
function setupFiltersAndSearch() {
  const searchInput = document.getElementById('admin-search-input');
  const catFilter = document.getElementById('admin-filter-category');

  if (searchInput) {
    searchInput.addEventListener('input', () => renderProductsTable());
  }
  if (catFilter) {
    catFilter.addEventListener('change', () => renderProductsTable());
  }
}

// Global functions for inline HTML calls
window.handleLogout = handleLogout;
window.openAddProductModal = openAddProductModal;
window.openEditProductModal = openEditProductModal;
window.closeProduceModal = closeProduceModal;
window.selectImagePreset = selectImagePreset;
window.handleQuickPriceChange = handleQuickPriceChange;
window.handleQuickStockChange = handleQuickStockChange;
window.handleToggleFeatured = handleToggleFeatured;
window.handleDeleteProduct = handleDeleteProduct;
