// ====================================================================
// Trang Cài đặt tài khoản: đổi mật khẩu, email, SĐT + lịch sử giao dịch
// ====================================================================

import { store } from '../store.js';
import { fmtVND, fmtDate, el, toast, openModal } from '../utils.js';

let _unsubs = [];

const METHOD_LABEL = {
  MOMO: 'Ví Momo',
  VNPAY: 'VNPay QR',
  ATM: 'Thẻ ATM',
  VISA: 'Visa / Mastercard',
  BANK: 'Chuyển khoản NH',
};

const TX_TYPE_LABEL = {
  TOP_UP: { text: '💰 Nạp tiền', cls: 'tx-credit' },
  BID_WON: { text: '🏆 Thắng phiên đấu giá', cls: 'tx-info' },
  PAYMENT: { text: '💸 Thanh toán', cls: 'tx-debit' },
};

export function renderSettings(container) {
  _cleanup();
  container.innerHTML = '';

  const me = store.currentUser();
  if (!me) {
    container.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'icon' }, '🔒'),
      el('p', {}, 'Vui lòng đăng nhập để xem trang cài đặt.'),
    ]));
    return;
  }

  // === Header ===
  container.appendChild(el('div', { class: 'section-head' }, [
    el('div', {}, [
      el('h2', {}, '⚙️ Cài đặt tài khoản'),
      el('div', { class: 'subtitle' }, 'Quản lý thông tin cá nhân, bảo mật và lịch sử giao dịch.'),
    ]),
  ]));

  // === Wallet card ===
  const txs = store.transactionsByUser(me.id);
  const totalTopup = txs.filter((t) => t.type === 'TOP_UP').reduce((s, t) => s + t.amount, 0);

  const topupBtnQuick = el('button', { class: 'btn-primary' }, '➕ Nạp tiền ngay');
  topupBtnQuick.addEventListener('click', () => document.getElementById('topupBtn')?.click());

  const walletCard = el('div', { class: 'wallet-card' }, [
    el('div', { class: 'wallet-info' }, [
      el('div', { class: 'wallet-label' }, 'Số dư tài khoản'),
      el('div', { class: 'wallet-amount' }, fmtVND(me.balance || 0)),
      el('div', { class: 'wallet-meta' }, [
        el('span', {}, `Đã nạp tổng cộng: ${fmtVND(totalTopup)}`),
        el('span', {}, ` · ${txs.length} giao dịch`),
      ]),
    ]),
    topupBtnQuick,
  ]);
  container.appendChild(walletCard);

  // === Tabs ===
  const tabs = el('div', { class: 'settings-tabs' }, [
    el('button', { class: 'settings-tab active', type: 'button', 'data-tab': 'profile' }, '👤 Thông tin liên hệ'),
    el('button', { class: 'settings-tab', type: 'button', 'data-tab': 'password' }, '🔐 Đổi mật khẩu'),
    el('button', { class: 'settings-tab', type: 'button', 'data-tab': 'history' }, '📊 Lịch sử giao dịch'),
  ]);
  container.appendChild(tabs);

  const panes = el('div', { class: 'settings-panes' });
  container.appendChild(panes);

  panes.appendChild(renderProfilePane(me));
  panes.appendChild(renderPasswordPane(me));
  panes.appendChild(renderHistoryPane(me));

  tabs.querySelectorAll('.settings-tab').forEach((t) => {
    t.addEventListener('click', (ev) => {
      ev.preventDefault();
      const target = t.dataset.tab;
      tabs.querySelectorAll('.settings-tab').forEach((x) => x.classList.toggle('active', x === t));
      panes.querySelectorAll('.settings-pane').forEach((p) => {
        p.hidden = p.dataset.pane !== target;
      });
    });
  });

  // Lưu ý: app.js đã tự navigate() lại khi 'auth' đổi, nên không cần subscribe ở đây.
}

function renderProfilePane(me) {
  const pane = el('div', { class: 'settings-pane card-pane', 'data-pane': 'profile' });
  pane.appendChild(el('h3', {}, '👤 Thông tin liên hệ'));
  pane.appendChild(el('p', { class: 'hint' }, 'Cập nhật họ tên, email và số điện thoại để tiện liên hệ khi bạn thắng phiên đấu giá.'));

  const form = el('form', { class: 'settings-form', id: 'profileForm' });
  form.appendChild(buildField('Họ tên', 'fullname', me.fullname || '', { required: true }));
  form.appendChild(buildField('Email', 'email', me.email || '', { type: 'email', placeholder: 'ban@example.com' }));
  form.appendChild(buildField('Số điện thoại', 'phone', me.phone || '', { placeholder: '09xxxxxxxx', pattern: '[0-9 +()-]{6,20}' }));
  form.appendChild(buildField('Tên đăng nhập', 'username', me.username, { disabled: true, hint: 'Không thể đổi tên đăng nhập.' }));

  const actions = el('div', { class: 'form-actions' }, [
    el('button', { class: 'btn-primary', type: 'submit' }, '💾 Lưu thay đổi'),
  ]);
  form.appendChild(actions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    try {
      store.updateProfile({
        userId: me.id,
        fullname: data.get('fullname'),
        email: data.get('email'),
        phone: data.get('phone'),
      });
      toast('success', 'Đã lưu', 'Thông tin liên hệ được cập nhật.');
    } catch (err) {
      toast('error', 'Lỗi', err.message);
    }
  });

  pane.appendChild(form);
  return pane;
}

function renderPasswordPane(me) {
  const pane = el('div', { class: 'settings-pane card-pane', 'data-pane': 'password', hidden: true });
  pane.appendChild(el('h3', {}, '🔐 Đổi mật khẩu'));
  pane.appendChild(el('p', { class: 'hint' }, 'Mật khẩu phải có ít nhất 4 ký tự. Sau khi đổi thành công, mật khẩu cũ sẽ không còn dùng được.'));

  const form = el('form', { class: 'settings-form', id: 'passwordForm' });
  form.appendChild(buildField('Mật khẩu hiện tại', 'oldPassword', '', { type: 'password', required: true }));
  form.appendChild(buildField('Mật khẩu mới', 'newPassword', '', { type: 'password', required: true, minlength: 4 }));
  form.appendChild(buildField('Xác nhận mật khẩu mới', 'newPassword2', '', { type: 'password', required: true, minlength: 4 }));

  const actions = el('div', { class: 'form-actions' }, [
    el('button', { class: 'btn-primary', type: 'submit' }, '🔄 Đổi mật khẩu'),
  ]);
  form.appendChild(actions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const newPwd = String(data.get('newPassword'));
    const newPwd2 = String(data.get('newPassword2'));
    if (newPwd !== newPwd2) {
      toast('error', 'Không khớp', 'Mật khẩu xác nhận chưa khớp với mật khẩu mới.');
      return;
    }
    try {
      store.changePassword({
        userId: me.id,
        oldPassword: data.get('oldPassword'),
        newPassword: newPwd,
      });
      toast('success', 'Đổi mật khẩu thành công', 'Hãy ghi nhớ mật khẩu mới của bạn.');
      form.reset();
    } catch (err) {
      toast('error', 'Đổi mật khẩu thất bại', err.message);
    }
  });

  pane.appendChild(form);
  return pane;
}

function renderHistoryPane(me) {
  const pane = el('div', { class: 'settings-pane card-pane', 'data-pane': 'history', hidden: true });
  pane.appendChild(el('h3', {}, '📊 Lịch sử giao dịch'));

  // Stats
  const txs = store.transactionsByUser(me.id);
  const totalTopup = txs.filter((t) => t.type === 'TOP_UP').reduce((s, t) => s + t.amount, 0);
  const totalSpend = txs.filter((t) => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0);

  // Bids won (synthesized from auctions)
  const wins = store.auctions.filter((a) =>
    (a.winnerId === me.id || (a.status !== 'OPEN' && a.status !== 'RUNNING' && a.currentBidderId === me.id))
    && (a.status === 'FINISHED' || a.status === 'PAID')
  );

  pane.appendChild(el('div', { class: 'tx-stats' }, [
    el('div', { class: 'tx-stat tx-credit' }, [
      el('div', { class: 'label' }, 'Tổng đã nạp'),
      el('div', { class: 'num' }, fmtVND(totalTopup)),
    ]),
    el('div', { class: 'tx-stat' }, [
      el('div', { class: 'label' }, 'Số lượt nạp tiền'),
      el('div', { class: 'num' }, String(txs.filter((t) => t.type === 'TOP_UP').length)),
    ]),
    el('div', { class: 'tx-stat tx-info' }, [
      el('div', { class: 'label' }, 'Phiên đã thắng'),
      el('div', { class: 'num' }, String(wins.length)),
    ]),
    el('div', { class: 'tx-stat tx-debit' }, [
      el('div', { class: 'label' }, 'Tổng giá trị thắng'),
      el('div', { class: 'num' }, fmtVND(wins.reduce((s, a) => s + (a.currentBid || 0), 0))),
    ]),
  ]));

  // Build unified table: top-ups (already in transactions) + wins (from auctions)
  const rows = [];
  for (const t of txs) {
    const meta = TX_TYPE_LABEL[t.type] || { text: t.type, cls: '' };
    rows.push({
      ts: t.ts,
      type: meta.text,
      cls: meta.cls,
      desc: METHOD_LABEL[t.method] || t.note || '—',
      amount: (t.type === 'TOP_UP' ? '+' : '−') + fmtVND(t.amount),
      balanceAfter: t.balanceAfter,
    });
  }
  for (const a of wins) {
    rows.push({
      ts: a.endTime,
      type: '🏆 Thắng phiên đấu giá',
      cls: 'tx-info',
      desc: a.name,
      amount: fmtVND(a.currentBid),
      balanceAfter: null,
      link: '#/auction/' + a.id,
    });
  }
  rows.sort((a, b) => b.ts - a.ts);

  if (rows.length === 0) {
    pane.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'icon' }, '🧾'),
      el('p', {}, 'Chưa có giao dịch nào. Bấm “Nạp tiền” để thử ngay.'),
    ]));
    return pane;
  }

  const t = el('table', { class: 'data-table tx-table' });
  t.appendChild(el('thead', {}, [
    el('tr', {}, [
      el('th', {}, 'Thời điểm'),
      el('th', {}, 'Loại'),
      el('th', {}, 'Mô tả'),
      el('th', { style: 'text-align:right;' }, 'Số tiền'),
      el('th', { style: 'text-align:right;' }, 'Số dư sau'),
    ]),
  ]));
  const tb = el('tbody', {});
  for (const r of rows) {
    const descCell = r.link
      ? el('td', {}, el('a', { href: r.link, style: 'color:var(--color-primary);font-weight:600;' }, r.desc))
      : el('td', {}, r.desc);
    tb.appendChild(el('tr', {}, [
      el('td', { style: 'font-size:13px;' }, fmtDate(r.ts)),
      el('td', {}, el('span', { class: 'tx-type-chip ' + r.cls }, r.type)),
      descCell,
      el('td', { class: 'tx-amount ' + r.cls, style: 'text-align:right;font-weight:700;' }, r.amount),
      el('td', { style: 'text-align:right;color:var(--color-text-muted);' }, r.balanceAfter != null ? fmtVND(r.balanceAfter) : '—'),
    ]));
  }
  t.appendChild(tb);
  pane.appendChild(t);
  return pane;
}

function buildField(label, name, value, opts = {}) {
  const wrap = el('label', { class: 'field' });
  wrap.appendChild(document.createTextNode(label));
  const input = el('input', { name, value });
  input.type = opts.type || 'text';
  if (opts.required) input.required = true;
  if (opts.disabled) input.disabled = true;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  if (opts.pattern) input.pattern = opts.pattern;
  if (opts.minlength) input.minLength = Number(opts.minlength);
  wrap.appendChild(input);
  if (opts.hint) wrap.appendChild(el('small', { class: 'hint' }, opts.hint));
  return wrap;
}

function _cleanup() {
  _unsubs.forEach((u) => u());
  _unsubs = [];
}
