// ====================================================================
//  pages/detail.js — Trang chi tiết 1 phiên đấu giá (realtime bidding)
// --------------------------------------------------------------------
//  Đáp ứng các yêu cầu:
//   • 3.1.3 Tham gia đấu giá: form đặt giá, validate, cập nhật leader.
//   • 3.1.6 GUI: màn hình đấu giá realtime (đồng hồ đếm ngược + giá nhảy).
//   • 3.2.1 Auto-Bid: modal cấu hình maxBid + increment, hiển thị badge.
//   • 3.2.3 Anti-Sniping: countdown nhảy lên khi có bid giây cuối.
//   • 3.2.4 Realtime Observer: subscribe store.bus + BroadcastChannel.
//   • 3.2.5 Bid History Visualization: biểu đồ giá Chart.js (xem cuối file).
//  Cleanup: _cleanup() gỡ tất cả listener + timer + chart khi rời trang
//  để tránh memory leak / chồng event handler.
// ====================================================================

import { store } from '../store.js';
import {
  fmtVND, fmtDate, fmtCountdown, statusVN, categoryVN, categoryIcon,
  el, openModal, closeModal, toast,
} from '../utils.js';

// State của trang — module-level để các hàm renderXxx có thể tái sử dụng.
let _unsubs = [];          // danh sách hàm hủy đăng ký listener
let _timer = null;         // setInterval cho countdown
let _chart = null;         // instance Chart.js (tái sử dụng để tránh nháy)
let _currentAuctionId = null;

export function renderDetail(container, id) {
  _cleanup();
  _currentAuctionId = id;
  container.innerHTML = '';

  const a = store.getAuction(id);
  if (!a) {
    container.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'icon' }, '❓'),
      el('p', {}, 'Không tìm thấy phiên đấu giá.'),
    ]));
    return;
  }

  const seller = store.getUser(a.sellerId);
  const me = store.currentUser();

  // === HEADER: back button + breadcrumb ===
  const back = el('button', { class: 'btn-ghost mb-12' }, '← Quay lại danh sách');
  back.addEventListener('click', () => { location.hash = '#/'; });
  container.appendChild(back);

  // === TOP GRID ===
  const grid = el('div', { class: 'detail-grid' });
  container.appendChild(grid);

  // Image
  const imgBox = el('div', { class: 'detail-image' });
  if (a.imageUrl) {
    const img = el('img', { src: a.imageUrl, alt: a.name });
    img.addEventListener('error', () => {
      img.remove();
      imgBox.appendChild(el('div', { class: 'placeholder' }, categoryIcon(a.category)));
    });
    imgBox.appendChild(img);
  } else {
    imgBox.appendChild(el('div', { class: 'placeholder' }, categoryIcon(a.category)));
  }
  grid.appendChild(imgBox);

  // Right panel
  const right = el('div', { class: 'detail-card' });
  grid.appendChild(right);

  right.appendChild(el('div', { class: 'status-chip ' + a.status, style: 'position:relative;display:inline-block;margin-bottom:8px;' }, statusVN(a.status)));
  right.appendChild(el('h1', {}, a.name));
  right.appendChild(el('div', { class: 'desc' }, a.description));

  right.appendChild(el('div', { class: 'kv' }, [
    el('div', { class: 'k' }, 'Loại sản phẩm'), el('div', { class: 'v' }, categoryIcon(a.category) + ' ' + categoryVN(a.category)),
    el('div', { class: 'k' }, 'Người bán'),     el('div', { class: 'v' }, seller?.fullname || 'Ẩn danh'),
    el('div', { class: 'k' }, 'Giá khởi điểm'),  el('div', { class: 'v' }, fmtVND(a.startingPrice)),
    el('div', { class: 'k' }, 'Bước giá tối thiểu'), el('div', { class: 'v' }, fmtVND(a.minIncrement)),
    el('div', { class: 'k' }, 'Bắt đầu'),         el('div', { class: 'v' }, fmtDate(a.startTime)),
    el('div', { class: 'k' }, 'Kết thúc dự kiến'), el('div', { class: 'v' }, fmtDate(a.endTime)),
  ]));

  // Current price block
  const leaderName = a.currentBidderId ? (store.getUser(a.currentBidderId)?.fullname || 'Ẩn danh') : 'Chưa có ai đặt giá';
  const priceBlock = el('div', { class: 'price-block' }, [
    el('div', { class: 'label' }, 'Giá hiện tại cao nhất'),
    el('div', { class: 'value', id: 'currentPrice' }, fmtVND(a.currentBid)),
    el('div', { class: 'leader' }, [
      '👑 Người dẫn đầu: ',
      el('strong', { id: 'leaderName' }, leaderName),
    ]),
  ]);
  right.appendChild(priceBlock);

  // Countdown
  const cdBox = el('div', { class: 'countdown-box', id: 'countdownBox' }, [
    el('div', { class: 'clock', id: 'countdownClock' }, '...'),
    el('div', { class: 'hint', id: 'countdownHint' }, ''),
  ]);
  right.appendChild(cdBox);

  // Action buttons
  const actions = el('div', { class: 'btn-row', id: 'detailActions' });
  right.appendChild(actions);

  // === LOWER GRID: chart + history ===
  const lower = el('div', { class: 'lower-grid' });
  container.appendChild(lower);

  const chartCard = el('div', { class: 'chart-card' }, [
    el('h3', {}, '📈 Biểu đồ giá đấu theo thời gian'),
    el('div', { class: 'chart-wrap' }, [
      el('canvas', { id: 'priceChart' }),
    ]),
  ]);
  lower.appendChild(chartCard);

  const historyCard = el('div', { class: 'history-card' }, [
    el('h3', {}, '📜 Lịch sử đặt giá'),
    el('ul', { class: 'history-list', id: 'historyList' }),
  ]);
  lower.appendChild(historyCard);

  // Subscriptions
  refreshAll();
  _timer = setInterval(updateCountdown, 1000);
  _unsubs.push(store.bus.on('bid', (p) => {
    if (p.auctionId === id) refreshAll();
  }));
  _unsubs.push(store.bus.on('change', () => refreshAll()));
  _unsubs.push(store.bus.on('auth', () => refreshAll()));
}

function refreshAll() {
  const a = store.getAuction(_currentAuctionId);
  if (!a) return;

  // price + leader
  const priceEl = document.getElementById('currentPrice');
  if (priceEl) priceEl.textContent = fmtVND(a.currentBid);
  const leaderEl = document.getElementById('leaderName');
  if (leaderEl) {
    leaderEl.textContent = a.currentBidderId
      ? (store.getUser(a.currentBidderId)?.fullname || 'Ẩn danh')
      : 'Chưa có ai đặt giá';
  }
  updateCountdown();
  renderActions();
  renderHistory();
  renderChart();
}

function updateCountdown() {
  const a = store.getAuction(_currentAuctionId);
  if (!a) return;
  const clock = document.getElementById('countdownClock');
  const hint = document.getElementById('countdownHint');
  const box = document.getElementById('countdownBox');
  if (!clock || !hint || !box) return;
  const now = Date.now();

  if (a.status === 'OPEN') {
    if (now < a.startTime) {
      clock.textContent = fmtCountdown(a.startTime - now);
      hint.textContent = '⏳ Phiên sẽ mở sau';
      box.classList.remove('urgent');
      return;
    }
  }
  if (a.status === 'CANCELED') {
    clock.textContent = '❌'; hint.textContent = 'Phiên đã bị hủy'; box.classList.remove('urgent');
    return;
  }
  if (a.status === 'PAID' || a.status === 'FINISHED') {
    clock.textContent = '🏁'; hint.textContent = 'Phiên đã kết thúc lúc ' + fmtDate(a.endTime); box.classList.remove('urgent');
    return;
  }

  const rem = a.endTime - now;
  clock.textContent = fmtCountdown(rem);
  hint.textContent = rem > 0 ? '⏱️ Thời gian còn lại' : 'Đã kết thúc';
  box.classList.toggle('urgent', rem < 60e3 && rem > 0);
}

function renderActions() {
  const a = store.getAuction(_currentAuctionId);
  const me = store.currentUser();
  const wrap = document.getElementById('detailActions');
  if (!wrap || !a) return;
  wrap.innerHTML = '';

  const isRunning = a.status === 'RUNNING';
  const isOpen = a.status === 'OPEN';
  const canBid = isRunning && me?.role === 'bidder' && me.id !== a.sellerId && me.id !== a.currentBidderId;
  const isOwner = me && me.id === a.sellerId;
  const isAdmin = me?.role === 'admin';

  if (!me) {
    wrap.appendChild(el('p', { class: 'text-muted', style: 'margin:0;' }, '👉 Đăng nhập với vai trò Bidder để tham gia đấu giá'));
    return;
  }

  if (me.role === 'bidder' && (isOpen || isRunning)) {
    const cfg = store.autoBidConfig(a.id, me.id);
    const bidBtn = el('button', { class: 'btn-primary' }, '💸 Đặt giá ngay');
    bidBtn.disabled = !canBid;
    bidBtn.addEventListener('click', () => openBidModal(a));
    wrap.appendChild(bidBtn);

    const autoBtn = el('button', { class: 'btn-ghost' }, cfg ? '⚙️ Sửa Auto-Bid' : '🤖 Bật Auto-Bid');
    autoBtn.addEventListener('click', () => openAutoBidModal(a, cfg));
    wrap.appendChild(autoBtn);

    if (cfg) {
      const off = el('button', { class: 'btn-ghost' }, '⏹️ Tắt Auto-Bid');
      off.addEventListener('click', () => {
        store.disableAutoBid({ auctionId: a.id, bidderId: me.id });
        toast('success', 'Đã tắt Auto-Bid');
      });
      wrap.appendChild(off);
    }
  }

  if (!isRunning && a.status === 'FINISHED' && me.id === a.winnerId) {
    wrap.appendChild(el('div', { class: 'price-block', style: 'margin:0;width:100%;' }, [
      el('div', { class: 'label' }, '🎉 Chúc mừng! Bạn là người thắng cuộc'),
      el('div', { class: 'leader' }, 'Hãy liên hệ người bán để hoàn tất thanh toán.'),
    ]));
  }

  if (isOwner || isAdmin) {
    if (a.status === 'OPEN' || a.status === 'RUNNING') {
      const cancel = el('button', { class: 'btn-danger' }, '🛑 Hủy phiên');
      cancel.addEventListener('click', () => {
        if (confirm('Bạn chắc chắn muốn hủy phiên đấu giá này?')) {
          store.cancelAuction(a.id);
          toast('warning', 'Đã hủy phiên đấu giá');
        }
      });
      wrap.appendChild(cancel);
    } else if (a.status === 'FINISHED' && a.winnerId) {
      const pay = el('button', { class: 'btn-success' }, '💰 Đánh dấu đã thanh toán');
      pay.addEventListener('click', () => {
        try {
          store.markPaid(a.id);
          toast('success', 'Đã đánh dấu thanh toán');
        } catch (e) { toast('error', 'Lỗi', e.message); }
      });
      wrap.appendChild(pay);
    }
  }

  if (!canBid && isRunning && me.role === 'bidder' && me.id === a.currentBidderId) {
    wrap.appendChild(el('p', { class: 'text-muted', style: 'margin:0;width:100%;' }, '👑 Bạn đang dẫn đầu phiên này.'));
  }
}

function openBidModal(a) {
  document.getElementById('bidModalCurrent').textContent = fmtVND(a.currentBid);
  document.getElementById('bidModalMin').textContent = fmtVND(a.currentBid + a.minIncrement);
  const form = document.getElementById('bidForm');
  form.amount.value = a.currentBid + a.minIncrement;
  form.amount.min = a.currentBid + a.minIncrement;
  form.onsubmit = (e) => {
    e.preventDefault();
    const amount = Number(form.amount.value);
    const me = store.currentUser();
    const res = store.placeBid({ auctionId: a.id, bidderId: me.id, amount, isAuto: false });
    if (!res.ok) { toast('error', 'Đặt giá thất bại', res.error); return; }
    toast('success', 'Đặt giá thành công', fmtVND(amount));
    closeModal('bidModal');
  };
  openModal('bidModal');
}

function openAutoBidModal(a, cfg) {
  const form = document.getElementById('autoBidForm');
  form.maxBid.value = cfg?.maxBid || (a.currentBid + a.minIncrement * 10);
  form.increment.value = cfg?.increment || a.minIncrement;
  form.onsubmit = (e) => {
    e.preventDefault();
    const me = store.currentUser();
    const maxBid = Number(form.maxBid.value);
    const increment = Number(form.increment.value);
    if (maxBid <= a.currentBid) {
      toast('error', 'Cấu hình không hợp lệ', 'maxBid phải lớn hơn giá hiện tại');
      return;
    }
    if (increment < 1000) {
      toast('error', 'Cấu hình không hợp lệ', 'Bước nhảy quá nhỏ');
      return;
    }
    store.enableAutoBid({ auctionId: a.id, bidderId: me.id, maxBid, increment });
    toast('success', 'Bật Auto-Bid thành công', `Tối đa ${fmtVND(maxBid)}, bước ${fmtVND(increment)}`);
    closeModal('autoBidModal');
  };
  openModal('autoBidModal');
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;
  list.innerHTML = '';
  const bids = store.bidsByAuction(_currentAuctionId).slice().reverse();
  if (bids.length === 0) {
    list.appendChild(el('li', { style: 'justify-content:center;color:var(--color-text-muted);' }, 'Chưa có lượt đặt giá nào'));
    return;
  }
  for (const b of bids) {
    const u = store.getUser(b.bidderId);
    const li = el('li', {}, [
      el('div', {}, [
        el('span', { class: 'bidder' }, u?.fullname || 'Ẩn danh'),
        b.isAuto ? el('span', { class: 'auto-tag' }, 'AUTO') : null,
        el('div', { class: 'ts' }, fmtDate(b.ts)),
      ]),
      el('span', { class: 'amount' }, fmtVND(b.amount)),
    ]);
    list.appendChild(li);
  }
}

// ====================================================================
//  BIỂU ĐỒ GIÁ ĐẤU THEO THỜI GIAN — Yêu cầu 3.2.5 (Realtime Price Curve)
// --------------------------------------------------------------------
//  Mục tiêu:
//   • Vẽ đường giá đấu cao nhất theo timeline.
//   • Cập nhật MƯỢT khi có bid mới mà KHÔNG cần refresh trang.
//   • Trục X = thời gian (timestamp), Trục Y = mức giá hiện tại.
//  Kỹ thuật:
//   • Chart.js v4.4 + adapter date-fns cho trục thời gian.
//   • Bezier monotone (tension 0.42) → đường cong tự nhiên, không gãy.
//   • Gradient nền canvas (đậm → trong suốt) để nhấn mạnh xu hướng tăng.
//   • Tooltip Việt hoá đẹp ("🕒 ngày giờ" + "💰 số tiền").
//   • Tick trục Y format VN: "25 tr", "1 tỷ", "500k".
// ====================================================================

/** Tạo gradient dọc (xanh đậm trên đỉnh → trong suốt phía dưới). */
function _buildChartGradient(ctx, height) {
  const g = ctx.createLinearGradient(0, 0, 0, height || 280);
  g.addColorStop(0, 'rgba(37, 99, 235, 0.32)');     // đỉnh: xanh đậm
  g.addColorStop(0.55, 'rgba(37, 99, 235, 0.10)');  // giữa: xanh nhạt
  g.addColorStop(1, 'rgba(37, 99, 235, 0.00)');     // đáy: trong suốt
  return g;
}

/**
 * renderChart — vẽ hoặc cập nhật biểu đồ giá.
 * - Mảng points luôn bắt đầu bằng (startTime, startingPrice) để đường giá
 *   khởi đầu từ giá khởi điểm thay vì bid đầu tiên.
 * - Nếu phiên RUNNING, thêm 1 điểm "hiện tại" để đường được kéo tới NOW.
 * - Cùng instance _chart được tái sử dụng — chỉ cập nhật data + gradient
 *   tránh tạo lại biểu đồ gây nháy màn hình.
 */
function renderChart() {
  const cnv = document.getElementById('priceChart');
  if (!cnv) return;
  const a = store.getAuction(_currentAuctionId);
  const bids = store.bidsByAuction(_currentAuctionId);

  const points = [];
  points.push({ x: a.startTime, y: a.startingPrice });
  for (const b of bids) points.push({ x: b.ts, y: b.amount });
  if (a.status === 'RUNNING' && (points.at(-1).x < Date.now())) {
    points.push({ x: Date.now(), y: a.currentBid });
  }

  const ctx = cnv.getContext('2d');
  const h = cnv.parentElement?.clientHeight || 280;

  const dataset = {
    label: 'Giá đấu (₫)',
    data: points,
    borderColor: '#2563eb',
    backgroundColor: _buildChartGradient(ctx, h),
    fill: true,
    tension: 0.42,
    cubicInterpolationMode: 'monotone',
    borderWidth: 3,
    pointRadius: 0,
    pointHoverRadius: 7,
    pointHoverBackgroundColor: '#ffffff',
    pointHoverBorderColor: '#2563eb',
    pointHoverBorderWidth: 3,
    borderJoinStyle: 'round',
    borderCapStyle: 'round',
  };

  if (_chart) {
    _chart.data.datasets[0].data = points;
    _chart.data.datasets[0].backgroundColor = _buildChartGradient(ctx, h);
    _chart.update('none');
    return;
  }

  _chart = new Chart(ctx, {
    type: 'line',
    data: { datasets: [dataset] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutCubic' },
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 8, right: 8, bottom: 0, left: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.96)',
          titleColor: '#f9fafb',
          bodyColor: '#e5e7eb',
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          titleFont: { family: 'Be Vietnam Pro', weight: '600', size: 13 },
          bodyFont: { family: 'Be Vietnam Pro', weight: '700', size: 16 },
          callbacks: {
            title: (items) => '🕒 ' + fmtDate(items[0].parsed.x),
            label: (item) => '💰 ' + fmtVND(item.parsed.y),
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'minute',
            tooltipFormat: 'dd/MM HH:mm:ss',
            displayFormats: { second: 'HH:mm:ss', minute: 'HH:mm', hour: 'HH:mm', day: 'dd/MM' },
          },
          adapters: { date: {} },
          border: { display: false },
          grid: { display: false, drawTicks: false },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Be Vietnam Pro', size: 11 },
            maxTicksLimit: 6,
            padding: 6,
          },
        },
        y: {
          beginAtZero: false,
          border: { display: false },
          grid: {
            color: 'rgba(148, 163, 184, 0.15)',
            drawTicks: false,
            tickLength: 0,
          },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Be Vietnam Pro', size: 11 },
            maxTicksLimit: 5,
            padding: 10,
            callback: (v) => {
              const n = Number(v);
              if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
              if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' tr';
              if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
              return n.toLocaleString('vi-VN');
            },
          },
        },
      },
    },
  });
}

function _cleanup() {
  _unsubs.forEach((u) => u());
  _unsubs = [];
  if (_timer) { clearInterval(_timer); _timer = null; }
  if (_chart) { _chart.destroy(); _chart = null; }
  _currentAuctionId = null;
}
