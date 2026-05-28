export function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
  toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function renderStars(rating) {
  let html = '';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  for (let i = 0; i < full; i++) html += '<i class="fas fa-star"></i>';
  if (half) html += '<i class="fas fa-star-half-alt"></i>';
  const empty = 5 - full - (half ? 1 : 0);
  for (let i = 0; i < empty; i++) html += '<i class="far fa-star"></i>';
  return html;
}

export function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function getStatusText(status) {
  const map = {
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận',
    shipping: 'Đang giao hàng',
    delivered: 'Đã giao',
    canceled: 'Đã hủy',
  };
  return map[status] || status;
}

export function getStatusClass(status) {
  const map = {
    pending: 'status-pending',
    confirmed: 'status-confirmed',
    shipping: 'status-shipping',
    delivered: 'status-delivered',
    canceled: 'status-canceled',
  };
  return map[status] || '';
}

export function getPaymentMethodText(method) {
  const map = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank: 'Chuyển khoản ngân hàng',
    momo: 'Ví MoMo',
    zalopay: 'ZaloPay',
  };
  return map[method] || method;
}

export function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}
