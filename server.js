const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDB } = require('./server/database/db');
const { seedData } = require('./server/database/seed');

const authRoutes = require('./server/routes/auth');
const productRoutes = require('./server/routes/products');
const categoryRoutes = require('./server/routes/categories');
const cartRoutes = require('./server/routes/cart');
const orderRoutes = require('./server/routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB();
seedData();

app.listen(PORT, () => {
  console.log(`🥜 Hạt Điều Shop đang chạy tại http://localhost:${PORT}`);
});
