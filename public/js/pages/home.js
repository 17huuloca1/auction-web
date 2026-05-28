import { api } from '../api.js';
import { formatVND, renderStars, truncate, showToast } from '../utils.js';
import { isLoggedIn, showAuthModal } from '../auth.js';

export async function renderHome(container) {
  container.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;

  try {
    const [featuredData, bestSellerData, categoriesData] = await Promise.all([
      api.products.featured(),
      api.products.bestSellers(),
      api.categories.list(),
    ]);

    container.innerHTML = `
      <!-- Hero Banner -->
      <section class="hero">
        <div class="container">
          <div class="hero-content">
            <h1>Hạt Điều Bình Phước<br/><span class="highlight">Chính Hãng 100%</span></h1>
            <p>Trực tiếp từ vườn đến tay bạn. Cam kết hạt điều tươi ngon, giòn rụm, không chất bảo quản.</p>
            <div class="hero-actions">
              <a href="#/products" class="btn btn-primary btn-lg">Mua ngay <i class="fas fa-arrow-right"></i></a>
              <a href="#/products?category=qua-tang" class="btn btn-outline btn-lg">Quà tặng <i class="fas fa-gift"></i></a>
            </div>
            <div class="hero-stats">
              <div class="stat"><strong>10,000+</strong><span>Khách hàng</span></div>
              <div class="stat"><strong>50+</strong><span>Sản phẩm</span></div>
              <div class="stat"><strong>4.9★</strong><span>Đánh giá</span></div>
              <div class="stat"><strong>100%</strong><span>Chính hãng</span></div>
            </div>
          </div>
          <div class="hero-image">
            <img src="https://images.unsplash.com/photo-1509721434272-b79147e0e708?w=600&h=400&fit=crop" alt="Hạt điều" loading="lazy" />
          </div>
        </div>
      </section>

      <!-- Categories -->
      <section class="section">
        <div class="container">
          <div class="section-header">
            <h2><i class="fas fa-th-large"></i> Danh Mục Sản Phẩm</h2>
            <a href="#/products" class="view-all">Xem tất cả <i class="fas fa-chevron-right"></i></a>
          </div>
          <div class="category-grid">
            ${categoriesData.categories.map(c => `
              <a href="#/products?category=${c.slug}" class="category-card">
                <span class="category-icon">${c.image}</span>
                <h3>${c.name}</h3>
                <p>${c.product_count} sản phẩm</p>
              </a>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Featured Products -->
      <section class="section section-alt">
        <div class="container">
          <div class="section-header">
            <h2><i class="fas fa-star"></i> Sản Phẩm Nổi Bật</h2>
            <a href="#/products?featured=1" class="view-all">Xem tất cả <i class="fas fa-chevron-right"></i></a>
          </div>
          <div class="product-grid">
            ${featuredData.products.map(p => productCard(p)).join('')}
          </div>
        </div>
      </section>

      <!-- Best Sellers -->
      <section class="section">
        <div class="container">
          <div class="section-header">
            <h2><i class="fas fa-fire"></i> Bán Chạy Nhất</h2>
            <a href="#/products?sort=best_selling" class="view-all">Xem tất cả <i class="fas fa-chevron-right"></i></a>
          </div>
          <div class="product-grid">
            ${bestSellerData.products.map(p => productCard(p)).join('')}
          </div>
        </div>
      </section>

      <!-- Benefits -->
      <section class="section section-alt">
        <div class="container">
          <div class="section-header">
            <h2><i class="fas fa-heart"></i> Tại Sao Chọn Chúng Tôi?</h2>
          </div>
          <div class="benefits-grid">
            <div class="benefit-card">
              <i class="fas fa-leaf"></i>
              <h3>100% Tự Nhiên</h3>
              <p>Hạt điều được trồng và chế biến hoàn toàn tự nhiên, không sử dụng hóa chất.</p>
            </div>
            <div class="benefit-card">
              <i class="fas fa-award"></i>
              <h3>Chất Lượng Cao</h3>
              <p>Tuyển chọn kỹ lưỡng từ vùng nguyên liệu tốt nhất Bình Phước.</p>
            </div>
            <div class="benefit-card">
              <i class="fas fa-truck"></i>
              <h3>Giao Hàng Nhanh</h3>
              <p>Miễn phí giao hàng toàn quốc cho đơn hàng từ 500.000đ.</p>
            </div>
            <div class="benefit-card">
              <i class="fas fa-undo"></i>
              <h3>Đổi Trả Dễ Dàng</h3>
              <p>Cam kết đổi trả trong 7 ngày nếu sản phẩm không đạt chất lượng.</p>
            </div>
          </div>
        </div>
      </section>
    `;

    setupProductCards(container);
  } catch (err) {
    container.innerHTML = `<div class="error-page"><h2>Có lỗi xảy ra</h2><p>${err.message}</p></div>`;
  }
}

export function productCard(p) {
  const discount = p.original_price > p.price
    ? Math.round((1 - p.price / p.original_price) * 100)
    : 0;

  return `
    <div class="product-card" data-slug="${p.slug}">
      ${discount > 0 ? `<span class="product-badge">-${discount}%</span>` : ''}
      <div class="product-image">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=Hat+Dieu'" />
        <div class="product-overlay">
          <button class="btn-icon add-to-cart-btn" data-id="${p.id}" title="Thêm giỏ hàng">
            <i class="fas fa-cart-plus"></i>
          </button>
          <a href="#/product/${p.slug}" class="btn-icon" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </a>
        </div>
      </div>
      <div class="product-info">
        <span class="product-category">${p.category_name || ''}</span>
        <h3 class="product-name"><a href="#/product/${p.slug}">${p.name}</a></h3>
        <div class="product-rating">
          ${renderStars(p.rating)}
          <span>(${p.review_count})</span>
        </div>
        <div class="product-price">
          <span class="current-price">${formatVND(p.price)}</span>
          ${p.original_price > p.price ? `<span class="original-price">${formatVND(p.original_price)}</span>` : ''}
        </div>
        <div class="product-meta">
          <span><i class="fas fa-weight-hanging"></i> ${p.weight}</span>
          <span><i class="fas fa-shopping-bag"></i> Đã bán ${p.sold}</span>
        </div>
      </div>
    </div>
  `;
}

export function setupProductCards(container) {
  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-to-cart-btn') || e.target.closest('a')) return;
      const slug = card.dataset.slug;
      window.location.hash = `#/product/${slug}`;
    });
  });

  container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!isLoggedIn()) {
        showAuthModal('login');
        return;
      }
      try {
        const productId = parseInt(btn.dataset.id);
        const result = await api.cart.add(productId);
        showToast(result.message);
        updateCartCount(result.cartCount);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

export function updateCartCount(count) {
  const el = document.getElementById('cartCount');
  if (count > 0) {
    el.textContent = count;
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}
