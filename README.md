# 🥜 Hạt Điều Shop - Website Bán Hạt Điều Bình Phước

Website thương mại điện tử bán hạt điều với đầy đủ chức năng frontend và backend.

## Tính năng

- **Sản phẩm**: Danh sách sản phẩm với hình ảnh, giá, mô tả, đánh giá
- **Danh mục**: 8 danh mục hạt điều (rang muối, tự nhiên, mật ong, wasabi, phô mai, tỏi ớt, bơ/sữa, quà tặng)
- **Tìm kiếm**: Tìm kiếm sản phẩm theo tên, mô tả
- **Lọc & Sắp xếp**: Lọc theo danh mục, sắp xếp theo giá/bán chạy/mới nhất
- **Đăng nhập/Đăng ký**: Đăng ký tài khoản hoặc đăng nhập bằng Google
- **Giỏ hàng**: Thêm/xóa sản phẩm, cập nhật số lượng
- **Thanh toán**: Trang checkout với nhiều phương thức (COD, chuyển khoản, MoMo, ZaloPay)
- **Đơn hàng**: Theo dõi lịch sử đơn hàng, hủy đơn
- **Responsive**: Tương thích mọi kích thước màn hình

## Tech Stack

- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript (ES Modules)
- **Backend**: Node.js + Express.js
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT + bcrypt + Google OAuth

## Cài đặt & Chạy

```bash
# Cài đặt dependencies
npm install

# Chạy server (tự động seed dữ liệu mẫu)
npm start

# Mở trình duyệt
# http://localhost:3000
```

## Tài khoản demo

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| admin@hatdieu.vn | admin123 | Admin |
| user@hatdieu.vn | 123456 | Khách hàng |

## Cấu trúc dự án

```
├── server.js                 # Express server chính
├── server/
│   ├── database/
│   │   ├── db.js            # Kết nối SQLite + schema
│   │   └── seed.js          # Dữ liệu mẫu
│   ├── middleware/
│   │   └── auth.js          # JWT middleware
│   └── routes/
│       ├── auth.js          # Đăng nhập/Đăng ký/Google OAuth
│       ├── products.js      # API sản phẩm
│       ├── categories.js    # API danh mục
│       ├── cart.js          # API giỏ hàng
│       └── orders.js        # API đơn hàng
├── public/
│   ├── index.html           # Trang HTML chính
│   ├── css/style.css        # Styles
│   └── js/
│       ├── app.js           # SPA Router + Init
│       ├── api.js           # API Client
│       ├── auth.js          # Auth state
│       ├── utils.js         # Helper functions
│       └── pages/           # Các trang
│           ├── home.js      # Trang chủ
│           ├── products.js  # Danh sách sản phẩm
│           ├── product-detail.js
│           ├── cart.js      # Giỏ hàng
│           ├── checkout.js  # Thanh toán
│           ├── orders.js    # Đơn hàng
│           └── profile.js   # Tài khoản
└── package.json
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/google` - Đăng nhập Google
- `GET /api/auth/me` - Thông tin user
- `PUT /api/auth/profile` - Cập nhật profile

### Products
- `GET /api/products` - Danh sách sản phẩm (search, filter, sort, pagination)
- `GET /api/products/featured` - Sản phẩm nổi bật
- `GET /api/products/best-sellers` - Bán chạy nhất
- `GET /api/products/:slug` - Chi tiết sản phẩm

### Categories
- `GET /api/categories` - Danh sách danh mục

### Cart
- `GET /api/cart` - Xem giỏ hàng
- `POST /api/cart/add` - Thêm sản phẩm
- `PUT /api/cart/:id` - Cập nhật số lượng
- `DELETE /api/cart/:id` - Xóa sản phẩm

### Orders
- `POST /api/orders` - Đặt hàng
- `GET /api/orders` - Lịch sử đơn hàng
- `GET /api/orders/:id` - Chi tiết đơn hàng
- `PUT /api/orders/:id/cancel` - Hủy đơn hàng
