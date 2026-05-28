import { api } from '../api.js';
import { formatVND, showToast } from '../utils.js';
import { updateCartCount } from './home.js';

export async function renderCart(container) {
  container.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;

  try {
    const { items, subtotal } = await api.cart.list();
    const shipping = subtotal >= 500000 ? 0 : 30000;
    const total = subtotal + shipping;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="container">
          <div class="empty-state">
            <i class="fas fa-shopping-cart"></i>
            <h3>Giỏ hàng trống</h3>
            <p>Bạn chưa có sản phẩm nào trong giỏ hàng</p>
            <a href="#/products" class="btn btn-primary">Tiếp tục mua sắm</a>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="container">
        <div class="breadcrumb">
          <a href="#/">Trang chủ</a> <i class="fas fa-chevron-right"></i>
          <span>Giỏ hàng (${items.length} sản phẩm)</span>
        </div>

        <div class="cart-layout">
          <div class="cart-items">
            <h2><i class="fas fa-shopping-cart"></i> Giỏ hàng của bạn</h2>
            <div class="cart-table">
              <div class="cart-header">
                <span class="cart-col-product">Sản phẩm</span>
                <span class="cart-col-price">Đơn giá</span>
                <span class="cart-col-qty">Số lượng</span>
                <span class="cart-col-total">Thành tiền</span>
                <span class="cart-col-action"></span>
              </div>
              ${items.map(item => `
                <div class="cart-row" data-id="${item.id}">
                  <div class="cart-col-product">
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80x80?text=HD'" />
                    <div class="cart-product-info">
                      <a href="#/product/${item.slug}" class="cart-product-name">${item.name}</a>
                      <span class="cart-product-weight">${item.weight}</span>
                    </div>
                  </div>
                  <span class="cart-col-price">${formatVND(item.price)}</span>
                  <div class="cart-col-qty">
                    <div class="quantity-control">
                      <button class="qty-btn cart-qty-minus" data-id="${item.id}">-</button>
                      <input type="number" class="cart-qty-input" data-id="${item.id}" value="${item.quantity}" min="1" max="${item.stock}" />
                      <button class="qty-btn cart-qty-plus" data-id="${item.id}">+</button>
                    </div>
                  </div>
                  <span class="cart-col-total">${formatVND(item.price * item.quantity)}</span>
                  <button class="cart-col-action cart-remove-btn" data-id="${item.id}" title="Xóa">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              `).join('')}
            </div>
            <a href="#/products" class="btn btn-outline"><i class="fas fa-arrow-left"></i> Tiếp tục mua sắm</a>
          </div>

          <div class="cart-summary">
            <h3>Tóm tắt đơn hàng</h3>
            <div class="summary-row">
              <span>Tạm tính:</span>
              <span id="cartSubtotal">${formatVND(subtotal)}</span>
            </div>
            <div class="summary-row">
              <span>Phí vận chuyển:</span>
              <span id="cartShipping">${shipping === 0 ? '<span class="free-ship">Miễn phí</span>' : formatVND(shipping)}</span>
            </div>
            ${subtotal < 500000 ? `
              <div class="free-ship-notice">
                <i class="fas fa-info-circle"></i> Mua thêm ${formatVND(500000 - subtotal)} để được miễn phí ship
              </div>
            ` : ''}
            <div class="summary-divider"></div>
            <div class="summary-row summary-total">
              <span>Tổng cộng:</span>
              <span id="cartTotal">${formatVND(total)}</span>
            </div>
            <a href="#/checkout" class="btn btn-primary btn-block btn-lg">
              <i class="fas fa-credit-card"></i> Thanh toán
            </a>
          </div>
        </div>
      </div>
    `;

    // Event handlers
    container.querySelectorAll('.cart-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => updateQty(btn.dataset.id, -1));
    });
    container.querySelectorAll('.cart-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => updateQty(btn.dataset.id, 1));
    });
    container.querySelectorAll('.cart-qty-input').forEach(input => {
      input.addEventListener('change', () => {
        const qty = parseInt(input.value);
        if (qty >= 1) setQty(input.dataset.id, qty);
      });
    });
    container.querySelectorAll('.cart-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => removeItem(btn.dataset.id, container));
    });

  } catch (err) {
    container.innerHTML = `<div class="error-page"><h2>Có lỗi xảy ra</h2><p>${err.message}</p></div>`;
  }
}

async function updateQty(id, delta) {
  const input = document.querySelector(`.cart-qty-input[data-id="${id}"]`);
  const newQty = parseInt(input.value) + delta;
  if (newQty < 1 || newQty > parseInt(input.max)) return;
  await setQty(id, newQty);
}

async function setQty(id, quantity) {
  try {
    await api.cart.update(id, quantity);
    const app = document.getElementById('app');
    await renderCart(app);
    const { count } = await api.cart.count();
    updateCartCount(count);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeItem(id, container) {
  try {
    await api.cart.remove(id);
    showToast('Đã xóa khỏi giỏ hàng');
    await renderCart(container);
    const { count } = await api.cart.count();
    updateCartCount(count);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
