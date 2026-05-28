import { api } from '../api.js';
import { showToast } from '../utils.js';
import { getUser } from '../auth.js';

export async function renderProfile(container) {
  const user = getUser();
  if (!user) {
    window.location.hash = '#/';
    return;
  }

  container.innerHTML = `
    <div class="container">
      <div class="breadcrumb">
        <a href="#/">Trang chủ</a> <i class="fas fa-chevron-right"></i>
        <span>Tài khoản</span>
      </div>

      <h2 class="page-title"><i class="fas fa-user-circle"></i> Tài Khoản Của Tôi</h2>

      <div class="profile-layout">
        <div class="profile-sidebar">
          <div class="profile-avatar">
            ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}" />` : `<div class="avatar-placeholder">${user.name.charAt(0).toUpperCase()}</div>`}
            <h3>${user.name}</h3>
            <p>${user.email}</p>
          </div>
          <nav class="profile-nav">
            <a href="#/profile" class="active"><i class="fas fa-user"></i> Thông tin cá nhân</a>
            <a href="#/orders"><i class="fas fa-receipt"></i> Đơn hàng của tôi</a>
          </nav>
        </div>

        <div class="profile-content">
          <div class="form-section">
            <h3>Thông tin cá nhân</h3>
            <form id="profileForm" class="profile-form">
              <div class="form-row">
                <div class="form-group">
                  <label>Họ tên</label>
                  <input type="text" name="name" value="${user.name}" required />
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" value="${user.email}" disabled />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Số điện thoại</label>
                  <input type="tel" name="phone" value="${user.phone || ''}" placeholder="Nhập số điện thoại" />
                </div>
                <div class="form-group">
                  <label>Vai trò</label>
                  <input type="text" value="${user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}" disabled />
                </div>
              </div>
              <div class="form-group">
                <label>Địa chỉ</label>
                <textarea name="address" placeholder="Nhập địa chỉ">${user.address || ''}</textarea>
              </div>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await api.auth.updateProfile({
        name: form.name.value,
        phone: form.phone.value,
        address: form.address.value,
      });
      showToast('Cập nhật thông tin thành công!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
