import { api } from '../api.js';
import { formatVND, renderStars, showToast } from '../utils.js';
import { isLoggedIn, showAuthModal } from '../auth.js';
import { productCard, setupProductCards, updateCartCount } from './home.js';

export async function renderProductDetail(container, slug) {
  container.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;

  try {
    const { product, related } = await api.products.get(slug);
    const discount = product.original_price > product.price
      ? Math.round((1 - product.price / product.original_price) * 100)
      : 0;

    container.innerHTML = `
      <div class="container">
        <div class="breadcrumb">
          <a href="#/">Trang chủ</a> <i class="fas fa-chevron-right"></i>
          <a href="#/products">Sản phẩm</a> <i class="fas fa-chevron-right"></i>
          <a href="#/products?category=${product.category_name}">${product.category_name}</a> <i class="fas fa-chevron-right"></i>
          <span>${product.name}</span>
        </div>

        <div class="product-detail">
          <div class="product-detail-image">
            <div class="main-image">
              ${discount > 0 ? `<span class="product-badge badge-lg">-${discount}%</span>` : ''}
              <img src="${product.image}" alt="${product.name}" id="mainImage" onerror="this.src='https://via.placeholder.com/500x400?text=Hat+Dieu'" />
            </div>
          </div>

          <div class="product-detail-info">
            <h1 class="detail-title">${product.name}</h1>

            <div class="detail-rating">
              ${renderStars(product.rating)}
              <span class="rating-count">${product.rating} (${product.review_count} đánh giá)</span>
              <span class="sold-count">| Đã bán ${product.sold}</span>
            </div>

            <div class="detail-price">
              <span class="current-price">${formatVND(product.price)}</span>
              ${product.original_price > product.price ? `
                <span class="original-price">${formatVND(product.original_price)}</span>
                <span class="discount-tag">Tiết kiệm ${formatVND(product.original_price - product.price)}</span>
              ` : ''}
            </div>

            <div class="detail-description">
              <p>${product.description}</p>
            </div>

            <div class="detail-specs">
              <div class="spec-row"><span class="spec-label">Trọng lượng:</span><span>${product.weight}</span></div>
              <div class="spec-row"><span class="spec-label">Xuất xứ:</span><span>${product.origin}</span></div>
              <div class="spec-row"><span class="spec-label">Đơn vị:</span><span>${product.unit}</span></div>
              <div class="spec-row"><span class="spec-label">Tồn kho:</span><span>${product.stock > 0 ? `Còn ${product.stock} ${product.unit}` : '<span class="out-of-stock">Hết hàng</span>'}</span></div>
            </div>

            <div class="detail-quantity">
              <label>Số lượng:</label>
              <div class="quantity-control">
                <button class="qty-btn" id="qtyMinus">-</button>
                <input type="number" id="qtyInput" value="1" min="1" max="${product.stock}" />
                <button class="qty-btn" id="qtyPlus">+</button>
              </div>
            </div>

            <div class="detail-actions">
              <button class="btn btn-primary btn-lg" id="addToCartBtn" ${product.stock <= 0 ? 'disabled' : ''}>
                <i class="fas fa-cart-plus"></i> Thêm vào giỏ hàng
              </button>
              <button class="btn btn-accent btn-lg" id="buyNowBtn" ${product.stock <= 0 ? 'disabled' : ''}>
                <i class="fas fa-bolt"></i> Mua ngay
              </button>
            </div>

            <div class="detail-trust">
              <div class="trust-item"><i class="fas fa-shield-alt"></i> Hàng chính hãng 100%</div>
              <div class="trust-item"><i class="fas fa-truck"></i> Miễn phí ship từ 500K</div>
              <div class="trust-item"><i class="fas fa-undo"></i> Đổi trả trong 7 ngày</div>
            </div>
          </div>
        </div>

        <!-- Product Detail Tabs -->
        <div class="detail-tabs">
          <div class="tab-headers">
            <button class="tab-header active" data-tab="description">Mô tả chi tiết</button>
            <button class="tab-header" data-tab="info">Thông tin sản phẩm</button>
          </div>
          <div class="tab-content active" id="tab-description">
            <div class="detail-text">
              ${product.detail || product.description}
            </div>
          </div>
          <div class="tab-content" id="tab-info">
            <table class="info-table">
              <tr><td>Tên sản phẩm</td><td>${product.name}</td></tr>
              <tr><td>Danh mục</td><td>${product.category_name}</td></tr>
              <tr><td>Trọng lượng</td><td>${product.weight}</td></tr>
              <tr><td>Xuất xứ</td><td>${product.origin}</td></tr>
              <tr><td>Đơn vị tính</td><td>${product.unit}</td></tr>
              <tr><td>Đánh giá</td><td>${product.rating}/5 (${product.review_count} đánh giá)</td></tr>
            </table>
          </div>
        </div>

        <!-- Related Products -->
        ${related.length > 0 ? `
          <section class="section">
            <div class="section-header">
              <h2><i class="fas fa-heart"></i> Sản phẩm liên quan</h2>
            </div>
            <div class="product-grid">
              ${related.map(p => productCard(p)).join('')}
            </div>
          </section>
        ` : ''}
      </div>
    `;

    // Quantity controls
    const qtyInput = document.getElementById('qtyInput');
    document.getElementById('qtyMinus').addEventListener('click', () => {
      const v = parseInt(qtyInput.value);
      if (v > 1) qtyInput.value = v - 1;
    });
    document.getElementById('qtyPlus').addEventListener('click', () => {
      const v = parseInt(qtyInput.value);
      if (v < product.stock) qtyInput.value = v + 1;
    });

    // Add to cart
    document.getElementById('addToCartBtn').addEventListener('click', async () => {
      if (!isLoggedIn()) { showAuthModal('login'); return; }
      try {
        const qty = parseInt(qtyInput.value);
        const result = await api.cart.add(product.id, qty);
        showToast(result.message);
        updateCartCount(result.cartCount);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Buy now
    document.getElementById('buyNowBtn').addEventListener('click', async () => {
      if (!isLoggedIn()) { showAuthModal('login'); return; }
      try {
        const qty = parseInt(qtyInput.value);
        await api.cart.add(product.id, qty);
        window.location.hash = '#/checkout';
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Tabs
    container.querySelectorAll('.tab-header').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-header').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      });
    });

    setupProductCards(container);

  } catch (err) {
    container.innerHTML = `<div class="error-page"><h2>Không tìm thấy sản phẩm</h2><p>${err.message}</p><a href="#/products" class="btn btn-primary">Quay lại cửa hàng</a></div>`;
  }
}
