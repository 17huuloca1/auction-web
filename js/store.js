// ====================================================================
//  store.js — "Bộ não" của hệ thống đấu giá
// --------------------------------------------------------------------
//  TRÁCH NHIỆM CHÍNH:
//   1) Lưu / đọc toàn bộ dữ liệu (users, auctions, bids, autoBids,
//      transactions) trong localStorage của trình duyệt — đóng vai trò
//      tương đương Database trong kiến trúc Client-Server.
//   2) Cung cấp các phương thức nghiệp vụ (login, register, createAuction,
//      placeBid, enableAutoBid, topUp,…) đảm bảo tính nhất quán dữ liệu.
//   3) Phát sự kiện cho UI thông qua EventBus + BroadcastChannel
//      (mẫu thiết kế Observer) — giúp UI tự cập nhật realtime, KHÔNG
//      phải dùng polling như yêu cầu 3.2.4 trong tài liệu.
//   4) Xử lý đấu giá đồng thời an toàn (optimistic versioning) — đáp ứng
//      yêu cầu 3.2.2 (Concurrent Bidding, chống Lost-Update).
//   5) Anti-sniping: nếu có bid ở 30s cuối thì tự kéo dài 60s (3.2.3).
//   6) Tự động chuyển vòng đời phiên đấu giá mỗi giây (setInterval)
//      theo trình tự: OPEN → RUNNING → FINISHED → PAID / CANCELED (3.1.4).
//
//  CÁC MẪU THIẾT KẾ ĐÃ ÁP DỤNG:
//   • Singleton: chỉ có duy nhất 1 instance Store cho toàn ứng dụng.
//   • Factory Method: hàm createItem() khởi tạo đúng subclass theo
//     category (Electronics / Art / Vehicle).
//   • Observer: EventBus.on/emit + BroadcastChannel cho multi-tab.
//   • Strategy (ngầm): payload `method` trong topUp() đại diện chiến lược
//     thanh toán khác nhau (MOMO / VNPAY / ATM / VISA / BANK).
// ====================================================================

import { getSeedUsers, getSeedAuctions, getSeedBids } from './seed.js';

// Khóa lưu trong localStorage. Nâng version (v2) khi thay đổi cấu trúc dữ liệu
// để dữ liệu cũ tự reset và seed lại — tránh lỗi do thiếu field mới.
const STORAGE_KEY = 'auction_db_v2';

// Tên kênh BroadcastChannel để đồng bộ realtime giữa các tab cùng origin.
const BC_NAME = 'auction_events';

// ====================================================================
//  MIỀN DỮ LIỆU (Domain model) — OOP theo yêu cầu 3.3 trong tài liệu
// --------------------------------------------------------------------
//  Cây kế thừa:
//    Entity (abstract)
//      ├── Item (abstract) ──┬── Electronics
//      │                     ├── Art
//      │                     └── Vehicle
//      ├── User
//      └── Auction
// ====================================================================

/**
 * Entity — lớp cơ sở "trừu tượng" (JavaScript không có abstract keyword
 * nên ta dùng quy ước: lớp Entity chỉ giữ id, không khởi tạo trực tiếp).
 * Đáp ứng "Encapsulation" (đóng gói id) và "Inheritance".
 */
class Entity {
  constructor(id) { this.id = id; }
}

/**
 * User — đại diện tài khoản người dùng (gộp Bidder/Seller/Admin trong
 * cùng một class để giảm trùng lặp; vai trò phân biệt bằng trường `role`).
 * Quyền và giao diện theo từng vai trò được kiểm soát ở tầng UI (app.js,
 * pages/*.js) — đây là kiểu "role-based polymorphism" đơn giản.
 */
export class User extends Entity {
  constructor(data) {
    super(data.id);
    this.username = data.username;     // tên đăng nhập (unique)
    this.password = data.password;     // mật khẩu (demo lưu plain-text)
    this.fullname = data.fullname;     // họ tên hiển thị
    this.role = data.role;             // 'admin' | 'seller' | 'bidder'
    this.email = data.email || '';     // email liên hệ
    this.phone = data.phone || '';     // số điện thoại
    this.balance = Number(data.balance) || 0; // số dư ví (VND)
    this.createdAt = data.createdAt ?? Date.now();
  }
}

/**
 * Item — sản phẩm trừu tượng được mang ra đấu giá.
 * Hàm `printInfo()` được ghi đè trong các lớp con — minh họa
 * Polymorphism (Đa hình) theo yêu cầu 3.3.2.
 */
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

// 3 lớp con kế thừa Item — Encapsulation + Inheritance + Polymorphism.
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

/**
 * Factory Method — chọn đúng subclass Item dựa vào category.
 * Tránh việc code gọi `new Electronics()` / `new Art()` rải rác,
 * giúp dễ mở rộng thêm loại mới (chỉ cần thêm 1 case ở đây).
 */
export function createItem(data) {
  switch (data.category) {
    case 'Electronics': return new Electronics(data);
    case 'Art':         return new Art(data);
    case 'Vehicle':     return new Vehicle(data);
    default:            return new Item(data);
  }
}

/**
 * Auction — phiên đấu giá; quản lý toàn bộ vòng đời và các thuộc tính
 * giá khởi điểm, giá hiện tại, người dẫn đầu, version (chống đua dữ liệu).
 */
export class Auction extends Entity {
  constructor(data) {
    super(data.id);
    Object.assign(this, data);
  }
}

// ====================================================================
//  EventBus — Triển khai mẫu thiết kế Observer (3.6)
// --------------------------------------------------------------------
//  - on(event, callback) → đăng ký lắng nghe, trả về hàm hủy đăng ký.
//  - emit(event, payload) → phát sự kiện tới mọi listener đã đăng ký.
//  Bus này được Store dùng để báo cho UI biết có thay đổi dữ liệu mà
//  KHÔNG cần UI phải polling liên tục → đáp ứng đúng tinh thần 3.2.4.
// ====================================================================
class EventBus {
  constructor() { this.listeners = {}; }
  on(event, cb) {
    (this.listeners[event] ||= new Set()).add(cb);
    // Trả về unsubscribe để component có thể gỡ listener khi unmount.
    return () => this.listeners[event].delete(cb);
  }
  emit(event, payload) {
    (this.listeners[event] || []).forEach((cb) => {
      // Bọc try/catch để 1 listener lỗi không làm crash các listener khác.
      try { cb(payload); } catch (e) { console.error(e); }
    });
  }
}

// ====================================================================
//  Store — Singleton (3.6) chứa toàn bộ logic nghiệp vụ
// ====================================================================
class Store {
  constructor() {
    // SINGLETON: nếu đã có instance trước đó thì trả về instance cũ.
    if (Store._instance) return Store._instance;
    Store._instance = this;

    this.bus = new EventBus();
    this._load();

    // Kênh phát sóng giữa các tab cùng origin (đa cửa sổ trên cùng máy).
    // Khi tab A bid, tab B nhận thông điệp và refresh UI ngay lập tức
    // (Observer nâng cao — yêu cầu 3.2.4).
    try {
      this.bc = new BroadcastChannel(BC_NAME);
      this.bc.onmessage = (e) => this._onBroadcast(e.data);
    } catch (e) { this.bc = null; }

    // "Đồng hồ" hệ thống — chạy mỗi 1 giây để:
    //   • Tự chuyển OPEN → RUNNING khi tới giờ bắt đầu.
    //   • Tự chuyển RUNNING → FINISHED khi hết giờ.
    //   • Phát event 'tick' để UI cập nhật countdown.
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

  // ===================================================================
  //  placeBid — Trái tim của hệ thống đấu giá
  // -------------------------------------------------------------------
  //  Đáp ứng cùng lúc các yêu cầu:
  //   • 3.1.3: kiểm tra hợp lệ giá, cập nhật leader.
  //   • 3.1.5: trả về thông báo lỗi rõ ràng cho các tình huống bất thường.
  //   • 3.2.2: dùng `version` (optimistic locking) — 2 bid cùng lúc
  //            sẽ tuần tự áp dụng, không bị Lost-Update.
  //   • 3.2.3: anti-sniping — gia hạn 60s nếu bid ở 30s cuối.
  //  Trả về: { ok, bid, auction } khi thành công, hoặc { ok:false, error }.
  // ===================================================================
  /**
   * @param {{auctionId:string,bidderId:string,amount:number,isAuto?:boolean}} p
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

    // ----- Anti-sniping (3.2.3) -----
    // Nếu lượt bid này xảy ra trong vòng 30 giây cuối của phiên,
    // tự động kéo dài endTime thêm 60 giây để các bidder khác có cơ hội phản công.
    const ANTI_SNIPE_X = 30 * 1000; // X = 30s
    const ANTI_SNIPE_Y = 60 * 1000; // Y = 60s
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

  // ====================================================================
  //  Phát sóng sự kiện realtime (Observer cấp 2)
  // --------------------------------------------------------------------
  //  _announce: phát đồng thời trên EventBus nội bộ (cho UI tab hiện tại)
  //             và BroadcastChannel (cho các tab khác).
  //  _onBroadcast: được gọi khi nhận message từ tab khác — reload
  //                localStorage và phát lại sự kiện cho UI tab này.
  // ====================================================================
  _announce(type, payload = {}) {
    this.bus.emit(type, payload);
    this._broadcast({ type, ...payload });
  }
  _broadcast(msg) { try { this.bc?.postMessage(msg); } catch (e) {} }
  _onBroadcast(msg) {
    this._load(); // đồng bộ lại dữ liệu mới nhất từ localStorage
    if (msg.type === 'bid') this.bus.emit('bid', msg);
    else this.bus.emit('change', msg);
  }

  // ---- Toast hook (cung cấp từ ngoài) ----
  setToastFn(fn) { this._toast = fn; }
}

export const store = new Store();
