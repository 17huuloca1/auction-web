import { api } from './api.js';
import { showToast } from './utils.js';

let currentUser = null;
const listeners = [];

export function getUser() { return currentUser; }
export function isLoggedIn() { return !!currentUser; }

export function onAuthChange(fn) {
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
}

function notify() { listeners.forEach(fn => fn(currentUser)); }

export async function initAuth() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const { user } = await api.auth.me();
    currentUser = user;
    notify();
  } catch {
    localStorage.removeItem('token');
  }
}

export async function login(email, password) {
  const { token, user } = await api.auth.login({ email, password });
  localStorage.setItem('token', token);
  currentUser = user;
  notify();
  return user;
}

export async function register(name, email, password, phone) {
  const { token, user } = await api.auth.register({ name, email, password, phone });
  localStorage.setItem('token', token);
  currentUser = user;
  notify();
  return user;
}

export async function loginWithGoogle(response) {
  const payload = JSON.parse(atob(response.credential.split('.')[1]));
  const { token, user } = await api.auth.google({
    name: payload.name,
    email: payload.email,
    google_id: payload.sub,
    avatar: payload.picture,
  });
  localStorage.setItem('token', token);
  currentUser = user;
  notify();
  showToast(`Chào mừng ${user.name}!`);
  closeAuthModal();
  return user;
}

export function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  notify();
  showToast('Đã đăng xuất', 'info');
  window.location.hash = '#/';
}

export function showAuthModal(mode = 'login') {
  const modal = document.getElementById('authModal');
  const content = document.getElementById('authModalContent');
  modal.classList.add('active');

  if (mode === 'login') {
    content.innerHTML = `
      <div class="modal-header">
        <h2>Đăng nhập</h2>
        <button class="modal-close" onclick="document.getElementById('authModal').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" placeholder="Nhập email" required />
          </div>
          <div class="form-group">
            <label>Mật khẩu</label>
            <input type="password" name="password" placeholder="Nhập mật khẩu" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Đăng nhập</button>
        </form>
        <div class="auth-divider"><span>hoặc</span></div>
        <div id="googleLoginBtn" class="google-btn-wrapper"></div>
        <p class="auth-switch">Chưa có tài khoản? <a href="#" id="switchToRegister">Đăng ký ngay</a></p>
        <div class="demo-accounts">
          <p><strong>Tài khoản demo:</strong></p>
          <p>Admin: admin@hatdieu.vn / admin123</p>
          <p>User: user@hatdieu.vn / 123456</p>
        </div>
      </div>
    `;
    setupLoginForm();
  } else {
    content.innerHTML = `
      <div class="modal-header">
        <h2>Đăng ký</h2>
        <button class="modal-close" onclick="document.getElementById('authModal').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        <form id="registerForm" class="auth-form">
          <div class="form-group">
            <label>Họ tên</label>
            <input type="text" name="name" placeholder="Nhập họ tên" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" placeholder="Nhập email" required />
          </div>
          <div class="form-group">
            <label>Số điện thoại</label>
            <input type="tel" name="phone" placeholder="Nhập số điện thoại" />
          </div>
          <div class="form-group">
            <label>Mật khẩu</label>
            <input type="password" name="password" placeholder="Tối thiểu 6 ký tự" required minlength="6" />
          </div>
          <div class="form-group">
            <label>Xác nhận mật khẩu</label>
            <input type="password" name="confirm_password" placeholder="Nhập lại mật khẩu" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Đăng ký</button>
        </form>
        <div class="auth-divider"><span>hoặc</span></div>
        <div id="googleLoginBtn" class="google-btn-wrapper"></div>
        <p class="auth-switch">Đã có tài khoản? <a href="#" id="switchToLogin">Đăng nhập</a></p>
      </div>
    `;
    setupRegisterForm();
  }

  setupGoogleButton();

  const switchToRegister = document.getElementById('switchToRegister');
  const switchToLogin = document.getElementById('switchToLogin');
  if (switchToRegister) switchToRegister.addEventListener('click', (e) => { e.preventDefault(); showAuthModal('register'); });
  if (switchToLogin) switchToLogin.addEventListener('click', (e) => { e.preventDefault(); showAuthModal('login'); });
}

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;
    try {
      const user = await login(email, password);
      showToast(`Chào mừng ${user.name}!`);
      closeAuthModal();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.name.value;
    const email = form.email.value;
    const phone = form.phone.value;
    const password = form.password.value;
    const confirm = form.confirm_password.value;
    if (password !== confirm) {
      showToast('Mật khẩu không khớp', 'error');
      return;
    }
    try {
      const user = await register(name, email, password, phone);
      showToast(`Chào mừng ${user.name}! Đăng ký thành công.`);
      closeAuthModal();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function setupGoogleButton() {
  try {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        callback: loginWithGoogle,
      });
      const container = document.getElementById('googleLoginBtn');
      if (container) {
        window.google.accounts.id.renderButton(container, {
          theme: 'outline', size: 'large', width: '100%', text: 'continue_with',
        });
      }
    }
  } catch {
    // Google SDK not loaded
  }
}

export function closeAuthModal() {
  document.getElementById('authModal').classList.remove('active');
}
