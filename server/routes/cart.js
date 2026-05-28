const express = require('express');
const { getDB } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const items = db.prepare(`
    SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.slug, p.price, p.original_price, p.image, p.stock, p.unit, p.weight
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ? AND p.active = 1
    ORDER BY ci.created_at DESC
  `).all(req.user.id);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ items, subtotal });
});

router.post('/add', authMiddleware, (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ error: 'Thiếu thông tin sản phẩm' });

  const db = getDB();
  const product = db.prepare('SELECT id, stock FROM products WHERE id = ? AND active = 1').get(product_id);
  if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });

  const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(req.user.id, product_id);

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > product.stock) {
      return res.status(400).json({ error: 'Vượt quá số lượng tồn kho' });
    }
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
  } else {
    if (quantity > product.stock) {
      return res.status(400).json({ error: 'Vượt quá số lượng tồn kho' });
    }
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)')
      .run(req.user.id, product_id, quantity);
  }

  const count = db.prepare('SELECT SUM(quantity) as count FROM cart_items WHERE user_id = ?').get(req.user.id);
  res.json({ message: 'Đã thêm vào giỏ hàng', cartCount: count.count || 0 });
});

router.put('/:id', authMiddleware, (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Số lượng không hợp lệ' });
  }
  const db = getDB();
  const item = db.prepare(`
    SELECT ci.id, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id
    WHERE ci.id = ? AND ci.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!item) return res.status(404).json({ error: 'Không tìm thấy sản phẩm trong giỏ' });
  if (quantity > item.stock) return res.status(400).json({ error: 'Vượt quá số lượng tồn kho' });

  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
  res.json({ message: 'Đã cập nhật số lượng' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Đã xóa khỏi giỏ hàng' });
});

router.get('/count', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.prepare('SELECT SUM(quantity) as count FROM cart_items WHERE user_id = ?').get(req.user.id);
  res.json({ count: result.count || 0 });
});

module.exports = router;
