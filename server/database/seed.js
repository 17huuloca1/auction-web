const { getDB } = require('./db');
const bcrypt = require('bcryptjs');

function seedData() {
  const db = getDB();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  const adminPass = bcrypt.hashSync('admin123', 10);
  const userPass = bcrypt.hashSync('123456', 10);

  db.prepare(`INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('Admin Shop', 'admin@hatdieu.vn', adminPass, 'admin', '0901234567', 'Bình Phước, Việt Nam');
  db.prepare(`INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('Nguyễn Văn A', 'user@hatdieu.vn', userPass, 'customer', '0912345678', '123 Nguyễn Huệ, Q1, TP.HCM');

  const categories = [
    { name: 'Hạt điều rang muối', slug: 'rang-muoi', description: 'Hạt điều rang muối giòn tan, thơm ngon', image: '🧂', sort: 1 },
    { name: 'Hạt điều tự nhiên', slug: 'tu-nhien', description: 'Hạt điều nguyên chất, không gia vị', image: '🌿', sort: 2 },
    { name: 'Hạt điều mật ong', slug: 'mat-ong', description: 'Hạt điều tẩm mật ong ngọt dịu', image: '🍯', sort: 3 },
    { name: 'Hạt điều wasabi', slug: 'wasabi', description: 'Hạt điều vị wasabi cay nồng', image: '🟢', sort: 4 },
    { name: 'Hạt điều phô mai', slug: 'pho-mai', description: 'Hạt điều phủ phô mai béo ngậy', image: '🧀', sort: 5 },
    { name: 'Hạt điều tỏi ớt', slug: 'toi-ot', description: 'Hạt điều cay cay, thơm tỏi', image: '🌶️', sort: 6 },
    { name: 'Bơ & Sữa hạt điều', slug: 'bo-sua', description: 'Bơ hạt điều, sữa hạt điều dinh dưỡng', image: '🥛', sort: 7 },
    { name: 'Quà tặng', slug: 'qua-tang', description: 'Set quà tặng hạt điều cao cấp', image: '🎁', sort: 8 },
  ];

  const insertCat = db.prepare('INSERT INTO categories (name, slug, description, image, sort_order) VALUES (?, ?, ?, ?, ?)');
  for (const c of categories) {
    insertCat.run(c.name, c.slug, c.description, c.image, c.sort);
  }

  const products = [
    {
      name: 'Hạt điều rang muối Bình Phước 500g',
      slug: 'hat-dieu-rang-muoi-500g',
      description: 'Hạt điều rang muối giòn tan, thơm bùi đặc trưng. Sản phẩm được chế biến từ những hạt điều tươi ngon nhất vùng Bình Phước.',
      detail: 'Hạt điều được tuyển chọn kỹ lưỡng từ vùng nguyên liệu Bình Phước. Rang ở nhiệt độ vừa phải để giữ nguyên hương vị tự nhiên. Muối biển tinh khiết tạo vị mặn nhẹ hài hòa. Đóng gói hút chân không giữ độ giòn lâu dài.',
      price: 185000, original_price: 220000, category_id: 1,
      image: 'https://images.unsplash.com/photo-1509721434272-b79147e0e708?w=400',
      stock: 200, unit: 'gói', weight: '500g', rating: 4.8, review_count: 156, sold: 1250, featured: 1
    },
    {
      name: 'Hạt điều rang muối loại A 1kg',
      slug: 'hat-dieu-rang-muoi-1kg',
      description: 'Hạt điều rang muối loại A nguyên hạt, size lớn. Thích hợp dùng hàng ngày hoặc làm quà biếu.',
      detail: 'Hạt điều WW240 - loại hạt lớn nhất, nguyên vẹn. Rang chín đều, giòn rụm. Vị mặn nhẹ tự nhiên.',
      price: 350000, original_price: 420000, category_id: 1,
      image: 'https://images.unsplash.com/photo-1563292769-4e05b684851a?w=400',
      stock: 150, unit: 'gói', weight: '1kg', rating: 4.9, review_count: 89, sold: 780, featured: 1
    },
    {
      name: 'Hạt điều rang muối tiêu đen 300g',
      slug: 'hat-dieu-rang-muoi-tieu-den-300g',
      description: 'Hạt điều rang muối kết hợp tiêu đen Phú Quốc. Vị cay nhẹ, thơm nồng.',
      detail: 'Sự kết hợp hoàn hảo giữa hạt điều giòn tan và tiêu đen Phú Quốc. Vị mặn mặn cay cay kích thích vị giác.',
      price: 125000, original_price: 150000, category_id: 1,
      image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400',
      stock: 300, unit: 'gói', weight: '300g', rating: 4.7, review_count: 67, sold: 520, featured: 0
    },
    {
      name: 'Hạt điều tự nhiên nguyên hạt 500g',
      slug: 'hat-dieu-tu-nhien-500g',
      description: 'Hạt điều tự nhiên không rang, giữ nguyên dinh dưỡng. Phù hợp cho người ăn kiêng, eat clean.',
      detail: 'Hạt điều sấy nhẹ ở nhiệt độ thấp, giữ nguyên vitamin và khoáng chất. Không muối, không đường, không chất bảo quản.',
      price: 195000, original_price: 230000, category_id: 2,
      image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400',
      stock: 180, unit: 'gói', weight: '500g', rating: 4.6, review_count: 45, sold: 380, featured: 1
    },
    {
      name: 'Hạt điều tự nhiên WW320 1kg',
      slug: 'hat-dieu-tu-nhien-ww320-1kg',
      description: 'Hạt điều trắng WW320 cao cấp, nguyên hạt không vỡ. Tiêu chuẩn xuất khẩu.',
      detail: 'Tiêu chuẩn WW320 - 320 hạt/pound. Hạt trắng, đều, không sâu mọt. Phù hợp làm nguyên liệu nấu ăn hoặc ăn trực tiếp.',
      price: 380000, original_price: 450000, category_id: 2,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
      stock: 120, unit: 'gói', weight: '1kg', rating: 4.9, review_count: 34, sold: 290, featured: 0
    },
    {
      name: 'Hạt điều mật ong 400g',
      slug: 'hat-dieu-mat-ong-400g',
      description: 'Hạt điều tẩm mật ong rừng nguyên chất. Vị ngọt dịu tự nhiên, giòn thơm.',
      detail: 'Hạt điều rang giòn sau đó tẩm mật ong rừng Tây Nguyên. Lớp mật ong mỏng bao phủ đều, vị ngọt thanh không gắt.',
      price: 165000, original_price: 195000, category_id: 3,
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
      stock: 250, unit: 'gói', weight: '400g', rating: 4.8, review_count: 112, sold: 890, featured: 1
    },
    {
      name: 'Hạt điều mật ong chanh dây 300g',
      slug: 'hat-dieu-mat-ong-chanh-day-300g',
      description: 'Hạt điều mật ong kết hợp chanh dây chua ngọt. Hương vị độc đáo, lạ miệng.',
      detail: 'Sự kết hợp mới lạ giữa mật ong và chanh dây. Vị chua nhẹ của chanh dây hòa quyện với mật ong ngọt dịu.',
      price: 135000, original_price: 160000, category_id: 3,
      image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400',
      stock: 200, unit: 'gói', weight: '300g', rating: 4.5, review_count: 38, sold: 310, featured: 0
    },
    {
      name: 'Hạt điều wasabi 350g',
      slug: 'hat-dieu-wasabi-350g',
      description: 'Hạt điều phủ wasabi Nhật Bản. Cay nồng, kích thích vị giác, phù hợp nhâm nhi.',
      detail: 'Hạt điều được phủ lớp wasabi nguyên chất nhập khẩu từ Nhật Bản. Cay nồng mũi nhưng ngọt hậu.',
      price: 145000, original_price: 175000, category_id: 4,
      image: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=400',
      stock: 180, unit: 'gói', weight: '350g', rating: 4.4, review_count: 78, sold: 650, featured: 1
    },
    {
      name: 'Hạt điều phô mai 400g',
      slug: 'hat-dieu-pho-mai-400g',
      description: 'Hạt điều phủ phô mai béo ngậy. Thơm lừng hấp dẫn, ăn là ghiền.',
      detail: 'Phô mai Cheddar nhập khẩu phủ đều lên hạt điều giòn. Béo ngậy, thơm lừng. Phù hợp mọi lứa tuổi.',
      price: 155000, original_price: 185000, category_id: 5,
      image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400',
      stock: 220, unit: 'gói', weight: '400g', rating: 4.7, review_count: 93, sold: 720, featured: 1
    },
    {
      name: 'Hạt điều tỏi ớt 300g',
      slug: 'hat-dieu-toi-ot-300g',
      description: 'Hạt điều tẩm tỏi ớt cay nồng. Đậm đà hương vị Việt Nam.',
      detail: 'Tỏi phi vàng giòn kết hợp ớt hiểm Tây Nguyên. Vị cay vừa phải, thơm tỏi quyến rũ. Nhâm nhi cùng bia rất hợp.',
      price: 125000, original_price: 150000, category_id: 6,
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
      stock: 280, unit: 'gói', weight: '300g', rating: 4.6, review_count: 56, sold: 430, featured: 0
    },
    {
      name: 'Hạt điều tỏi ớt siêu cay 250g',
      slug: 'hat-dieu-toi-ot-sieu-cay-250g',
      description: 'Phiên bản siêu cay dành cho tín đồ ăn cay. Hạt điều tẩm tỏi ớt Carolina Reaper.',
      detail: 'Dành cho những ai yêu vị cay. Ớt Carolina Reaper kết hợp tỏi tạo nên hương vị cực đoan nhưng đầy cuốn hút.',
      price: 135000, original_price: 165000, category_id: 6,
      image: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400',
      stock: 150, unit: 'gói', weight: '250g', rating: 4.3, review_count: 42, sold: 280, featured: 0
    },
    {
      name: 'Bơ hạt điều nguyên chất 250g',
      slug: 'bo-hat-dieu-250g',
      description: 'Bơ hạt điều xay mịn 100% nguyên chất. Không đường, không muối, không phụ gia.',
      detail: 'Hạt điều rang chín xay nhuyễn thành bơ mịn. Giàu protein, chất béo tốt. Phù hợp ăn kèm bánh mì, trái cây, smoothie.',
      price: 175000, original_price: 210000, category_id: 7,
      image: 'https://images.unsplash.com/photo-1612187209234-192e31e37a04?w=400',
      stock: 100, unit: 'hũ', weight: '250g', rating: 4.8, review_count: 67, sold: 490, featured: 1
    },
    {
      name: 'Sữa hạt điều 1 lít',
      slug: 'sua-hat-dieu-1lit',
      description: 'Sữa hạt điều tươi nguyên chất. Thay thế sữa bò, phù hợp người ăn chay, dị ứng lactose.',
      detail: 'Sữa hạt điều ép lạnh, giữ nguyên dưỡng chất. Giàu canxi, vitamin E. Vị béo nhẹ, thanh mát.',
      price: 85000, original_price: 100000, category_id: 7,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
      stock: 80, unit: 'chai', weight: '1 lít', rating: 4.5, review_count: 29, sold: 210, featured: 0
    },
    {
      name: 'Set quà tặng Premium 6 vị',
      slug: 'set-qua-tang-premium-6vi',
      description: 'Hộp quà sang trọng gồm 6 vị hạt điều đặc biệt. Thích hợp biếu tặng dịp lễ, Tết.',
      detail: 'Bao gồm: Rang muối, Mật ong, Wasabi, Phô mai, Tỏi ớt, Tự nhiên. Mỗi gói 100g. Hộp gỗ cao cấp có nơ.',
      price: 450000, original_price: 550000, category_id: 8,
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238f760?w=400',
      stock: 50, unit: 'hộp', weight: '600g', rating: 5.0, review_count: 23, sold: 180, featured: 1
    },
    {
      name: 'Set quà tặng Deluxe 4 vị',
      slug: 'set-qua-tang-deluxe-4vi',
      description: 'Hộp quà 4 vị hạt điều best-seller. Sang trọng, tinh tế.',
      detail: 'Bao gồm: Rang muối, Mật ong, Phô mai, Tự nhiên. Mỗi gói 150g. Hộp thiếc cao cấp.',
      price: 320000, original_price: 380000, category_id: 8,
      image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400',
      stock: 80, unit: 'hộp', weight: '600g', rating: 4.9, review_count: 41, sold: 350, featured: 1
    },
    {
      name: 'Hạt điều rang muối mini 100g',
      slug: 'hat-dieu-rang-muoi-mini-100g',
      description: 'Gói nhỏ tiện lợi mang theo. Hạt điều rang muối giòn tan.',
      detail: 'Gói nhỏ 100g tiện lợi cho việc mang theo khi đi làm, đi học, du lịch. Hạt điều rang muối giòn rụm.',
      price: 45000, original_price: 55000, category_id: 1,
      image: 'https://images.unsplash.com/photo-1509721434272-b79147e0e708?w=400',
      stock: 500, unit: 'gói', weight: '100g', rating: 4.6, review_count: 201, sold: 2100, featured: 0
    },
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (name, slug, description, detail, price, original_price, category_id, image, stock, unit, weight, rating, review_count, sold, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of products) {
    insertProd.run(
      p.name, p.slug, p.description, p.detail, p.price, p.original_price,
      p.category_id, p.image, p.stock, p.unit, p.weight, p.rating,
      p.review_count, p.sold, p.featured
    );
  }

  console.log('✅ Seed data thành công!');
}

module.exports = { seedData };
