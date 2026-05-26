// ====================================================================
//  pages/seller.js — Trang quản lý sản phẩm cho Seller (3.1.2 + 3.1.6)
// --------------------------------------------------------------------
//  Cho phép Seller (người bán):
//   • Xem danh sách các phiên đấu giá của chính mình.
//   • Thêm / sửa / xóa phiên đấu giá (CRUD theo yêu cầu 3.1.2).
//   • Đặt giá khởi điểm, bước giá, thời gian bắt đầu/kết thúc.
//   • Hủy phiên đang chạy hoặc đánh dấu PAID khi đã thanh toán xong.
//  Lưu ý: phiên đã có lượt đặt giá thì KHÔNG cho sửa/xóa (chỉ hủy) — bảo vệ
//  tính toàn vẹn dữ liệu (đáp ứng 3.1.5 Xử lý ngoại lệ).
// ====================================================================

import { store } from '../store.js';
import {
  fmtVND, fmtDate, fmtDateInput, statusVN, categoryVN, categoryIcon,
  el, openModal, closeModal, toast,
} from '../utils.js';

let _unsubs = [];

export function renderSeller(container) {
  _cleanup();
  container.innerHTML = '';

  const me = store.currentUser();
  if (!me || (me.role !== 'seller' && me.role !== 'admin')) {
    container.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'icon' }, '🔒'),
      el('p', {}, 'Trang này chỉ dành cho Seller hoặc Admin.'),
    ]));
    return;
  }

  const head = el('div', { class: 'section-head' }, [
    el('div', {}, [
      el('h2', {}, 'Quản lý sản phẩm đấu giá'),
      el('div', { class: 'subtitle' }, 'Thêm / sửa / xóa các phiên đấu giá do bạn quản lý'),
    ]),
    el('div', { class: 'btn-row' }, (() => {
      const add = el('button', { class: 'btn-primary' }, '+ Thêm sản phẩm mới');
      add.addEventListener('click', () => openItemModal(null));
      return [add];
    })()),
  ]);
  container.appendChild(head);

  const stats = el('div', { class: 'stats-row', id: 'sellerStats' });
  container.appendChild(stats);

  const tableWrap = el('div', { class: 'section-block' }, [
    el('h3', {}, 'Danh sách phiên'),
    el('div', { id: 'sellerTableWrap' }),
  ]);
  container.appendChild(tableWrap);

  renderAll();
  _unsubs.push(store.bus.on('change', renderAll));
  _unsubs.push(store.bus.on('bid', renderAll));
  _unsubs.push(store.bus.on('auth', renderAll));
}

function renderAll() {
  const me = store.currentUser();
  if (!me) return;
  const list = me.role === 'admin'
    ? store.allAuctions()
    : store.auctionsBySeller(me.id);

  renderStats(list);
  renderTable(list);
}

function renderStats(list) {
  const cont = document.getElementById('sellerStats');
  if (!cont) return;
  cont.innerHTML = '';
  const cats = [
    { label: 'Tổng phiên', num: list.length },
    { label: 'Đang diễn ra', num: list.filter((a) => a.status === 'RUNNING').length },
    { label: 'Sắp mở', num: list.filter((a) => a.status === 'OPEN').length },
    { label: 'Đã kết thúc', num: list.filter((a) => ['FINISHED', 'PAID'].includes(a.status)).length },
    { label: 'Đã hủy', num: list.filter((a) => a.status === 'CANCELED').length },
  ];
  for (const c of cats) {
    cont.appendChild(el('div', { class: 'stat-card' }, [
      el('div', { class: 'label' }, c.label),
      el('div', { class: 'num' }, String(c.num)),
    ]));
  }
}

function renderTable(list) {
  const wrap = document.getElementById('sellerTableWrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  if (list.length === 0) {
    wrap.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'icon' }, '📦'),
      el('p', {}, 'Bạn chưa có sản phẩm nào. Hãy bấm "+ Thêm sản phẩm mới".'),
    ]));
    return;
  }

  const table = el('table', { class: 'data-table' });
  const thead = el('thead', {}, [
    el('tr', {}, [
      el('th', {}, 'Sản phẩm'),
      el('th', {}, 'Loại'),
      el('th', {}, 'Giá hiện tại'),
      el('th', {}, 'Trạng thái'),
      el('th', {}, 'Bắt đầu'),
      el('th', {}, 'Kết thúc'),
      el('th', {}, 'Thao tác'),
    ]),
  ]);
  const tbody = el('tbody', {});
  table.appendChild(thead);
  table.appendChild(tbody);
  wrap.appendChild(table);

  const me = store.currentUser();
  for (const a of list) {
    const tr = el('tr', {});
    tr.appendChild(el('td', {}, [
      el('div', { style: 'font-weight:600;' }, a.name),
      el('div', { style: 'font-size:12px;color:var(--color-text-muted);' }, 'ID: ' + a.id),
    ]));
    tr.appendChild(el('td', {}, categoryIcon(a.category) + ' ' + categoryVN(a.category)));
    tr.appendChild(el('td', {}, fmtVND(a.currentBid)));
    tr.appendChild(el('td', {}, el('span', { class: 'status-chip ' + a.status, style: 'position:relative;' }, statusVN(a.status))));
    tr.appendChild(el('td', { style: 'font-size:13px;' }, fmtDate(a.startTime)));
    tr.appendChild(el('td', { style: 'font-size:13px;' }, fmtDate(a.endTime)));

    const actions = el('td', { class: 'actions' });
    const view = el('button', { class: 'btn-ghost' }, 'Xem');
    view.addEventListener('click', () => { location.hash = '#/auction/' + a.id; });
    actions.appendChild(view);

    const canEdit = !a.currentBidderId && a.status !== 'PAID' && a.status !== 'CANCELED' && a.status !== 'FINISHED';
    if (canEdit) {
      const edit = el('button', { class: 'btn-ghost' }, 'Sửa');
      edit.addEventListener('click', () => openItemModal(a));
      actions.appendChild(edit);

      const del = el('button', { class: 'btn-danger' }, 'Xóa');
      del.addEventListener('click', () => {
        if (!confirm('Xóa phiên "' + a.name + '"?')) return;
        try {
          store.deleteAuction(a.id);
          toast('success', 'Đã xóa phiên');
        } catch (e) { toast('error', 'Lỗi', e.message); }
      });
      actions.appendChild(del);
    }
    if ((a.status === 'OPEN' || a.status === 'RUNNING') && a.currentBidderId) {
      const cancel = el('button', { class: 'btn-danger' }, 'Hủy');
      cancel.addEventListener('click', () => {
        if (!confirm('Hủy phiên "' + a.name + '"?')) return;
        store.cancelAuction(a.id);
        toast('warning', 'Đã hủy phiên');
      });
      actions.appendChild(cancel);
    }
    if (a.status === 'FINISHED' && a.winnerId) {
      const pay = el('button', { class: 'btn-success' }, 'Đã trả');
      pay.addEventListener('click', () => {
        try { store.markPaid(a.id); toast('success', 'Đã đánh dấu thanh toán'); }
        catch (e) { toast('error', 'Lỗi', e.message); }
      });
      actions.appendChild(pay);
    }

    tr.appendChild(actions);
    tbody.appendChild(tr);
  }
}

function openItemModal(a) {
  const form = document.getElementById('itemForm');
  document.getElementById('itemModalTitle').textContent = a ? 'Sửa sản phẩm' : 'Thêm sản phẩm đấu giá';
  form.reset();
  if (a) {
    form.id.value = a.id;
    form.name.value = a.name;
    form.category.value = a.category;
    form.description.value = a.description;
    form.imageUrl.value = a.imageUrl || '';
    form.startingPrice.value = a.startingPrice;
    form.minIncrement.value = a.minIncrement;
    form.currentBid.value = a.currentBid;
    form.startTime.value = fmtDateInput(a.startTime);
    form.endTime.value = fmtDateInput(a.endTime);
  } else {
    form.id.value = '';
    form.currentBid.value = '';
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60e3);
    form.startTime.value = fmtDateInput(now.getTime());
    form.endTime.value = fmtDateInput(later.getTime());
    form.minIncrement.value = 50000;
  }
  form.onsubmit = (e) => {
    e.preventDefault();
    const me = store.currentUser();
    const payload = {
      name: form.name.value.trim(),
      category: form.category.value,
      description: form.description.value.trim(),
      imageUrl: form.imageUrl.value.trim(),
      startingPrice: form.startingPrice.value,
      minIncrement: form.minIncrement.value,
      startTime: form.startTime.value,
      endTime: form.endTime.value,
      sellerId: me.id,
    };
    try {
      if (form.id.value) {
        store.updateAuction(form.id.value, payload);
        toast('success', 'Đã cập nhật sản phẩm');
      } else {
        store.createAuction(payload);
        toast('success', 'Đã tạo phiên đấu giá mới');
      }
      closeModal('itemModal');
    } catch (e) {
      toast('error', 'Không thể lưu', e.message);
    }
  };
  openModal('itemModal');
}

function _cleanup() {
  _unsubs.forEach((u) => u());
  _unsubs = [];
}
