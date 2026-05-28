import { api } from '../api.js';
import { formatVND, showToast, getPaymentMethodText } from '../utils.js';
import { getUser } from '../auth.js';
import { updateCartCount } from './home.js';

export async function renderCheckout(container) {
  container.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;

  try {
    const { items, subtotal } = await api.cart.list();
    const user = getUser();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="container">
          <div class="empty-state">
            <i class="fas fa-shopping-cart"></i>
            <h3>Giỏ hàng trống</h3>
            <p>Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán</p>
            <a href="#/products" class="btn btn-primary">Tiếp tục mua sắm</a>
          </div>
        </div>
      `;
      return;
    }

    const shipping = subtotal >= 500000 ? 0 : 30000;
    const total = subtotal + shipping;

    container.innerHTML = `
      <div class="container">
        <div class="breadcrumb">
          <a href="#/">Trang chủ</a> <i class="fas fa-chevron-right"></i>
          <a href="#/cart">Giỏ hàng</a> <i class="fas fa-chevron-right"></i>
          <span>Thanh toán</span>
        </div>

        <h2 class="page-title"><i class="fas fa-credit-card"></i> Thanh Toán</h2>

        <div class="checkout-layout">
          <div class="checkout-form-section">
            <form id="checkoutForm" class="checkout-form">
              <div class="form-section">
                <h3><i class="fas fa-user"></i> Thông tin người nhận</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Họ tên *</label>
                    <input type="text" name="customer_name" value="${user?.name || ''}" required placeholder="Nhập họ tên" />
                  </div>
                  <div class="form-group">
                    <label>Số điện thoại *</label>
                    <input type="tel" name="customer_phone" value="${user?.phone || ''}" required placeholder="Nhập số điện thoại" />
                  </div>
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" name="customer_email" value="${user?.email || ''}" placeholder="Nhập email" />
                </div>
                <div class="form-group">
                  <label>Địa chỉ giao hàng *</label>
                  <textarea name="shipping_address" required placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố">${user?.address || ''}</textarea>
                </div>
                <div class="form-group">
                  <label>Ghi chú</label>
                  <textarea name="note" placeholder="Ghi chú cho đơn hàng (không bắt buộc)"></textarea>
                </div>
              </div>

              <div class="form-section">
                <h3><i class="fas fa-wallet"></i> Phương thức thanh toán</h3>
                <div class="payment-methods">
                  <label class="payment-option active">
                    <input type="radio" name="payment_method" value="cod" checked />
                    <div class="payment-content">
                      <i class="fas fa-money-bill-wave"></i>
                      <div>
                        <strong>Thanh toán khi nhận hàng (COD)</strong>
                        <p>Thanh toán bằng tiền mặt khi nhận hàng</p>
                      </div>
                    </div>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="payment_method" value="bank" />
                    <div class="payment-content">
                      <i class="fas fa-university"></i>
                      <div>
                        <strong>Chuyển khoản ngân hàng</strong>
                        <p>Chuyển khoản qua tài khoản ngân hàng</p>
                      </div>
                    </div>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="payment_method" value="momo" />
                    <div class="payment-content">
                      <i class="fas fa-mobile-alt"></i>
                      <div>
                        <strong>Ví MoMo</strong>
                        <p>Thanh toán qua ví điện tử MoMo</p>
                      </div>
                    </div>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="payment_method" value="zalopay" />
                    <div class="payment-content">
                      <i class="fas fa-wallet"></i>
                      <div>
                        <strong>ZaloPay</strong>
                        <p>Thanh toán qua ví điện tử ZaloPay</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div class="bank-info" id="bankInfo" style="display:none">
                <h4>Thông tin chuyển khoản</h4>
                <div class="bank-details">
                  <p><strong>Ngân hàng:</strong> Vietcombank</p>
                  <p><strong>Số tài khoản:</strong> 1234567890</p>
                  <p><strong>Chủ tài khoản:</strong> CONG TY HAT DIEU SHOP</p>
                  <p><strong>Nội dung CK:</strong> HD + Số điện thoại</p>
                </div>
              </div>
            </form>
          </div>

          <div class="checkout-summary">
            <h3>Đơn hàng của bạn</h3>
            <div class="order-items">
              ${items.map(item => `
                <div class="order-item">
                  <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/60x60?text=HD'" />
                  <div class="order-item-info">
                    <p class="order-item-name">${item.name}</p>
                    <p class="order-item-qty">${item.quantity} x ${formatVND(item.price)}</p>
                  </div>
                  <span class="order-item-total">${formatVND(item.price * item.quantity)}</span>
                </div>
              `).join('')}
            </div>
            <div class="summary-divider"></div>
            <div class="summary-row">
              <span>Tạm tính:</span>
              <span>${formatVND(subtotal)}</span>
            </div>
            <div class="summary-row">
              <span>Phí vận chuyển:</span>
              <span>${shipping === 0 ? '<span class="free-ship">Miễn phí</span>' : formatVND(shipping)}</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-row summary-total">
              <span>Tổng cộng:</span>
              <span>${formatVND(total)}</span>
            </div>
            <button type="submit" form="checkoutForm" class="btn btn-primary btn-block btn-lg" id="placeOrderBtn">
              <i class="fas fa-check"></i> Đặt hàng
            </button>
            <p class="checkout-note">
              <i class="fas fa-lock"></i> Thông tin của bạn được bảo mật an toàn
            </p>
          </div>
        </div>
      </div>
    `;

    // Payment method toggle
    container.querySelectorAll('input[name="payment_method"]').forEach(radio => {
      radio.addEventListener('change', () => {
        container.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
        radio.closest('.payment-option').classList.add('active');
        document.getElementById('bankInfo').style.display = radio.value === 'bank' ? 'block' : 'none';
      });
    });

    // Submit order
    document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const btn = document.getElementById('placeOrderBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

      try {
        const result = await api.orders.create({
          customer_name: form.customer_name.value,
          customer_phone: form.customer_phone.value,
          customer_email: form.customer_email.value,
          shipping_address: form.shipping_address.value,
          note: form.note.value,
          payment_method: form.payment_method.value,
        });

        showToast('Đặt hàng thành công!');
        updateCartCount(0);
        window.location.hash = `#/order-success/${result.order.id}`;
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Đặt hàng';
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="error-page"><h2>Có lỗi xảy ra</h2><p>${err.message}</p></div>`;
  }
}
