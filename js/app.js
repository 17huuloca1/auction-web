// ====================================================================
// App entry point: router đơn giản theo hash + auth + modal
// ====================================================================

import { store } from './store.js';
import { toast, openModal, closeModal } from './utils.js';
import { renderHome } from './pages/home.js';
import { renderDetail } from './pages/detail.js';
import { renderSeller } from './pages/seller.js';
import { renderAdmin } from './pages/admin.js';
import { renderProfile } from './pages/profile.js';

store.setToastFn(toast);

const app = document.getElementById('app');

function parseHash() {
  const h = location.hash.slice(1) || '/';
  if (h === '/' || h === '') return { route: 'home' };
  const parts = h.split('/').filter(Boolean);
  if (parts[0] === 'auction' && parts[1]) return { route: 'detail', id: parts[1] };
  if (parts[0] === 'seller') return { route: 'seller' };
  if (parts[0] === 'admin') return { route: 'admin' };
  if (parts[0] === 'profile') return { route: 'profile' };
  return { route: 'home' };
}

function navigate() {
  const { route, id } = parseHash();
  updateNavActive(route);
  if (route === 'home') return renderHome(app);
  if (route === 'detail') return renderDetail(app, id);
  if (route === 'seller') return renderSeller(app);
  if (route === 'admin') return renderAdmin(app);
  if (route === 'profile') return renderProfile(app);
  return renderHome(app);
}

function updateNavActive(route) {
  document.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

window.addEventListener('hashchange', navigate);
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-route]');
  if (link) {
    e.preventDefault();
    const r = link.dataset.route;
    if (r === 'home') location.hash = '#/';
    else location.hash = '#/' + r;
  }
});

// === Auth UI ===
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const authActions = document.getElementById('authActions');
const userName = document.getElementById('userName');
const userRoleBadge = document.getElementById('userRoleBadge');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

loginBtn.addEventListener('click', () => {
  document.getElementById('authTitle').textContent = 'Đăng nhập';
  switchAuthTab('login');
  openModal('authModal');
});
registerBtn.addEventListener('click', () => {
  document.getElementById('authTitle').textContent = 'Đăng ký';
  switchAuthTab('register');
  openModal('authModal');
});

document.querySelectorAll('[data-close-modal]').forEach((b) =>
  b.addEventListener('click', () => closeModal(b.dataset.closeModal))
);
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => switchAuthTab(t.dataset.tab))
);
function switchAuthTab(tab) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  loginForm.hidden = tab !== 'login';
  registerForm.hidden = tab !== 'register';
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(loginForm);
  try {
    const u = store.login(data.get('username'), data.get('password'));
    toast('success', 'Đăng nhập thành công', 'Xin chào ' + u.fullname);
    closeModal('authModal');
    loginForm.reset();
  } catch (err) {
    toast('error', 'Đăng nhập thất bại', err.message);
  }
});

registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(registerForm);
  try {
    const u = store.register({
      username: data.get('username'),
      password: data.get('password'),
      fullname: data.get('fullname'),
      role: data.get('role'),
    });
    toast('success', 'Đăng ký thành công', 'Xin chào ' + u.fullname);
    closeModal('authModal');
    registerForm.reset();
  } catch (err) {
    toast('error', 'Đăng ký thất bại', err.message);
  }
});

logoutBtn.addEventListener('click', () => {
  store.logout();
  toast('success', 'Đã đăng xuất');
  location.hash = '#/';
});

function syncAuthUI() {
  const u = store.currentUser();
  const isAuth = !!u;
  userInfo.hidden = !isAuth;
  authActions.hidden = isAuth;
  if (u) {
    userName.textContent = u.fullname;
    userRoleBadge.textContent = u.role;
    userRoleBadge.className = 'role-badge ' + u.role;
  }
  document.querySelectorAll('[data-require-role]').forEach((nav) => {
    const required = nav.dataset.requireRole;
    nav.style.display = (u && (u.role === required || u.role === 'admin')) ? '' : 'none';
  });
  document.querySelectorAll('[data-require-auth]').forEach((nav) => {
    nav.style.display = u ? '' : 'none';
  });
}

store.bus.on('auth', syncAuthUI);
store.bus.on('change', syncAuthUI);

// init
syncAuthUI();
navigate();
