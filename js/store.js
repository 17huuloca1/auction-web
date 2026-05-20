// ====================================================================
// Store: Singleton quản lý dữ liệu hệ thống đấu giá
// - Lưu/đọc localStorage.
// - Phát sự kiện qua EventBus + BroadcastChannel (Observer Pattern).
// - Xử lý đấu giá đồng thời (optimistic versioning).
// - Vòng đời phiên: OPEN -> RUNNING -> FINISHED -> PAID/CANCELED.
// ====================================================================

import { getSeedUsers, getSeedAuctions, getSeedBids } from './seed.js';

const STORAGE_KEY = 'auction_db_v2';
const BC_NAME = 'auction_events';

// --- Domain model classes (OOP) ----------------------------------
class Entity {
  constructor(id) { this.id = id; }
}

export class User extends Entity {
  constructor(data) {
    super(data.id);
    this.username = data.username;
    this.password = data.password;
    this.fullname = data.fullname;
    this.role = data.role;
    this.email = data.email || '';
    this.phone = data.phone || '';
    this.balance = Number(data.balance) || 0;
    this.createdAt = data.createdAt ?? Date.now();
  }
}

export class Item extends Entity {
  constructor(data) {
    super(data.id);
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.imageUrl = data.imageUrl || '';
  }
  printInfo() { return `${this.name} (${this.category})`; }
}

export class Electronics extends Item {
  constructor(data) { super({ ...data, category: 'Electronics' }); }
  printInfo() { return `[ĐIỆN TỬ] ${this.name}`; }
}
export class Art extends Item {
  constructor(data) { super({ ...data, category: 'Art' }); }
  printInfo() { return `[NGHỆ THUẬT] ${this.name}`; }
}
export class Vehicle extends Item {
  constructor(data) { super({ ...data, category: 'Vehicle' }); }
  printInfo() { return `[PHƯƠNG TIỆN] ${this.name}`; }
}

// Factory Method
export function createItem(data) {
  switch (data.category) {
    case 'Electronics': return new Electronics(data);
    case 'Art': return new Art(data);
    case 'Vehicle': return new Vehicle(data);
    default: return new Item(data);
  }
}

export class Auction extends Entity {
  constructor(data) {
    super(data.id);
    Object.assign(this, data);
  }
}

// --- Simple EventBus (Observer) -----------------------------------
class EventBus {
  constructor() { this.listeners = {}; }
  on(event, cb) {
    (this.listeners[event] ||= new Set()).add(cb);
    return () => this.listeners[event].delete(cb);
  }
  emit(event, payload) {
    (this.listeners[event] || []).forEach((cb) => {
      try { cb(payload); } catch (e) { console.error(e); }
    });
  }
}

// --- Store -------------------------------------------------------
class Store {
  constructor() {
    if (Store._instance) return Store._instance;
    Store._instance = this;

    this.bus = new EventBus();
    this._load();

    // Realtime channel giữa các tab
    try {
      this.bc = new BroadcastChannel(BC_NAME);
      this.bc.onmessage = (e) => this._onBroadcast(e.data);
    } catch (e) { this.bc = null; }

    // Tick mỗi giây để chuyển trạng thái phiên đấu giá
    this._timer = setInterval(() => this._tick(), 1000);
  }

  // ---- Persistence ----
  _load() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (raw) {
      const data = JSON.parse(raw);
      this.users = (data.users || []).map((u) => ({ email: '', phone: '', balance: 0, ...u }));
      this.auctions = data.auctions || [];
      this.bids = data.bids || [];
      this.autoBids = data.autoBids || [];
      this.transactions = data.transactions || [];
      this.currentUserId = data.currentUserId || null;
    } else {
      this.users = getSeedUsers();
      this.auctions = getSeedAuctions();
      this.bids = getSeedBids();
      this.autoBids = [];
      this.transactions = [];
      this.currentUserId = null;
      this._persist();
    }
  }

  _persist() {
    const data = {
      users: this.users,
      auctions: this.auctions,
      bids: this.bids,
      autoBids: this.autoBids,
      transactions: this.transactions,
      currentUserId: this.currentUserId,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  reset() {
    this.users = getSeedUsers();
    this.auctions = getSeedAuctions();
    this.bids = getSeedBids();
    this.autoBids = [];
    this.transactions = [];
    this.currentUserId = null;
    this._persist();
    this._broadcast({ type: 'full-reset' });
    this.bus.emit('change', { type: 'reset' });
  }

  // ---- Auth ----
  login(username, password) {
    const u = this.users.find((x) => x.username === username && x.password === password);
    if (!u) throw new Error('Sai tên đăng nhập hoặc mật khẩu');
    this.currentUserId = u.id;
    this._persist();
    this.bus.emit('auth', u);
    return u;
  }

  register({ username, password, fullname, role, email = '', phone = '' }) {
    if (this.users.some((u) => u.username === username))
      throw new Error('Tên đăng nhập đã tồn tại');
    if (!['bidder', 'seller'].includes(role))
      throw new Error('Vai trò không hợp lệ');
    const user = new User({
      id: 'u_' + Math.random().toString(36).slice(2, 9),
      username, password, fullname, role, email, phone,
      balance: 0, createdAt: Date.now(),
    });
    this.users.push(user);
    this.currentUserId = user.id;
    this._persist();
    this.bus.emit('auth', user);
    return user;
  }

  // ---- Account management ----
  updateProfile({ userId, fullname, email, phone }) {
    const u = this.getUser(userId);
    if (!u) throw new Error('Không tìm thấy người dùng');
    if (fullname !== undefined) u.fullname = String(fullname).trim() || u.fullname;
    if (email !== undefined) u.email = String(email).trim();
    if (phone !== undefined) u.phone = String(phone).trim();
    this._persist();
    this._announce('change');
    this.bus.emit('auth', u);
    return u;
  }

  changePassword({ userId, oldPassword, newPassword }) {
    const u = this.getUser(userId);
    if (!u) throw new Error('Không tìm thấy người dùng');
    if (u.password !== oldPassword) throw new Error('Mật khẩu hiện tại không đúng');
    if (!newPassword || String(newPassword).length < 4)
      throw new Error('Mật khẩu mới phải có ít nhất 4 ký tự');
    u.password = String(newPassword);
    this._persist();
    this._announce('change');
    return u;
  }

  // ---- Wallet / Transactions ----
  topUp({ userId, amount, method = 'MOMO' }) {
    const u = this.getUser(userId);
    if (!u) throw new Error('Không tìm thấy người dùng');
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) throw new Error('Số tiền nạp không hợp lệ');
    if (n < 10000) throw new Error('Số tiền nạp tối thiểu là 10.000 ₫');
    u.balance = (Number(u.balance) || 0) + n;
    const tx = {
      id: 'tx_' + Math.random().toString(36).slice(2, 9),
      userId, type: 'TOP_UP', method,
      amount: n, balanceAfter: u.balance,
      ts: Date.now(),
      note: 'Nạp tiền vào tài khoản qua ' + method,
    };
    this.transactions.push(tx);
    this._persist();
    this._announce('change');
    this.bus.emit('auth', u);
    return tx;
  }

  transactionsByUser(userId) {
    return this.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.ts - a.ts);
  }

  logout() {
    this.currentUserId = null;
    this._persist();
    this.bus.emit('auth', null);
  }

  currentUser() {
    return this.users.find((u) => u.id === this.currentUserId) || null;
  }

  getUser(id) { return this.users.find((u) => u.id === id) || null; }
  allUsers() { return [...this.users]; }

  removeUser(id) {
    if (id === this.currentUserId) throw new Error('Không thể xóa chính bạn');
    this.users = this.users.filter((u) => u.id !== id);
    // Hủy các phiên đấu giá thuộc seller này
    this.auctions = this.auctions.map((a) =>
      a.sellerId === id && !['FINISHED', 'PAID', 'CANCELED'].includes(a.status)
        ? { ...a, status: 'CANCELED' }
        : a
    );
    this._persist();
    this.bus.emit('change', { type: 'users' });
    this._broadcast({ type: 'change' });
  }

  // ---- Auctions ----
  allAuctions() { return [...this.auctions].sort((a, b) => b.endTime - a.endTime); }
  getAuction(id) { return this.auctions.find((a) => a.id === id) || null; }
  auctionsBySeller(sellerId) { return this.auctions.filter((a) => a.sellerId === sellerId); }

  createAuction(data) {
    const id = 'a_' + Math.random().toString(36).slice(2, 9);
    const start = new Date(data.startTime).getTime();
    const end = new Date(data.endTime).getTime();
    if (end <= start) throw new Error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
    const status = Date.now() >= start ? 'RUNNING' : 'OPEN';
    const a = {
      id,
      name: data.name,
      category: data.category,
      description: data.description,
      imageUrl: data.imageUrl || '',
      sellerId: data.sellerId,
      startingPrice: Number(data.startingPrice),
      currentBid: Number(data.startingPrice),
      currentBidderId: null,
      minIncrement: Number(data.minIncrement) || 50000,
      startTime: start,
      endTime: end,
      status,
      version: 0,
    };
    this.auctions.push(a);
    this._persist();
    this._announce('change');
    return a;
  }

  updateAuction(id, patch) {
    const a = this.getAuction(id);
    if (!a) throw new Error('Không tìm thấy phiên đấu giá');
    if (a.currentBidderId) throw new Error('Phiên đã có lượt đặt giá, không thể sửa');
    if (patch.startTime) patch.startTime = new Date(patch.startTime).getTime();
    if (patch.endTime) patch.endTime = new Date(patch.endTime).getTime();
    if (patch.endTime && patch.startTime && patch.endTime <= patch.startTime)
      throw new Error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
    if (patch.startingPrice !== undefined) {
      patch.startingPrice = Number(patch.startingPrice);
      patch.currentBid = patch.startingPrice;
    }
    if (patch.minIncrement !== undefined) patch.minIncrement = Number(patch.minIncrement);
    Object.assign(a, patch);
    a.status = Date.now() >= a.startTime ? 'RUNNING' : 'OPEN';
    this._persist();
    this._announce('change');
    return a;
  }

  deleteAuction(id) {
    const a = this.getAuction(id);
    if (!a) return;
    if (a.currentBidderId) throw new Error('Phiên đã có lượt đặt giá, không thể xóa - hãy hủy thay vào đó');
    this.auctions = this.auctions.filter((x) => x.id !== id);
    this.bids = this.bids.filter((b) => b.auctionId !== id);
    this.autoBids = this.autoBids.filter((b) => b.auctionId !== id);
    this._persist();
    this._announce('change');
  }

  cancelAuction(id) {
    const a = this.getAuction(id);
    if (!a) return;
    if (['FINISHED', 'PAID', 'CANCELED'].includes(a.status)) return;
    a.status = 'CANCELED';
    this._persist();
    this._announce('change');
  }

  markPaid(id) {
    const a = this.getAuction(id);
    if (!a) return;
    if (a.status !== 'FINISHED') throw new Error('Chỉ phiên FINISHED mới có thể đánh dấu đã thanh toán');
    a.status = 'PAID';
    this._persist();
    this._announce('change');
  }

  // ---- Bids ----
  bidsByAuction(auctionId) {
    return this.bids.filter((b) => b.auctionId === auctionId).sort((x, y) => x.ts - y.ts);
  }
  bidsByBidder(bidderId) {
    return this.bids.filter((b) => b.bidderId === bidderId).sort((x, y) => y.ts - x.ts);
  }

  /**
   * Đặt giá - đảm bảo an toàn đồng thời (optimistic versioning).
   * - Kiểm tra phiên RUNNING, kiểm tra mức giá hợp lệ,
   * - Cập nhật currentBid + người dẫn đầu,
   * - Anti-sniping: nếu còn < ANTI_SNIPE_X giây, gia hạn ANTI_SNIPE_Y giây.
   * @returns {{ok:boolean, error?:string, bid?:object, auction?:object}}
   */
  placeBid({ auctionId, bidderId, amount, isAuto = false }) {
    const a = this.getAuction(auctionId);
    if (!a) return { ok: false, error: 'Không tìm thấy phiên đấu giá' };

    // 0. Auto-transition trạng thái
    const now = Date.now();
    if (a.status === 'OPEN' && now >= a.startTime) a.status = 'RUNNING';
    if (a.status === 'RUNNING' && now >= a.endTime) { this._closeAuction(a); }

    if (a.status !== 'RUNNING')
      return { ok: false, error: 'Phiên đấu giá không trong trạng thái nhận đặt giá' };
    if (now < a.startTime) return { ok: false, error: 'Phiên chưa bắt đầu' };
    if (now >= a.endTime)  return { ok: false, error: 'Phiên đã kết thúc' };

    const min = a.currentBid + a.minIncrement;
    if (amount < min)
      return { ok: false, error: `Giá đặt phải ≥ ${min.toLocaleString('vi-VN')} ₫` };
    if (bidderId === a.currentBidderId)
      return { ok: false, error: 'Bạn đang là người dẫn đầu, không thể tự đặt giá đè' };
    if (bidderId === a.sellerId)
      return { ok: false, error: 'Người bán không thể tự đấu giá sản phẩm của mình' };

    // Optimistic concurrency
    const prevVersion = a.version ?? 0;
    a.version = prevVersion + 1;
    a.currentBid = amount;
    a.currentBidderId = bidderId;

    const bid = {
      id: 'b_' + Math.random().toString(36).slice(2, 9),
      auctionId,
      bidderId,
      amount,
      ts: now,
      isAuto,
    };
    this.bids.push(bid);

    // Anti-sniping
    const ANTI_SNIPE_X = 30 * 1000;
    const ANTI_SNIPE_Y = 60 * 1000;
    if (a.endTime - now <= ANTI_SNIPE_X) {
      a.endTime = now + ANTI_SNIPE_Y;
      this._toast?.('warning', 'Gia hạn phiên', 'Có bid giây cuối, phiên được gia hạn thêm 60 giây.');
    }

    this._persist();
    this._announce('bid', { auctionId });

    // Trigger auto-bid sau khi có bid mới
    setTimeout(() => this._processAutoBids(auctionId), 50);

    return { ok: true, bid, auction: a };
  }

  _closeAuction(a) {
    a.status = 'FINISHED';
    a.winnerId = a.currentBidderId;
    this._persist();
  }

  // ---- Auto-bid ----
  enableAutoBid({ auctionId, bidderId, maxBid, increment }) {
    const existing = this.autoBids.find(
      (x) => x.auctionId === auctionId && x.bidderId === bidderId
    );
    if (existing) {
      existing.maxBid = maxBid;
      existing.increment = increment;
      existing.ts = Date.now();
    } else {
      this.autoBids.push({
        id: 'ab_' + Math.random().toString(36).slice(2, 9),
        auctionId, bidderId, maxBid, increment, ts: Date.now(),
      });
    }
    this._persist();
    this._announce('change');
    setTimeout(() => this._processAutoBids(auctionId), 50);
  }

  disableAutoBid({ auctionId, bidderId }) {
    this.autoBids = this.autoBids.filter(
      (x) => !(x.auctionId === auctionId && x.bidderId === bidderId)
    );
    this._persist();
    this._announce('change');
  }

  autoBidConfig(auctionId, bidderId) {
    return this.autoBids.find(
      (x) => x.auctionId === auctionId && x.bidderId === bidderId
    ) || null;
  }

  /**
   * Xử lý các Auto-Bid đang hoạt động cho phiên này.
   * Logic:
   * - Lấy tất cả autoBids của phiên đấu giá.
   * - Sắp xếp theo thời điểm đăng ký (ts) — luật ưu tiên theo thời gian (PriorityQueue).
   * - Lặp: trong khi có ai đó (không phải currentBidder) có thể tăng giá hợp lệ (≤ maxBid), đặt giá tự động.
   * - Giới hạn lặp để tránh vòng lặp vô tận khi 2 auto-bidder cùng maxBid (luật ưu tiên thời gian).
   */
  _processAutoBids(auctionId) {
    const a = this.getAuction(auctionId);
    if (!a || a.status !== 'RUNNING') return;

    const queue = this.autoBids
      .filter((x) => x.auctionId === auctionId)
      .sort((x, y) => x.ts - y.ts);

    let safety = 30; // tránh loop quá lâu
    let triggered = false;

    while (safety-- > 0) {
      // Người nào hợp lệ và sẵn sàng outbid?
      const candidate = queue.find((ab) => {
        if (ab.bidderId === a.currentBidderId) return false; // đang dẫn đầu rồi
        if (ab.bidderId === a.sellerId) return false;
        const nextPrice = a.currentBid + Math.max(a.minIncrement, ab.increment);
        return nextPrice <= ab.maxBid;
      });
      if (!candidate) break;

      const nextPrice = a.currentBid + Math.max(a.minIncrement, candidate.increment);
      const res = this.placeBid({
        auctionId,
        bidderId: candidate.bidderId,
        amount: nextPrice,
        isAuto: true,
      });
      if (!res.ok) break;
      triggered = true;
    }

    if (triggered) this._announce('bid', { auctionId, source: 'auto' });
  }

  // ---- Tick: kết thúc phiên khi hết giờ + auto-open ----
  _tick() {
    const now = Date.now();
    let changed = false;
    for (const a of this.auctions) {
      if (a.status === 'OPEN' && now >= a.startTime && now < a.endTime) {
        a.status = 'RUNNING';
        changed = true;
      } else if (a.status === 'RUNNING' && now >= a.endTime) {
        this._closeAuction(a);
        changed = true;
      }
    }
    if (changed) {
      this._persist();
      this.bus.emit('change', { type: 'tick' });
    }
    this.bus.emit('tick', { now });
  }

  // ---- Broadcast ----
  _announce(type, payload = {}) {
    this.bus.emit(type, payload);
    this._broadcast({ type, ...payload });
  }
  _broadcast(msg) { try { this.bc?.postMessage(msg); } catch (e) {} }
  _onBroadcast(msg) {
    this._load(); // re-sync localStorage
    if (msg.type === 'bid') this.bus.emit('bid', msg);
    else this.bus.emit('change', msg);
  }

  // ---- Toast hook (cung cấp từ ngoài) ----
  setToastFn(fn) { this._toast = fn; }
}

export const store = new Store();
