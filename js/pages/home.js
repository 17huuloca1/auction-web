import { store } from '../store.js';
import { fmtVND, fmtCountdown, statusVN, categoryIcon, categoryVN, el } from '../utils.js';

let state = { filter: 'ALL', search: '', category: 'ALL' };
let _unsubs = [];
let _timer = null;

export function renderHome(container) {
  _cleanup();
  container.innerHTML = '';

  const auctions = store.allAuctions();
  const stats = computeStats(auctions);

  // Hero
  const hero = el('section', { class: 'hero' }, [
    el('div', {}, [
      el('h1', {}, 'Đấu giá trực tuyến minh bạch & realtime'),
      el('p', {}, 'Tham gia đặt giá, theo dõi biểu đồ giá theo thời gian thực, sử dụng Auto-Bid thông minh và cơ chế chống "bắn tỉa" giây cuối.'),
    ]),
    el('div', { class: 'hero-stats' }, [
      el('div', { class: 'hero-stat' }, [
        el('div', { class: 'num' }, String(stats.running)),
        el('div', { class: 'label' }, 'Đang diễn ra'),
      ]),
      el('div', { class: 'hero-stat' }, [
        el('div', { class: 'num' }, String(stats.open)),
        el('div', { class: 'label' }, 'Sắp mở'),
      ]),
      el('div', { class: 'hero-stat' }, [
        el('div', { class: 'num' }, String(stats.total)),
        el('div', { class: 'label' }, 'Tổng phiên'),
      ]),
    ]),
  ]);
  container.appendChild(hero);

  // Toolbar
  const head = el('div', { class: 'section-head' }, [
    el('div', {}, [
      el('h2', {}, 'Danh sách phiên đấu giá'),
      el('div', { class: 'subtitle' }, 'Nhấn vào một phiên để xem chi tiết và đặt giá'),
    ]),
    buildToolbar(),
  ]);
  container.appendChild(head);

  // Filter chips
  const chipRow = el('div', { class: 'chip-group mb-20' }, [
    chip('Tất cả', 'ALL', state.filter === 'ALL'),
    chip('Đang diễn ra', 'RUNNING', state.filter === 'RUNNING'),
    chip('Sắp mở', 'OPEN', state.filter === 'OPEN'),
    chip('Đã kết thúc', 'FINISHED', state.filter === 'FINISHED'),
    chip('Đã thanh toán', 'PAID', state.filter === 'PAID'),
    chip('Đã hủy', 'CANCELED', state.filter === 'CANCELED'),
  ]);
  container.appendChild(chipRow);

  // Grid
  const grid = el('div', { class: 'auction-grid', id: 'auctionGrid' });
  container.appendChild(grid);

  renderGrid(grid);

  // subscribe
  _unsubs.push(store.bus.on('change', () => renderGrid(grid)));
  _unsubs.push(store.bus.on('bid', () => renderGrid(grid)));
  _timer = setInterval(() => updateCountdowns(grid), 1000);

  container.appendChild(el('div', { class: 'footer-note' },
    'Mẹo: mở thêm 1 tab nữa và đăng nhập user khác để xem realtime sync giữa các tab.'
  ));
}

function computeStats(list) {
  return {
    total: list.length,
    running: list.filter((a) => a.status === 'RUNNING').length,
    open: list.filter((a) => a.status === 'OPEN').length,
  };
}

function chip(label, value, active) {
  const c = el('button', { class: 'chip' + (active ? ' active' : '') }, label);
  c.addEventListener('click', () => {
    state.filter = value;
    document.getElementById('app').replaceChildren();
    renderHome(document.getElementById('app'));
  });
  return c;
}

function buildToolbar() {
  const search = el('input', {
    type: 'text', placeholder: '🔎 Tìm theo tên sản phẩm...', value: state.search,
  });
  search.addEventListener('input', (e) => {
    state.search = e.target.value;
    const grid = document.getElementById('auctionGrid');
    if (grid) renderGrid(grid);
  });

  const sel = el('select', {});
  for (const [v, l] of [
    ['ALL', 'Tất cả loại'],
    ['Electronics', 'Đồ điện tử'],
    ['Art', 'Nghệ thuật'],
    ['Vehicle', 'Phương tiện'],
    ['Other', 'Khác'],
  ]) {
    const opt = el('option', { value: v }, l);
    if (state.category === v) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', (e) => {
    state.category = e.target.value;
    const grid = document.getElementById('auctionGrid');
    if (grid) renderGrid(grid);
  });

  return el('div', { class: 'toolbar' }, [search, sel]);
}

function renderGrid(grid) {
  grid.innerHTML = '';
  let list = store.allAuctions();
  if (state.filter !== 'ALL') list = list.filter((a) => a.status === state.filter);
  if (state.category !== 'ALL') list = list.filter((a) => a.category === state.category);
  if (state.search.trim()) {
    const s = state.search.trim().toLowerCase();
    list = list.filter((a) => a.name.toLowerCase().includes(s));
  }
  if (list.length === 0) {
    grid.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'icon' }, '🪙'),
      el('p', {}, 'Không có phiên đấu giá nào phù hợp.'),
    ]));
    return;
  }
  for (const a of list) grid.appendChild(card(a));
}

function card(a) {
  const seller = store.getUser(a.sellerId);
  const card = el('article', { class: 'auction-card', dataset: { id: a.id } });
  card.addEventListener('click', () => {
    location.hash = '#/auction/' + a.id;
  });

  const thumb = el('div', { class: 'thumb' });
  if (a.imageUrl) {
    const img = el('img', { src: a.imageUrl, alt: a.name, loading: 'lazy' });
    img.addEventListener('error', () => {
      img.remove();
      thumb.appendChild(el('div', { class: 'placeholder' }, categoryIcon(a.category)));
    });
    thumb.appendChild(img);
  } else {
    thumb.appendChild(el('div', { class: 'placeholder' }, categoryIcon(a.category)));
  }
  thumb.appendChild(el('div', { class: 'status-chip ' + a.status }, statusVN(a.status)));
  thumb.appendChild(el('div', { class: 'category-chip' }, categoryVN(a.category)));

  const remaining = a.endTime - Date.now();
  const body = el('div', { class: 'body' }, [
    el('div', { class: 'title' }, a.name),
    el('div', { class: 'meta' }, 'Người bán: ' + (seller?.fullname || 'Ẩn danh')),
    el('div', { class: 'price' }, fmtVND(a.currentBid)),
    el('div', {
      class: 'countdown' + (remaining < 5 * 60e3 && remaining > 0 ? ' urgent' : ''),
      dataset: { countdown: '1', endtime: String(a.endTime), starttime: String(a.startTime), status: a.status },
    }, countdownLabel(a)),
  ]);
  card.appendChild(thumb);
  card.appendChild(body);
  return card;
}

function countdownLabel(a) {
  const now = Date.now();
  if (a.status === 'CANCELED') return '❌ Phiên đã bị hủy';
  if (a.status === 'PAID') return '✅ Đã thanh toán';
  if (a.status === 'FINISHED') return 'Kết thúc lúc ' + new Date(a.endTime).toLocaleString('vi-VN');
  if (a.status === 'OPEN') return '⏳ Bắt đầu sau ' + fmtCountdown(a.startTime - now);
  return '⏱️ Còn ' + fmtCountdown(a.endTime - now);
}

function updateCountdowns(grid) {
  const els = grid.querySelectorAll('[data-countdown]');
  els.forEach((el) => {
    const status = el.dataset.status;
    const end = Number(el.dataset.endtime);
    const start = Number(el.dataset.starttime);
    const now = Date.now();
    let text;
    if (status === 'FINISHED' || status === 'CANCELED' || status === 'PAID') return;
    if (status === 'OPEN') {
      if (now >= start) { text = '⏱️ Còn ' + fmtCountdown(end - now); }
      else { text = '⏳ Bắt đầu sau ' + fmtCountdown(start - now); }
    } else {
      const rem = end - now;
      text = '⏱️ Còn ' + fmtCountdown(rem);
      el.classList.toggle('urgent', rem < 5 * 60e3 && rem > 0);
    }
    el.textContent = text;
  });
}

function _cleanup() {
  _unsubs.forEach((u) => u());
  _unsubs = [];
  if (_timer) { clearInterval(_timer); _timer = null; }
}
