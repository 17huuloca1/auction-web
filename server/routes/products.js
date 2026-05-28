const express = require('express');
const { getDB } = require('../database/db');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const { category, search, sort, page = 1, limit = 12, featured } = req.query;
  let sql = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.active = 1`;
  const params = [];

  if (category) {
    sql += ` AND c.slug = ?`;
    params.push(category);
  }
  if (search) {
    sql += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (featured === '1') {
    sql += ` AND p.featured = 1`;
  }

  const countSql = sql.replace('SELECT p.*, c.name as category_name', 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countSql).get(...params);

  switch (sort) {
    case 'price_asc': sql += ` ORDER BY p.price ASC`; break;
    case 'price_desc': sql += ` ORDER BY p.price DESC`; break;
    case 'newest': sql += ` ORDER BY p.created_at DESC`; break;
    case 'best_selling': sql += ` ORDER BY p.sold DESC`; break;
    case 'rating': sql += ` ORDER BY p.rating DESC`; break;
    default: sql += ` ORDER BY p.featured DESC, p.sold DESC`;
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  sql += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const products = db.prepare(sql).all(...params);
  res.json({
    products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
});

router.get('/featured', (req, res) => {
  const db = getDB();
  const products = db.prepare(
    `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.active = 1 AND p.featured = 1 ORDER BY p.sold DESC LIMIT 8`
  ).all();
  res.json({ products });
});

router.get('/best-sellers', (req, res) => {
  const db = getDB();
  const products = db.prepare(
    `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.active = 1 ORDER BY p.sold DESC LIMIT 8`
  ).all();
  res.json({ products });
});

router.get('/:slug', (req, res) => {
  const db = getDB();
  const product = db.prepare(
    `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ? AND p.active = 1`
  ).get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

  const related = db.prepare(
    `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? AND p.id != ? AND p.active = 1 LIMIT 4`
  ).all(product.category_id, product.id);

  res.json({ product, related });
});

module.exports = router;
