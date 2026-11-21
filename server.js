// Atalanta Food — Express Server
// Admin: http://localhost:3000/admin  |  Password: check data/settings.json

const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

// ── Helpers ────────────────────────────────────────────────────────────────
function readJSON(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  }
  catch (e) {
    console.error('readJSON error on', file, e.message);
    return null;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── PUBLIC API ──────────────────────────────────────────────────────────────

// GET all products (public)
app.get('/api/products', (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  if (!products) return res.status(500).json({ error: 'Could not load products' });
  res.json(products);
});

// GET settings (public — only safe fields)
app.get('/api/settings', (req, res) => {
  const settings = readJSON(SETTINGS_FILE);
  if (!settings) return res.status(500).json({ error: 'Could not load settings' });
  const { adminPassword, ...publicSettings } = settings; // never expose password
  res.json(publicSettings);
});

// ── ADMIN AUTH MIDDLEWARE ───────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const token    = req.headers['x-admin-token'] || req.query.token || '';
  const settings = readJSON(SETTINGS_FILE);
  if (!settings) return res.status(500).json({ error: 'Server error' });
  if (token === settings.adminPassword) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Verify admin password (used by login form)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const settings     = readJSON(SETTINGS_FILE);
  if (!settings) return res.status(500).json({ error: 'Server error' });
  if (password === settings.adminPassword) {
    res.json({ success: true, token: password });
  } else {
    res.status(401).json({ success: false, error: 'Wrong password' });
  }
});

// ── ADMIN — PRODUCTS ────────────────────────────────────────────────────────

// GET all products (admin — full data)
app.get('/api/admin/products', requireAdmin, (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  res.json(products || []);
});

// POST — create new product
app.post('/api/admin/products', requireAdmin, (req, res) => {
  const products = readJSON(PRODUCTS_FILE) || [];
  const newProduct = {
    id:           'prod-' + Date.now(),
    name:         req.body.name         || 'New Produce',
    category:     req.body.category     || 'vegetables',
    price:        Number(req.body.price) || 0,
    unit:         req.body.unit         || 'per unit',
    stockStatus:  req.body.stockStatus  || 'in_stock',
    description:  req.body.description  || '',
    harvestSeason:req.body.harvestSeason|| 'Direct Sourced',
    storageTip:   req.body.storageTip   || 'Store in a cool place.',
    badge:        req.body.badge        || '',
    featured:     req.body.featured === 'true' || req.body.featured === true,
    image:        req.body.image        || '/images/atalanta-logo.jpg'
  };
  products.push(newProduct);
  writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true, product: newProduct });
});

// PUT — update product (price, stock, any field)
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  let products = readJSON(PRODUCTS_FILE) || [];
  const idx    = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  products[idx] = {
    ...products[idx],
    ...req.body,
    id:    products[idx].id,   // id is immutable
    price: Number(req.body.price) || products[idx].price
  };
  writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true, product: products[idx] });
});

// DELETE — remove product
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  let products = readJSON(PRODUCTS_FILE) || [];
  const before = products.length;
  products     = products.filter(p => p.id !== req.params.id);
  if (products.length === before) return res.status(404).json({ error: 'Product not found' });
  writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true });
});

// PATCH — quick stock toggle
app.patch('/api/admin/products/:id/stock', requireAdmin, (req, res) => {
  let products = readJSON(PRODUCTS_FILE) || [];
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  product.stockStatus = req.body.stockStatus;
  writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true, product });
});

// ── ADMIN — SETTINGS ────────────────────────────────────────────────────────

// GET settings (admin — full including password)
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  const settings = readJSON(SETTINGS_FILE);
  res.json(settings || {});
});

// PUT — update settings
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const current  = readJSON(SETTINGS_FILE) || {};
  const updated  = { ...current, ...req.body };
  writeJSON(SETTINGS_FILE, updated);
  res.json({ success: true, settings: updated });
});

// ── ADMIN PAGE ROUTE ────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ── CATCH-ALL — serve index.html for any unknown route ──────────────────────
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌾 Atalanta Food Server running at http://localhost:${PORT}`);
  console.log(`🛒 Storefront:      http://localhost:${PORT}`);
  console.log(`📖 About Us:        http://localhost:${PORT}/about.html`);
  console.log(`🔐 Admin Portal:    http://localhost:${PORT}/admin\n`);
});
