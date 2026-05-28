import { api } from './api.js';
import { initAuth, isLoggedIn, getUser, showAuthModal, logout, onAuthChange } from './auth.js';
import { renderHome, updateCartCount } from './pages/home.js';
import { renderProducts } from './pages/products.js';
import { renderProductDetail } from './pages/product-detail.js';
import { renderCart } from './pages/cart.js';
import { renderCheckout } from './pages/checkout.js';
import { renderOrders, renderOrderSuccess } from './pages/orders.js';
import { renderProfile } from './pages/profile.js';
import { debounce } from './utils.js';

const app = document.getElementById('app');

async function router() {
  const hash = window.location.hash || '#/';
  const [path, queryString] = hash.slice(1).split('?');
  const params = Object.fromEntries(new URLSearchParams(queryString || ''));

  window.scrollTo(0, 0);

  if (path === '/' || path === '') {
    await renderHome(app);
  } else if (path === '/products') {
    await renderProducts(app, params);
  } else if (path.startsWith('/product/')) {
    const slug = path.replace('/product/', '');
    await renderProductDetail(app, slug);
  } else if (path === '/cart') {
    if (!isLoggedIn()) { showAuthModal('login'); return; }
    await renderCart(app);
  } else if (path === '/checkout') {
    if (!isLoggedIn()) { showAuthModal('login'); return; }
    await renderCheckout(app);
  } else if (path === '/orders') {
    if (!isLoggedIn()) { showAuthModal('login'); return; }
    await renderOrders(app);
  } else if (path.startsWith('/order-success/')) {
    if (!isLoggedIn()) { showAuthModal('login'); return; }
    const orderId = path.replace('/order-success/', '');
    await renderOrderSuccess(app, orderId);
  } else if (path === '/profile') {
    if (!isLoggedIn()) { showAuthModal('login'); return; }
    await renderProfile(app);
  } else {
    app.innerHTML = `
      <div class="container">
        <div class="error-page">
          <h2>404 - Không tìm thấy trang</h2>
          <p>Trang bạn tìm kiếm không tồn tại</p>
          <a href="#/" class="btn btn-primary">Về trang chủ</a>
        </div>
      </div>
    `;
  }

  updateActiveNav(path);
}

function updateActiveNav(path) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    const route = link.getAttribute('href');
    if (route === '#/' && (path === '/' || path === '')) {
      link.classList.add('active');
    } else if (route && route !== '#/' && path.startsWith(route.replace('#', ''))) {
      link.classList.add('active');
    }
  });
}

function updateUserUI(user) {
  const userDropdown = document.getElementById('userDropdown');
  if (!userDropdown) return;

  if (user) {
    userDropdown.innerHTML = `
      <div class="dropdown-header">
        <strong>${user.name}</strong>
        <span>${user.email}</span>
      </div>
      <a href="#/profile" class="dropdown-item"><i class="fas fa-user"></i> Tài khoản</a>
      <a href="#/orders" class="dropdown-item"><i class="fas fa-receipt"></i> Đơn hàng</a>
      <div class="dropdown-divider"></div>
      <a href="#" class="dropdown-item" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Đăng xuất</a>
    `;
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });

    // Load cart count
    api.cart.count().then(({ count }) => updateCartCount(count)).catch(() => {});
  } else {
    userDropdown.innerHTML = `
      <a href="#" class="dropdown-item" id="showLoginBtn"><i class="fas fa-sign-in-alt"></i> Đăng nhập</a>
      <a href="#" class="dropdown-item" id="showRegisterBtn"><i class="fas fa-user-plus"></i> Đăng ký</a>
    `;
    document.getElementById('showLoginBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      showAuthModal('login');
    });
    document.getElementById('showRegisterBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      showAuthModal('register');
    });
    updateCartCount(0);
  }
}

async function loadCategories() {
  try {
    const { categories } = await api.categories.list();
    const nav = document.getElementById('navCategories');
    const existingLinks = nav.querySelectorAll('.nav-cat-link');
    existingLinks.forEach(l => l.remove());

    categories.forEach(c => {
      const link = document.createElement('a');
      link.href = `#/products?category=${c.slug}`;
      link.className = 'nav-link nav-cat-link';
      link.innerHTML = `${c.image} ${c.name}`;
      nav.appendChild(link);
    });
  } catch {
    // ignore
  }
}

async function init() {
  await initAuth();
  updateUserUI(getUser());
  onAuthChange((user) => {
    updateUserUI(user);
    router();
  });
  await loadCategories();

  // User dropdown toggle
  const userBtn = document.getElementById('userBtn');
  const userDropdown = document.getElementById('userDropdown');
  userBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
  });
  document.addEventListener('click', () => {
    userDropdown?.classList.remove('show');
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const doSearch = () => {
    const query = searchInput.value.trim();
    if (query) {
      window.location.hash = `#/products?search=${encodeURIComponent(query)}`;
    }
  };
  searchBtn?.addEventListener('click', doSearch);
  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  // Auth modal close on overlay click
  document.getElementById('authModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.target.classList.remove('active');
  });

  window.addEventListener('hashchange', router);
  router();
}

init();
