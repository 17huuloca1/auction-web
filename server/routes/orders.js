const express = require('express');
const { getDB } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function generateOrderCode() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `HD${y}${m}${d}${rand}`;
}

router.post('/', authMiddleware, (req, res) => {
  const { customer_name, customer_phone, customer_email, shipping_address, note, payment_method } = req.body;

  if (!customer_name || !customer_phone || !shipping_address) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin giao hàng' });
  }

  const db = getDB();
  const cartItems = db.prepare(`
    SELECT ci.quantity, p.id as product_id, p.name, p.price, p.image, p.stock
    FROM cart_items ci JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ? AND p.active = 1
  `).all(req.user.id);

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Giỏ hàng trống' });
  }

  for (const item of cartItems) {
    if (item.quantity > item.stock) {
      return res.status(400).json({ error: `Sản phẩm "${item.name}" chỉ còn ${item.stock} trong kho` });
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping_fee = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shipping_fee;
  const order_code = generateOrderCode();

  const orderResult = db.prepare(`
    INSERT INTO orders (user_id, order_code, customer_name, customer_phone, customer_email, shipping_address, note, payment_method, subtotal, shipping_fee, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, order_code, customer_name, customer_phone,
    customer_email || '', shipping_address, note || '',
    payment_method || 'cod', subtotal, shipping_fee, total, 'pending'
  );

  const orderId = orderResult.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const updateStock = db.prepare('UPDATE products SET stock = stock - ?, sold = sold + ? WHERE id = ?');

  for (const item of cartItems) {
    insertItem.run(orderId, item.product_id, item.name, item.image, item.price, item.quantity);
    updateStock.run(item.quantity, item.quantity, item.product_id);
  }

  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

  res.json({
    message: 'Đặt hàng thành công!',
    order: { id: orderId, order_code, total, status: 'pending' }
  });
});

router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const orders = db.prepare(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);

  for (const order of orders) {
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  }
  res.json({ orders });
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ order });
});

router.put('/:id/cancel', authMiddleware, (req, res) => {
  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  if (order.status !== 'pending') {
    return res.status(400).json({ error: 'Chỉ có thể hủy đơn hàng đang chờ xử lý' });
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('canceled', order.id);

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const restoreStock = db.prepare('UPDATE products SET stock = stock + ?, sold = sold - ? WHERE id = ?');
  for (const item of items) {
    restoreStock.run(item.quantity, item.quantity, item.product_id);
  }

  res.json({ message: 'Đã hủy đơn hàng' });
});

module.exports = router;
