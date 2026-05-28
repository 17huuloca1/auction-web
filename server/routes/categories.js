const express = require('express');
const { getDB } = require('../database/db');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const categories = db.prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) as product_count
     FROM categories c ORDER BY c.sort_order ASC`
  ).all();
  res.json({ categories });
});

router.get('/:slug', (req, res) => {
  const db = getDB();
  const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!category) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
  res.json({ category });
});

module.exports = router;
