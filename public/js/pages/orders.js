import { api } from '../api.js';
import { formatVND, showToast, getStatusText, getStatusClass, getPaymentMethodText, timeAgo } from '../utils.js';

export async function renderOrders(container) {
  container.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;

  try {
    const { orders } = await api.orders.list();

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="container">
          <div class="empty-state">
            <i class="fas fa-receipt"></i>
            <h3>Chưa có đơn hàng</h3>
            <p>Bạn chưa có đơn hàng nào. Hãy mua sắm ngay!</p>
            <a href="#/products" class="btn btn-primary">Mua sắm ngay</a>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="container">
        <div class="breadcrumb">
          <a href="#/">Trang chủ</a> <i class="fas fa-chevron-right"></i>
          <span>Đơn hàng của tôi</span>
        </div>

        <h2 class="page-title"><i class="fas fa-receipt"></i> Đơn Hàng Của Tôi</h2>

        <div class="orders-list">
          ${orders.map(order => `
            <div class="order-card">
              <div class="order-card-header">
                <div class="order-info">
                  <span class="order-code">#${order.order_code}</span>
                  <span class="order-date">${timeAgo(order.created_at)}</span>
                </div>
                <span class="order-status ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
              </div>
              <div class="order-card-items">
                ${order.items.map(item => `
                  <div class="order-card-item">
                    <img src="${item.product_image}" alt="${item.product_name}" onerror="this.src='https://via.placeholder.com/50x50?text=HD'" />
                    <div class="item-info">
                      <p>${item.product_name}</p>
                      <span>${item.quantity} x ${formatVND(item.price)}</span>
                    </div>
                    <span class="item-total">${formatVND(item.price * item.quantity)}</span>
                  </div>
                `).join('')}
              </div>
              <div class="order-card-footer">
                <div class="order-payment">
                  <i class="fas fa-wallet"></i> ${getPaymentMethodText(order.payment_method)}
                </div>
                <div class="order-total">
                  Tổng: <strong>${formatVND(order.total)}</strong>
                </div>
              </div>
              ${order.status === 'pending' ? `
                <div class="order-card-actions">
                  <button class="btn btn-outline btn-sm cancel-order-btn" data-id="${order.id}">
                    <i class="fas fa-times"></i> Hủy đơn hàng
                  </button>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.cancel-order-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
        try {
          await api.orders.cancel(btn.dataset.id);
          showToast('Đã hủy đơn hàng');
          renderOrders(container);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="error-page"><h2>Có lỗi xảy ra</h2><p>${err.message}</p></div>`;
  }
}

export async function renderOrderSuccess(container, orderId) {
  container.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;

  try {
    const { order } = await api.orders.get(orderId);

    container.innerHTML = `
      <div class="container">
        <div class="order-success">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h2>Đặt hàng thành công!</h2>
          <p class="success-message">Cảm ơn bạn đã mua hàng tại Hạt Điều Shop</p>
          <div class="order-success-info">
            <div class="info-row"><span>Mã đơn hàng:</span><strong>#${order.order_code}</strong></div>
            <div class="info-row"><span>Người nhận:</span><span>${order.customer_name}</span></div>
            <div class="info-row"><span>Số điện thoại:</span><span>${order.customer_phone}</span></div>
            <div class="info-row"><span>Địa chỉ:</span><span>${order.shipping_address}</span></div>
            <div class="info-row"><span>Thanh toán:</span><span>${getPaymentMethodText(order.payment_method)}</span></div>
            <div class="info-row total"><span>Tổng tiền:</span><strong>${formatVND(order.total)}</strong></div>
          </div>
          <div class="order-success-items">
            <h4>Chi tiết đơn hàng</h4>
            ${order.items.map(item => `
              <div class="success-item">
                <span>${item.product_name} x ${item.quantity}</span>
                <span>${formatVND(item.price * item.quantity)}</span>
              </div>
            `).join('')}
            <div class="success-item">
              <span>Phí vận chuyển</span>
              <span>${order.shipping_fee === 0 ? 'Miễn phí' : formatVND(order.shipping_fee)}</span>
            </div>
          </div>
          <div class="success-actions">
            <a href="#/orders" class="btn btn-primary"><i class="fas fa-receipt"></i> Xem đơn hàng</a>
            <a href="#/products" class="btn btn-outline"><i class="fas fa-shopping-bag"></i> Tiếp tục mua sắm</a>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    container.innerHTML = `<div class="error-page"><h2>Có lỗi xảy ra</h2><p>${err.message}</p></div>`;
  }
}
