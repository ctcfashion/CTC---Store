// =============================================
//   CTC Admin Dashboard — JavaScript
// =============================================

// ---- AUTH CONFIG ----
// To change credentials: update email/password below
// For production, use a proper backend (Firebase, Supabase, etc.)
const ADMIN_CREDENTIALS = [
  { email: "admin@ctcfashion.com",   password: "CTC@Admin2025",  name: "Admin",   role: "Administrator" },
  { email: "manager@ctcfashion.com", password: "Manager@2025",   name: "Manager", role: "Store Manager"  }
];

const SESSION_KEY = "ctc_admin_session";
let products = [];
let editingId = null;
let deleteTargetId = null;
let currentPanel = "dashboard";

// =============================================
//   AUTH
// =============================================
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, loginTime: Date.now() }));
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function checkAuth() {
  const session = getSession();
  if (!session) {
    showLoginPage();
  } else {
    showDashboard(session);
  }
}

function showLoginPage() {
  document.getElementById("login-page").style.display = "flex";
  document.getElementById("admin-app").style.display = "none";
}

function showDashboard(user) {
  document.getElementById("login-page").style.display = "none";
  document.getElementById("admin-app").style.display = "flex";
  document.getElementById("admin-name").textContent = user.name;
  document.getElementById("admin-role-label").textContent = user.role;
  document.getElementById("admin-avatar-initials").textContent = user.name.charAt(0).toUpperCase();
  loadProducts();
}

function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl  = document.getElementById("login-error");
  const btn      = document.getElementById("login-btn");

  errorEl.classList.remove("show");
  btn.disabled = true;
  btn.textContent = "Signing in…";

  // Simulate slight delay for UX
  setTimeout(() => {
    const match = ADMIN_CREDENTIALS.find(u => u.email === email && u.password === password);
    if (match) {
      setSession(match);
      showDashboard(match);
    } else {
      errorEl.textContent = "❌ Incorrect email or password. Please try again.";
      errorEl.classList.add("show");
      document.getElementById("login-password").value = "";
    }
    btn.disabled = false;
    btn.textContent = "Sign In";
  }, 600);
}

function logout() {
  if (!confirm("Are you sure you want to sign out?")) return;
  clearSession();
  showLoginPage();
  document.getElementById("login-email").value = "";
  document.getElementById("login-password").value = "";
}

function togglePassword() {
  const input = document.getElementById("login-password");
  const btn   = document.getElementById("toggle-pass-btn");
  if (input.type === "password") { input.type = "text"; btn.textContent = "🙈"; }
  else { input.type = "password"; btn.textContent = "👁"; }
}

// =============================================
//   PRODUCTS (stored in localStorage)
// =============================================
function loadProducts() {
  const stored = localStorage.getItem("ctc-products");
  if (stored) {
    products = JSON.parse(stored);
  } else {
    // Try fetching from JSON file first
    fetch("data/products.json")
      .then(r => r.json())
      .then(data => {
        // Add stock field if missing
        products = data.map(p => ({ ...p, stock: p.stock ?? 10 }));
        saveProducts();
        refreshAll();
      })
      .catch(() => {
        products = getDefaultProducts();
        saveProducts();
        refreshAll();
      });
    return;
  }
  refreshAll();
}

function saveProducts() {
  localStorage.setItem("ctc-products", JSON.stringify(products));
  // Also update the storefront cart data store key
  localStorage.setItem("ctc-products-updated", Date.now().toString());
}

function refreshAll() {
  renderDashboard();
  renderProductsTable();
  renderInventoryTable();
  updateStats();
}

// =============================================
//   NAVIGATION
// =============================================
function switchPanel(panel) {
  currentPanel = panel;
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("panel-" + panel).classList.add("active");
  document.getElementById("nav-" + panel).classList.add("active");

  // Update topbar title
  const titles = {
    dashboard: { title: "Dashboard", sub: "Overview of your store" },
    products:  { title: "Products",  sub: "Manage your product catalogue" },
    inventory: { title: "Inventory", sub: "Track and update stock levels" },
    settings:  { title: "Settings",  sub: "Store configuration" }
  };
  const t = titles[panel] || titles.dashboard;
  document.getElementById("topbar-title").textContent = t.title;
  document.getElementById("topbar-sub").textContent = t.sub;

  // Mobile: close sidebar
  document.getElementById("sidebar").classList.remove("open");
}

// =============================================
//   DASHBOARD
// =============================================
function updateStats() {
  const total     = products.length;
  const lowStock  = products.filter(p => (p.stock ?? 0) < 5).length;
  const featured  = products.filter(p => p.featured).length;
  const cats      = [...new Set(products.map(p => p.category))].length;

  document.getElementById("stat-products").textContent  = total;
  document.getElementById("stat-lowstock").textContent  = lowStock;
  document.getElementById("stat-featured").textContent  = featured;
  document.getElementById("stat-categories").textContent = cats;

  const badge = document.getElementById("low-stock-badge");
  badge.textContent = lowStock;
  badge.style.display = lowStock > 0 ? "inline-flex" : "none";
}

function renderDashboard() {
  // Recent products
  const recent = [...products].slice(-5).reverse();
  const tbody = document.getElementById("recent-products-body");
  if (!tbody) return;
  tbody.innerHTML = recent.map(p => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px">
        <img class="product-thumb" src="${p.image}" alt="" onerror="this.style.display='none'">
        <span style="font-weight:600;font-size:0.875rem">${p.name}</span>
      </div></td>
      <td><span class="badge badge-blue">${p.category}</span></td>
      <td style="font-family:var(--font-head);font-weight:700">$${p.price.toFixed(2)}</td>
      <td><span class="${(p.stock ?? 0) < 5 ? 'stock-low' : 'stock-ok'}">${p.stock ?? '—'}</span></td>
    </tr>
  `).join("");
}

// =============================================
//   PRODUCTS TABLE
// =============================================
function renderProductsTable(filter = "") {
  const tbody = document.getElementById("products-tbody");
  if (!tbody) return;
  const list = filter
    ? products.filter(p =>
        p.name.toLowerCase().includes(filter) ||
        p.category.toLowerCase().includes(filter))
    : products;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--grey-400)">No products found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <img class="product-thumb" src="${p.image}" alt="${p.name}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
          ><div class="product-thumb-placeholder" style="display:none">👔</div>
          <div>
            <div style="font-weight:600;font-size:0.875rem;color:var(--navy)">${p.name}</div>
            <div style="font-size:0.72rem;color:var(--grey-400)">#${p.id}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-blue">${p.category}</span></td>
      <td style="font-family:var(--font-head);font-weight:700;color:var(--navy)">$${p.price.toFixed(2)}</td>
      <td><span class="${(p.stock ?? 0) < 5 ? 'stock-low' : 'stock-ok'}">${p.stock ?? '—'} units</span></td>
      <td>
        ${p.featured ? '<span class="badge badge-gold" style="margin-right:4px">Featured</span>' : ''}
        ${p.bestSeller ? '<span class="badge badge-green">Best Seller</span>' : ''}
        ${!p.featured && !p.bestSeller ? '<span class="badge badge-grey">Standard</span>' : ''}
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:4px;font-size:0.8rem;color:var(--warning)">
          ${'★'.repeat(Math.round(p.rating))}
          <span style="color:var(--grey-400);margin-left:2px">${p.rating}</span>
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn action-btn-edit" onclick="openEditProduct(${p.id})" title="Edit">✏️</button>
          <button class="action-btn action-btn-delete" onclick="confirmDelete(${p.id})" title="Delete">🗑</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// =============================================
//   ADD / EDIT PRODUCT
// =============================================
function openAddProduct() {
  editingId = null;
  document.getElementById("product-modal-title").textContent = "Add New Product";
  document.getElementById("product-form").reset();
  resetPhotoPreview();
  document.getElementById("product-modal").classList.add("open");
}

function openEditProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById("product-modal-title").textContent = "Edit Product";
  document.getElementById("f-name").value       = p.name;
  document.getElementById("f-price").value      = p.price;
  document.getElementById("f-category").value   = p.category;
  document.getElementById("f-stock").value      = p.stock ?? 10;
  document.getElementById("f-image").value      = p.image && !p.image.startsWith("data:") ? p.image : "";
  document.getElementById("f-description").value = p.description;
  document.getElementById("f-featured").checked  = p.featured;
  document.getElementById("f-bestseller").checked = p.bestSeller;

  resetPhotoPreview();
  if (p.image) showPhotoPreview(p.image);

  document.getElementById("product-modal").classList.add("open");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.remove("open");
  editingId = null;
  resetPhotoPreview();
}

function saveProduct() {
  const name     = document.getElementById("f-name").value.trim();
  const price    = parseFloat(document.getElementById("f-price").value);
  const category = document.getElementById("f-category").value;
  const stock    = parseInt(document.getElementById("f-stock").value) || 0;
  const desc     = document.getElementById("f-description").value.trim();
  const featured = document.getElementById("f-featured").checked;
  const bestSeller = document.getElementById("f-bestseller").checked;

  // Image priority: uploaded photo (base64) > pasted URL > existing image (if editing) > placeholder
  const urlField = document.getElementById("f-image").value.trim();
  let image = currentPhotoData || urlField;
  if (!image && editingId) {
    const existing = products.find(p => p.id === editingId);
    image = existing ? existing.image : "";
  }
  if (!image) {
    image = `https://placehold.co/600x600/1565C0/FFFFFF?text=${encodeURIComponent(name || "CTC")}`;
  }

  if (!name || !price || !category) {
    showAdminToast("⚠️ Please fill in all required fields.", "error");
    return;
  }

  if (editingId) {
    const idx = products.findIndex(p => p.id === editingId);
    products[idx] = { ...products[idx], name, price, category, stock, image, description: desc, featured, bestSeller };
    showAdminToast("✅ Product updated successfully!", "success");
  } else {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, name, price, category, stock, image, description: desc, featured, bestSeller, rating: 4.5, reviews: 0 });
    showAdminToast("✅ Product added successfully!", "success");
  }

  saveProducts();
  refreshAll();
  closeProductModal();
}

// =============================================
//   PHOTO UPLOAD (compressed base64, no internet needed)
// =============================================
let currentPhotoData = null; // holds base64 string of newly uploaded photo

function handlePhotoSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showAdminToast("⚠️ Please select an image file.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    compressImage(e.target.result, file.size, (compressedDataUrl) => {
      currentPhotoData = compressedDataUrl;
      document.getElementById("f-image").value = ""; // clear URL field, photo takes priority
      showPhotoPreview(compressedDataUrl);
    });
  };
  reader.readAsDataURL(file);
}

function compressImage(dataUrl, originalSize, callback) {
  const img = new Image();
  img.onload = function() {
    const MAX_DIM = 700;
    let { width, height } = img;
    if (width > height && width > MAX_DIM) {
      height = Math.round(height * (MAX_DIM / width));
      width = MAX_DIM;
    } else if (height > MAX_DIM) {
      width = Math.round(width * (MAX_DIM / height));
      height = MAX_DIM;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    const quality = originalSize > 1500000 ? 0.6 : 0.75;
    const compressed = canvas.toDataURL("image/jpeg", quality);

    const warning = document.getElementById("photo-size-warning");
    if (warning) warning.style.display = (originalSize > 800000) ? "block" : "none";

    callback(compressed);
  };
  img.src = dataUrl;
}

function showPhotoPreview(src) {
  document.getElementById("photo-preview-img").src = src;
  document.getElementById("photo-preview-img").style.display = "block";
  document.getElementById("photo-preview-placeholder").style.display = "none";
  document.getElementById("photo-remove-btn").style.display = "block";
}

function resetPhotoPreview() {
  currentPhotoData = null;
  document.getElementById("photo-preview-img").style.display = "none";
  document.getElementById("photo-preview-img").src = "";
  document.getElementById("photo-preview-placeholder").style.display = "block";
  document.getElementById("photo-remove-btn").style.display = "none";
  document.getElementById("photo-size-warning").style.display = "none";
  document.getElementById("f-photo-file").value = "";
}

function removePhoto() {
  resetPhotoPreview();
  document.getElementById("f-image").value = "";
}

function handleUrlInput(value) {
  // If user pastes a URL, clear any uploaded photo and preview the URL instead
  if (value.trim()) {
    currentPhotoData = null;
    document.getElementById("f-photo-file").value = "";
    showPhotoPreview(value.trim());
  } else if (!currentPhotoData) {
    resetPhotoPreview();
  }
}

// =============================================
//   DELETE
// =============================================
function confirmDelete(id) {
  deleteTargetId = id;
  const p = products.find(x => x.id === id);
  document.getElementById("delete-product-name").textContent = p ? p.name : "this product";
  document.getElementById("delete-confirm").classList.add("open");
}

function cancelDelete() {
  deleteTargetId = null;
  document.getElementById("delete-confirm").classList.remove("open");
}

function executeDelete() {
  if (!deleteTargetId) return;
  products = products.filter(p => p.id !== deleteTargetId);
  saveProducts();
  refreshAll();
  cancelDelete();
  showAdminToast("🗑 Product deleted.", "success");
}

// =============================================
//   INVENTORY TABLE
// =============================================
function renderInventoryTable(filter = "") {
  const tbody = document.getElementById("inventory-tbody");
  if (!tbody) return;
  const list = filter
    ? products.filter(p => p.name.toLowerCase().includes(filter) || p.category.toLowerCase().includes(filter))
    : products;

  tbody.innerHTML = list.map(p => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <img class="product-thumb" src="${p.image}" alt="" onerror="this.style.display='none'">
          <span style="font-weight:600;font-size:0.875rem">${p.name}</span>
        </div>
      </td>
      <td><span class="badge badge-blue">${p.category}</span></td>
      <td>
        <input class="stock-input" type="number" min="0" value="${p.stock ?? 0}"
          onchange="updateStock(${p.id}, this.value)" title="Update stock">
      </td>
      <td>
        <span class="badge ${getStockBadge(p.stock)}">${getStockLabel(p.stock)}</span>
      </td>
      <td style="font-family:var(--font-head);font-weight:700">$${p.price.toFixed(2)}</td>
      <td>
        <button class="action-btn action-btn-edit" onclick="quickRestock(${p.id})" title="Restock +10" style="width:auto;padding:0 10px;font-size:0.75rem;font-family:var(--font-head);font-weight:700">+10</button>
      </td>
    </tr>
  `).join("");
}

function getStockBadge(stock) {
  const s = stock ?? 0;
  if (s === 0) return "badge-red";
  if (s < 5)  return "badge-gold";
  return "badge-green";
}
function getStockLabel(stock) {
  const s = stock ?? 0;
  if (s === 0) return "Out of Stock";
  if (s < 5)  return "Low Stock";
  return "In Stock";
}

function updateStock(id, val) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  p.stock = Math.max(0, parseInt(val) || 0);
  saveProducts();
  updateStats();
  showAdminToast(`📦 Stock updated for ${p.name}`, "success");
}

function quickRestock(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  p.stock = (p.stock ?? 0) + 10;
  saveProducts();
  renderInventoryTable();
  updateStats();
  showAdminToast(`📦 +10 units added to ${p.name}`, "success");
}

// =============================================
//   SETTINGS
// =============================================
function saveSettings() {
  const storeName   = document.getElementById("s-storename").value.trim();
  const whatsapp    = document.getElementById("s-whatsapp").value.trim();
  const email       = document.getElementById("s-email").value.trim();
  const phone       = document.getElementById("s-phone").value.trim();
  const location    = document.getElementById("s-location").value.trim();

  const settings = { storeName, whatsapp, email, phone, location };
  localStorage.setItem("ctc-settings", JSON.stringify(settings));
  showAdminToast("✅ Settings saved!", "success");
}

function loadSettings() {
  const s = JSON.parse(localStorage.getItem("ctc-settings") || "{}");
  if (s.storeName) document.getElementById("s-storename").value = s.storeName;
  if (s.whatsapp)  document.getElementById("s-whatsapp").value  = s.whatsapp;
  if (s.email)     document.getElementById("s-email").value     = s.email;
  if (s.phone)     document.getElementById("s-phone").value     = s.phone;
  if (s.location)  document.getElementById("s-location").value  = s.location;
}

function changeAdminPassword() {
  const current = document.getElementById("s-current-pass").value;
  const newPass  = document.getElementById("s-new-pass").value;
  const confirm  = document.getElementById("s-confirm-pass").value;
  const session  = getSession();

  const user = ADMIN_CREDENTIALS.find(u => u.email === session?.email && u.password === current);
  if (!user) { showAdminToast("❌ Current password is incorrect.", "error"); return; }
  if (newPass.length < 8) { showAdminToast("❌ New password must be at least 8 characters.", "error"); return; }
  if (newPass !== confirm) { showAdminToast("❌ Passwords do not match.", "error"); return; }
  // Note: in a real app, this would call a backend API
  showAdminToast("✅ Password updated! (Note: changes reset on page reload in this demo — use a backend for permanent changes)", "success");
}

// =============================================
//   EXPORT / IMPORT
// =============================================
function exportProducts() {
  const data = JSON.stringify(products, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "ctc-products.json";
  a.click(); URL.revokeObjectURL(url);
  showAdminToast("📥 Products exported!", "success");
}

function importProducts(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!Array.isArray(imported)) throw new Error("Invalid format");
      products = imported.map(p => ({ ...p, stock: p.stock ?? 10 }));
      saveProducts();
      refreshAll();
      showAdminToast(`✅ Imported ${products.length} products!`, "success");
    } catch {
      showAdminToast("❌ Invalid JSON file.", "error");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

// =============================================
//   TOAST
// =============================================
function showAdminToast(msg, type = "success") {
  const t = document.getElementById("admin-toast");
  t.querySelector(".toast-text").textContent = msg;
  t.className = `admin-toast ${type} show`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}

// =============================================
//   MOBILE SIDEBAR
// =============================================
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// =============================================
//   DEFAULT PRODUCTS FALLBACK
// =============================================
function getDefaultProducts() {
  return [
    { id:1, name:"School Blazer", price:35.00, category:"School Uniforms", image:"https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=600&q=80", description:"Smart school blazer.", featured:true, bestSeller:true, rating:4.8, reviews:42, stock:12 },
    { id:2, name:"Track Suit", price:28.00, category:"School Uniforms", image:"https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80", description:"Comfortable track suit.", featured:true, bestSeller:true, rating:4.7, reviews:38, stock:8 },
    { id:3, name:"Ladies Fashion Dress", price:22.00, category:"Fashion Wear", image:"https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80", description:"Elegant dresses.", featured:true, bestSeller:true, rating:4.9, reviews:54, stock:3 },
    { id:4, name:"Laptop Bag", price:19.00, category:"Bags", image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80", description:"Sleek laptop bags.", featured:true, bestSeller:true, rating:4.7, reviews:48, stock:15 },
  ];
}

// =============================================
//   INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadSettings();

  // Search in products table
  document.getElementById("products-search")?.addEventListener("input", e => {
    renderProductsTable(e.target.value.toLowerCase());
  });
  // Search in inventory table
  document.getElementById("inventory-search")?.addEventListener("input", e => {
    renderInventoryTable(e.target.value.toLowerCase());
  });
});
