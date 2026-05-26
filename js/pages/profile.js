// ====================================================================
//  pages/profile.js — Trang hồ sơ cá nhân
// --------------------------------------------------------------------
//  Hiển thị thông tin tài khoản đăng nhập + thống kê hoạt động:
//   • Tổng số lượt bid đã đặt.
//   • Số phiên đấu giá đang dẫn đầu.
//   • Số phiên đã thắng.
//  (Thông tin chi tiết hơn — đổi mật khẩu, lịch sử giao dịch, nạp tiền —
//   chuyển sang trang /settings.)
// ====================================================================

import { store } from '../store.js';
import { fmtVND, fmtDate, statusVN, el } from '../utils.js';

let _unsubs = [];

export function renderProfile(container) {
  _cleanup();
  container.innerHTML = '';

  const me = store.currentUser();
  if (!me) {
    container.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'icon' }, '🔒'),
      el('p', {}, 'Vui lòng đăng nhập để xem hồ sơ.'),
    ]));
    return;
  }

  container.appendChild(el('div', { class: 'section-head' }, [
    el('div', {}, [
      el('h2', {}, '👤 Hồ sơ của ' + me.fullname),
      el('div', { class: 'subtitle' }, 'Vai trò: ' + me.role + ' · Tên đăng nhập: ' + me.username),
    ]),
  ]));

  renderContent(container);
  _unsubs.push(store.bus.on('change', () => { container.innerHTML = ''; renderProfile(container); }));
  _unsubs.push(store.bus.on('bid', () => { container.innerHTML = ''; renderProfile(container); }));
}

function renderContent(container) {
  const me = store.currentUser();
  const bids = store.bidsByBidder(me.id);
  const auctionIds = [...new Set(bids.map((b) => b.auctionId))];
  const participating = auctionIds.map((id) => store.getAuction(id)).filter(Boolean);
  const wins = participating.filter((a) => (a.winnerId || a.currentBidderId) === me.id && (a.status === 'FINISHED' || a.status === 'PAID'));
  const ownAuctions = store.auctionsBySeller(me.id);

  const stats = el('div', { class: 'stats-row' }, [
    el('div', { class: 'stat-card' }, [el('div', { class: 'label' }, 'Số phiên tham gia'), el('div', { class: 'num' }, String(participating.length))]),
    el('div', { class: 'stat-card' }, [el('div', { class: 'label' }, 'Tổng số lượt đặt giá'), el('div', { class: 'num' }, String(bids.length))]),
    el('div', { class: 'stat-card' }, [el('div', { class: 'label' }, '🏆 Phiên đã thắng'), el('div', { class: 'num' }, String(wins.length))]),
    el('div', { class: 'stat-card' }, [el('div', { class: 'label' }, 'Phiên đăng bán'), el('div', { class: 'num' }, String(ownAuctions.length))]),
  ]);
  container.appendChild(stats);

  // History
  container.appendChild(el('div', { class: 'section-block' }, [
    el('h3', {}, '📜 Lịch sử đặt giá gần đây'),
    bids.length === 0
      ? el('div', { class: 'empty' }, el('p', {}, 'Bạn chưa đặt giá lần nào.'))
      : buildBidsTable(bids.slice(0, 20)),
  ]));

  // Wins
  if (wins.length > 0) {
    container.appendChild(el('div', { class: 'section-block' }, [
      el('h3', {}, '🎉 Phiên đã thắng'),
      buildAuctionsList(wins),
    ]));
  }

  // Own auctions if seller
  if (me.role === 'seller' && ownAuctions.length > 0) {
    container.appendChild(el('div', { class: 'section-block' }, [
      el('h3', {}, '🏷️ Phiên bạn đang bán'),
      buildAuctionsList(ownAuctions),
    ]));
  }
}

function buildBidsTable(bids) {
  const t = el('table', { class: 'data-table' });
  t.appendChild(el('thead', {}, [
    el('tr', {}, [
      el('th', {}, 'Sản phẩm'),
      el('th', {}, 'Số tiền'),
      el('th', {}, 'Thời điểm'),
      el('th', {}, 'Loại'),
    ]),
  ]));
  const tb = el('tbody', {});
  for (const b of bids) {
    const a = store.getAuction(b.auctionId);
    const tr = el('tr', {});
    const td0 = el('td', {});
    const link = el('a', { href: '#/auction/' + b.auctionId, style: 'color:var(--color-primary);font-weight:600;' }, a?.name || b.auctionId);
    td0.appendChild(link);
    tr.appendChild(td0);
    tr.appendChild(el('td', {}, fmtVND(b.amount)));
    tr.appendChild(el('td', { style: 'font-size:13px;' }, fmtDate(b.ts)));
    tr.appendChild(el('td', {}, b.isAuto ? '🤖 Auto-Bid' : '✍️ Thủ công'));
    tb.appendChild(tr);
  }
  t.appendChild(tb);
  return t;
}

function buildAuctionsList(list) {
  const ul = el('ul', { style: 'padding:0;list-style:none;margin:0;' });
  for (const a of list) {
    const li = el('li', { style: 'padding:10px 4px;border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center;gap:12px;' }, [
      el('div', {}, [
        el('a', { href: '#/auction/' + a.id, style: 'font-weight:600;color:var(--color-text);' }, a.name),
        el('div', { style: 'font-size:12px;color:var(--color-text-muted);' }, fmtDate(a.endTime)),
      ]),
      el('div', { style: 'display:flex;gap:8px;align-items:center;' }, [
        el('span', { class: 'status-chip ' + a.status, style: 'position:relative;' }, statusVN(a.status)),
        el('strong', { style: 'color:var(--color-primary);' }, fmtVND(a.currentBid)),
      ]),
    ]);
    ul.appendChild(li);
  }
  return ul;
}

function _cleanup() {
  _unsubs.forEach((u) => u());
  _unsubs = [];
}
