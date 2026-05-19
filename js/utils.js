// Util helpers
export const fmtVND = (n) =>
  (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

export const fmtDate = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString('vi-VN', { hour12: false });
};

export const fmtDateInput = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fmtCountdown = (ms) => {
  if (ms <= 0) return 'Đã kết thúc';
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (days > 0) return `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
};

export const statusVN = (s) => ({
  OPEN: 'Sắp mở',
  RUNNING: 'Đang diễn ra',
  FINISHED: 'Đã kết thúc',
  PAID: 'Đã thanh toán',
  CANCELED: 'Đã hủy',
}[s] || s);

export const categoryVN = (s) => ({
  Electronics: 'Đồ điện tử',
  Art: 'Nghệ thuật',
  Vehicle: 'Phương tiện',
  Other: 'Khác',
}[s] || s);

export const categoryIcon = (s) => ({
  Electronics: '📱',
  Art: '🎨',
  Vehicle: '🚗',
  Other: '📦',
}[s] || '📦');

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (v === true) node.setAttribute(k, '');
    else if (v === false || v === null || v === undefined) continue;
    else node.setAttribute(k, v);
  }
  if (!Array.isArray(children)) children = [children];
  for (const c of children) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

let toastTimer = null;
export function toast(type, title, msg) {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = el('div', { class: 'toast ' + (type || '') }, [
    el('div', { class: 'title' }, title),
    msg ? el('div', { class: 'msg' }, msg) : null,
  ]);
  c.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s, transform .3s';
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    setTimeout(() => t.remove(), 320);
  }, 3500);
}

export function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.hidden = false;
}
export function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.hidden = true;
}
