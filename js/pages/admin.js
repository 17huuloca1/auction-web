// ====================================================================
//  pages/admin.js — Bảng điều khiển dành cho Quản trị viên (Admin)
// --------------------------------------------------------------------
//  Yêu cầu 3.1.1 ("Admin: Quản trị và điều hành toàn bộ hệ thống").
//  Cho phép:
//   • Xem thống kê tổng quan: số user, số phiên đấu giá, tổng lượt bid.
//   • Quản lý người dùng: xem danh sách, xóa user (trừ chính mình).
//   • Giám sát mọi phiên đấu giá: trạng thái, người dẫn đầu, giá hiện tại.
//   • Hủy phiên đấu giá bất thường (đáp ứng 3.1.5).
// ====================================================================

import { store } from '../store.js';
import {
  fmtVND, fmtDate, statusVN, categoryVN, categoryIcon, el, toast,
} from '../utils.js';

let _unsubs = [];

export function renderAdmin(container) {
  _cleanup();
  container.innerHTML = '';

  const me = store.currentUser();
  if (!me || me.role !== 'admin') {
    container.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'icon' }, '🔒'),
      el('p', {}, 'Trang này chỉ dành cho Admin.'),
    ]));
    return;
  }

  container.appendChild(el('div', { class: 'section-head' }, [
    el('div', {}, [
      el('h2', {}, '🛡️ Bảng điều khiển quản trị'),
      el('div', { class: 'subtitle' }, 'Quản lý người dùng và toàn bộ phiên đấu giá trong hệ thống'),
    ]),
    el('div', { class: 'btn-row' }, (() => {
      const reset = el('button', { class: 'btn-danger' }, '⚠️ Reset dữ liệu mẫu');
      reset.addEventListener('click', () => {
        if (confirm('Reset toàn bộ dữ liệu về trạng thái ban đầu? Mọi giao dịch sẽ mất.')) {
          store.reset();
          toast('success', 'Đã reset dữ liệu');
        }
      });
      return [reset];
    })()),
  ]));

  // Stats
  const stats = el('div', { class: 'stats-row', id: 'adminStats' });
  container.appendChild(stats);

  // Users
  const usersBlock = el('div', { class: 'section-block' }, [
    el('h3', {}, '👥 Người dùng (' + store.allUsers().length + ')'),
    el('div', { id: 'usersTableWrap' }),
  ]);
  container.appendChild(usersBlock);

  // Auctions
  const auctionsBlock = el('div', { class: 'section-block' }, [
    el('h3', {}, '🏷️ Phiên đấu giá'),
    el('div', { id: 'adminAuctionsWrap' }),
  ]);
  container.appendChild(auctionsBlock);

  renderAll();
  _unsubs.push(store.bus.on('change', renderAll));
  _unsubs.push(store.bus.on('bid', renderAll));
}

function renderAll() {
  renderStats();
  renderUsersTable();
  renderAuctionsTable();
}

function renderStats() {
  const wrap = document.getElementById('adminStats');
  if (!wrap) return;
  wrap.innerHTML = '';
  const auctions = store.allAuctions();
  const totalBids = store.bidsByAuction ? store.bids?.length || 0 : 0;
  // store.bids is private but we can compute via auctions
  let bidCount = 0;
  for (const a of auctions) bidCount += store.bidsByAuction(a.id).length;

  const cards = [
    { label: 'Tổng người dùng', num: store.allUsers().length },
    { label: 'Người mua', num: store.allUsers().filter((u) => u.role === 'bidder').length },
    { label: 'Người bán', num: store.allUsers().filter((u) => u.role === 'seller').length },
    { label: 'Phiên đấu giá', num: auctions.length },
    { label: 'Tổng lượt bid', num: bidCount },
    { label: 'Đang diễn ra', num: auctions.filter((a) => a.status === 'RUNNING').length },
  ];
  for (const c of cards) {
    wrap.appendChild(el('div', { class: 'stat-card' }, [
      el('div', { class: 'label' }, c.label),
      el('div', { class: 'num' }, String(c.num)),
    ]));
  }
}

function renderUsersTable() {
  const wrap = document.getElementById('usersTableWrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const me = store.currentUser();
  const users = store.allUsers();
  const table = el('table', { class: 'data-table' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', {}, 'Tên đăng nhập'),
        el('th', {}, 'Họ tên'),
        el('th', {}, 'Vai trò'),
        el('th', {}, 'Ngày tạo'),
        el('th', {}, 'Thao tác'),
      ]),
    ]),
  ]);
  const tbody = el('tbody', {});
  table.appendChild(tbody);

  for (const u of users) {
    const tr = el('tr', {}, [
      el('td', {}, [el('code', { style: 'background:var(--color-surface-2);padding:2px 6px;border-radius:4px;' }, u.username)]),
      el('td', {}, u.fullname),
      el('td', {}, el('span', { class: 'role-badge ' + u.role }, u.role)),
      el('td', { style: 'font-size:13px;' }, fmtDate(u.createdAt)),
    ]);
    const actions = el('td', { class: 'actions' });
    if (u.id !== me.id) {
      const del = el('button', { class: 'btn-danger' }, 'Xóa');
      del.addEventListener('click', () => {
        if (!confirm('Xóa người dùng "' + u.username + '"?')) return;
        try { store.removeUser(u.id); toast('success', 'Đã xóa người dùng'); }
        catch (e) { toast('error', 'Lỗi', e.message); }
      });
      actions.appendChild(del);
    } else {
      actions.appendChild(el('span', { class: 'text-muted' }, '— Bạn —'));
    }
    tr.appendChild(actions);
    tbody.appendChild(tr);
  }
  wrap.appendChild(table);
}

function renderAuctionsTable() {
  const wrap = document.getElementById('adminAuctionsWrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const auctions = store.allAuctions();
  const table = el('table', { class: 'data-table' });
  table.appendChild(el('thead', {}, [
    el('tr', {}, [
      el('th', {}, 'Sản phẩm'),
      el('th', {}, 'Người bán'),
      el('th', {}, 'Giá hiện tại'),
      el('th', {}, 'Trạng thái'),
      el('th', {}, 'Kết thúc'),
      el('th', {}, 'Thao tác'),
    ]),
  ]));
  const tbody = el('tbody', {});
  table.appendChild(tbody);

  for (const a of auctions) {
    const seller = store.getUser(a.sellerId);
    const tr = el('tr', {}, [
      el('td', {}, [
        el('div', { style: 'font-weight:600;' }, a.name),
        el('div', { style: 'font-size:12px;color:var(--color-text-muted);' }, categoryIcon(a.category) + ' ' + categoryVN(a.category)),
      ]),
      el('td', {}, seller?.fullname || '—'),
      el('td', {}, fmtVND(a.currentBid)),
      el('td', {}, el('span', { class: 'status-chip ' + a.status, style: 'position:relative;' }, statusVN(a.status))),
      el('td', { style: 'font-size:13px;' }, fmtDate(a.endTime)),
    ]);
    const actions = el('td', { class: 'actions' });
    const view = el('button', { class: 'btn-ghost' }, 'Xem');
    view.addEventListener('click', () => { location.hash = '#/auction/' + a.id; });
    actions.appendChild(view);
    if (a.status === 'OPEN' || a.status === 'RUNNING') {
      const cancel = el('button', { class: 'btn-danger' }, 'Hủy');
      cancel.addEventListener('click', () => {
        if (!confirm('Hủy phiên "' + a.name + '"?')) return;
        store.cancelAuction(a.id);
        toast('warning', 'Đã hủy phiên');
      });
      actions.appendChild(cancel);
    }
    tr.appendChild(actions);
    tbody.appendChild(tr);
  }
  wrap.appendChild(table);
}

function _cleanup() {
  _unsubs.forEach((u) => u());
  _unsubs = [];
}
