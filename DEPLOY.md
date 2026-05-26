# 🚀 Hướng Dẫn Triển Khai AuctionVN Lên Host

> **Câu trả lời ngắn cho câu hỏi "có upload lên host được không?":**
> **CÓ — và rất dễ.** AuctionVN là **static SPA** (chỉ HTML/CSS/JavaScript thuần), không cần backend / database / Node.js để chạy production. Bạn có thể upload lên **bất kỳ host nào hỗ trợ tệp tĩnh**.

Dưới đây là 4 cách triển khai phổ biến nhất, sắp xếp theo mức độ **đơn giản → tùy biến cao**.

---

## ✅ Cách 1 — GitHub Pages (MIỄN PHÍ, KHUYẾN NGHỊ)

Đây là cách dễ nhất, chỉ mất 2 phút.

### Các bước
1. Mở repo trên GitHub: <https://github.com/17huuloca1/auction-web>
2. Vào tab **Settings** → menu trái chọn **Pages**.
3. Trong mục **Build and deployment** → **Source** → chọn **Deploy from a branch**.
4. Branch: chọn **`main`** + folder **`/ (root)`** → bấm **Save**.
5. Đợi ~30 giây. Site sẽ live tại URL:
   ```
   https://17huuloca1.github.io/auction-web/
   ```
6. Mỗi lần bạn push code lên `main`, GitHub Pages **tự deploy lại** — không cần làm gì thêm.

### Ưu / nhược
- ✅ Miễn phí trọn đời, không giới hạn traffic.
- ✅ Tích hợp sẵn HTTPS.
- ✅ Tự động deploy mỗi commit.
- ⚠️ URL dạng `username.github.io/repo` — muốn domain riêng phải mua tên miền.

---

## ✅ Cách 2 — Netlify (MIỄN PHÍ, tự động CD)

### Các bước
1. Vào <https://app.netlify.com>, đăng nhập bằng tài khoản GitHub.
2. Bấm **"Add new site" → "Import an existing project"**.
3. Chọn provider **GitHub** → cho phép Netlify truy cập repo `auction-web`.
4. Chọn branch **`main`**, các trường:
   - **Build command**: để **TRỐNG** (không cần build).
   - **Publish directory**: gõ **`/`** (hoặc để mặc định).
5. Bấm **Deploy site**.
6. Netlify trả lại URL dạng `https://<random-name>.netlify.app`. Có thể vào **Site settings → Change site name** để đặt tên đẹp hơn, ví dụ: `https://auctionvn.netlify.app`.

### Ưu / nhược
- ✅ Auto deploy mỗi commit + tạo URL preview cho mỗi pull request.
- ✅ Hỗ trợ custom domain miễn phí + HTTPS tự động.
- ✅ Có Drag-and-drop: kéo nguyên thư mục source vào netlify.com là deploy luôn (không cần qua GitHub).

---

## ✅ Cách 3 — Vercel (MIỄN PHÍ, preview cho mỗi PR)

### Các bước
1. Vào <https://vercel.com>, đăng nhập bằng GitHub.
2. Bấm **"Add New… → Project"**.
3. Chọn repo `auction-web` → bấm **Import**.
4. Trong màn hình config:
   - **Framework Preset**: chọn **Other**.
   - **Build & Output**: để mặc định trống.
5. Bấm **Deploy**. Đợi ~20 giây.
6. URL production: `https://auction-web-<random>.vercel.app`.

### Ưu / nhược
- ✅ Mỗi pull request có URL preview riêng (cực hữu ích khi nhiều người review).
- ✅ Analytics miễn phí (lượt truy cập, thời gian load).
- ✅ Custom domain + HTTPS miễn phí.

---

## ✅ Cách 4 — Host truyền thống (cPanel / Hostinger / Vietnix / VPS có FTP)

Nếu bạn đã có host trả phí (mua domain Việt Nam, có cPanel hoặc DirectAdmin), làm như sau:

### Bước A — Lấy source về máy
- Option 1: `git clone https://github.com/17huuloca1/auction-web.git`
- Option 2: Trên GitHub bấm **Code → Download ZIP**, giải nén.

### Bước B — Upload lên host
**Cách 1: Dùng File Manager của cPanel**
1. Đăng nhập cPanel → mở **File Manager**.
2. Vào thư mục **`public_html`** (hoặc thư mục root của domain).
3. Bấm **Upload** → chọn các file/thư mục sau (KHÔNG cần upload `.git`, `node_modules` nếu có):
   - `index.html`
   - `styles/`
   - `js/`
   - `assets/` (nếu có)
4. Sau khi upload xong, mở trình duyệt vào `https://yourdomain.com` — site chạy ngay.

**Cách 2: Dùng FTP client (FileZilla / Cyberduck)**
1. Mở **FileZilla** → File → Site Manager → New Site.
2. Nhập:
   - **Host**: `ftp.yourdomain.com` (hoặc IP host).
   - **Username** / **Password**: do host cung cấp.
   - **Protocol**: FTP hoặc SFTP (nếu hỗ trợ).
3. Kết nối → vào thư mục `public_html/` (bên phải).
4. Kéo thả toàn bộ source (bên trái) sang bên phải.

### Bước C — Cấu hình thêm (nếu cần)
- Nếu domain ở root: bỏ vào `/public_html/`.
- Nếu muốn chạy ở subfolder, ví dụ `yourdomain.com/auction/`: tạo thư mục `auction/` trong `public_html/` rồi upload vào đó.

---

## 🔧 Cách 5 — Test nhanh trên máy local (không deploy)

Nếu chỉ muốn chạy thử trên máy:
```bash
# Cách 1: dùng Python 3 (có sẵn trên macOS/Linux)
cd auction-web
python3 -m http.server 8080
# Mở http://localhost:8080

# Cách 2: dùng Node.js (nếu cài rồi)
npx serve auction-web
# hoặc
npx http-server auction-web -p 8080
```

> ⚠️ **Lưu ý**: KHÔNG nên mở `index.html` trực tiếp bằng `file://` — một số trình duyệt chặn ES Modules trên giao thức `file://`. Phải qua HTTP server.

---

## 📋 Checklist trước khi deploy

- [x] Tất cả ảnh / icon đã được đưa vào repo (không phụ thuộc localhost).
- [x] Không có biến môi trường (`.env`) cần cấu hình — đây là pure static.
- [x] Không có endpoint API nào cần điều chỉnh — toàn bộ dữ liệu chạy bằng localStorage.
- [x] Đã test trên trình duyệt mới nhất (Chrome / Edge / Firefox / Safari).

---

## 💡 Câu hỏi thường gặp

**Hỏi: Khi nhiều người dùng cùng truy cập site đã deploy, họ có thấy chung dữ liệu không?**
Không. AuctionVN dùng `localStorage` — dữ liệu lưu **trong từng trình duyệt**. Mỗi người dùng có một "vũ trụ" riêng. Nếu muốn nhiều người dùng thấy chung phiên đấu giá (đa người dùng thật sự), bạn cần thêm backend (REST API + database).

**Hỏi: Có cần SSL / HTTPS không?**
Tất cả 4 host miễn phí trên (GitHub Pages, Netlify, Vercel, Cloudflare Pages) đều **tự động cấp HTTPS miễn phí**. Riêng host truyền thống thì bạn cần cài cert (Let's Encrypt qua cPanel — thường free 1 click).

**Hỏi: Làm sao đổi nội dung sau khi deploy?**
- Với GitHub Pages / Netlify / Vercel: chỉ cần `git push` → tự deploy lại.
- Với cPanel / FTP: upload lại các file đã sửa, ghi đè file cũ.

**Hỏi: Có cần `node_modules` không?**
**KHÔNG.** Project không dùng npm. `package.json` không tồn tại. Tất cả thư viện (Chart.js, date-fns) đều load qua CDN trong `index.html`.

---

## 🎯 Tóm lại — Nên chọn cách nào?

| Tình huống | Khuyến nghị |
|---|---|
| Demo nhanh cho thầy cô / sếp | **GitHub Pages** (2 phút, miễn phí) |
| Muốn URL đẹp, preview PR, analytics | **Vercel** hoặc **Netlify** |
| Có sẵn host trả phí với domain Việt | **cPanel + File Manager** |
| Khách hàng yêu cầu hệ thống thật sự đa người dùng | Cần thêm backend (Node.js + MongoDB / Spring Boot + MySQL) |

---

**Chúc bạn deploy thành công! 🚀**
Mọi câu hỏi vui lòng tạo Issue tại: <https://github.com/17huuloca1/auction-web/issues>
