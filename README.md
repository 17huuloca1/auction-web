# Hệ Thống Đấu Giá Trực Tuyến (Online Auction System) — Web Version

Đây là phiên bản **trang web** (HTML + CSS + JavaScript) của bài tập lớn "Phát triển Hệ thống Đấu giá Trực tuyến" — vốn yêu cầu JavaFX. Phiên bản web được làm cùng cấu trúc nghiệp vụ + đầy đủ chức năng bắt buộc và nâng cao trong tài liệu, để bạn dễ chỉnh sửa giao diện và **redesign lại sau**.

## 1. Demo & cách chạy

Không cần build, không cần backend, chỉ cần mở `index.html`.

```bash
# Cách 1: mở thẳng
xdg-open index.html        # Linux
open index.html            # macOS

# Cách 2: chạy server tĩnh (khuyến nghị để load đúng ES modules)
python3 -m http.server 8000
# rồi mở http://localhost:8000
```

Tài khoản mẫu (đã seed):

| Username | Password | Vai trò  |
|----------|----------|----------|
| admin    | admin    | Admin    |
| seller   | seller   | Seller   |
| seller2  | seller   | Seller   |
| bidder   | bidder   | Bidder   |
| bidder2  | bidder   | Bidder   |
| bidder3  | bidder   | Bidder   |

Mọi dữ liệu được lưu trong `localStorage`. Reset dữ liệu bằng nút "Reset dữ liệu mẫu" trong trang Admin hoặc xoá `auction_db_v1` trong DevTools → Application.

## 2. Cấu trúc thư mục

```
auction-web/
├── index.html              # Trang vỏ, modal, topbar
├── styles/
│   ├── theme.css           # Biến màu / font (đổi để re-design)
│   └── main.css            # Style chính
├── js/
│   ├── app.js              # Router theo hash + auth UI
│   ├── store.js            # Singleton quản lý dữ liệu (OOP + Observer)
│   ├── seed.js             # Dữ liệu mẫu (sửa để đổi sản phẩm/người dùng)
│   ├── utils.js            # Helper (format VND, thời gian, toast, modal...)
│   └── pages/
│       ├── home.js         # Danh sách phiên đấu giá
│       ├── detail.js       # Chi tiết + realtime bidding + biểu đồ
│       ├── seller.js       # CRUD sản phẩm
│       ├── admin.js        # Quản lý người dùng + phiên
│       └── profile.js      # Hồ sơ + lịch sử cá nhân
└── README.md
```

## 3. Đối chiếu yêu cầu trong file Word

### 3.1 Chức năng bắt buộc
- **3.1.1 Quản lý người dùng**: Đăng ký / đăng nhập + 3 vai trò Bidder / Seller / Admin (xem topbar).
- **3.1.2 Quản lý sản phẩm**: CRUD ở trang `#/seller` — đầy đủ tên, mô tả, giá khởi điểm, giá hiện tại, thời gian bắt đầu/kết thúc.
- **3.1.3 Tham gia đấu giá**: Đặt giá ở trang chi tiết phiên, validate `newBid >= currentBid + minIncrement`, cập nhật người dẫn đầu.
- **3.1.4 Kết thúc phiên**: Tự động đóng khi hết giờ (timer 1s). Trạng thái `OPEN → RUNNING → FINISHED → PAID / CANCELED`.
- **3.1.5 Xử lý lỗi & ngoại lệ**: Toast lỗi cho mọi tình huống (đặt giá thấp, phiên đã đóng, tự bid đè...). Validate form đầu vào.
- **3.1.6 GUI**: Tất cả màn hình trong tài liệu — danh sách phiên, chi tiết, realtime bidding, quản lý seller.

### 3.2 Chức năng nâng cao
- **3.2.1 Auto-Bidding**: Cấu hình `maxBid` + `increment`. Thuật toán xếp hàng đợi ưu tiên theo thời điểm đăng ký (PriorityQueue), không vượt `maxBid`, tránh self-bid (`js/store.js:_processAutoBids`).
- **3.2.2 Concurrent Bidding**: Optimistic versioning (`auction.version++`) khi đặt giá, đảm bảo không có lost-update giữa các tab.
- **3.2.3 Anti-sniping**: Nếu có bid trong `30s` cuối → tự động gia hạn thêm `60s` (`js/store.js:placeBid`).
- **3.2.4 Realtime Observer**: `EventBus` + `BroadcastChannel` để các tab cùng phiên đồng bộ ngay khi có bid mới.
- **3.2.5 Bid History Visualization**: Line chart Chart.js, trục X = thời gian, trục Y = giá, tự cập nhật khi có bid mới.

### 3.3 OOP
- `Entity → Item → Electronics / Art / Vehicle`
- `Entity → User` (lưu dưới dạng object có `role`)
- `Auction`, `BidTransaction` (bid lưu trong `store.bids`)
- Áp dụng Encapsulation, Inheritance, Polymorphism, Abstraction (xem `js/store.js`)

### 3.4 Kiến trúc
- Single-page web app, model phân tách rõ:
  - **View**: HTML + DOM build trong `js/pages/*`.
  - **Controller**: hàm event handler trong `js/app.js` + `js/pages/*`.
  - **Model**: `js/store.js` (đơn nhất — Singleton).
- Giao tiếp realtime giữa các tab: `BroadcastChannel` (mô phỏng Socket).
- (Khi cần triển khai backend thật, có thể thay `store.js` bằng REST API client, model giữ nguyên.)

### 3.5 Tích hợp & triển khai
- Mã nguồn tổ chức theo module (`<script type="module">`), không lib build.
- Có thể deploy lên bất kỳ static host: GitHub Pages, Vercel, Netlify, Cloudflare Pages...

### 3.6 Design Pattern áp dụng
- **Singleton**: `store` (`js/store.js`).
- **Factory**: `createItem` tạo Electronics/Art/Vehicle (`js/store.js`).
- **Observer**: `EventBus.on('bid'|'change'|'tick'|'auth')` + `BroadcastChannel`.
- **Strategy**: Manual bid vs Auto-Bid xử lý cùng `placeBid` nhưng nguồn gốc khác (`isAuto`).

## 4. Cách chỉnh sửa giao diện (redesign)

1. Toàn bộ màu/font tập trung trong `styles/theme.css` — chỉ cần đổi CSS variables.
2. Layout từng trang nằm trong `js/pages/*.js` — DOM được build bằng helper `el(...)`. Bạn có thể chuyển sang Tailwind/Bootstrap dễ dàng.
3. Ảnh sản phẩm dùng URL placeholder từ Unsplash trong `js/seed.js` — sửa hoặc tải về thay ảnh thật.

## 5. Hằng số có thể tinh chỉnh

| Tham số           | Vị trí           | Mặc định |
|-------------------|------------------|----------|
| Anti-snipe X / Y  | `js/store.js`    | 30s / 60s |
| Tick interval     | `js/store.js`    | 1000 ms |
| Storage key       | `js/store.js`    | `auction_db_v1` |

## 6. Tiếp theo bạn có thể làm

- Thay theme/màu trong `styles/theme.css` để phù hợp branding.
- Bổ sung backend REST (Spring Boot / Node) nếu cần triển khai thật — chỉ thay `store.js`.
- Thêm thanh toán giả lập / chat với người bán...

Chúc bạn code vui! 🎯
