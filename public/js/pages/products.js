import { api } from '../api.js';
import { formatVND } from '../utils.js';
import { productCard, setupProductCards } from './home.js';

export async function renderProducts(container, params = {}) {
  container.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;

  try {
    const [productsData, categoriesData] = await Promise.all([
      api.products.list(params),
      api.categories.list(),
    ]);

    const currentCategory = params.category || '';
    const currentSort = params.sort || '';
    const currentSearch = params.search || '';

    container.innerHTML = `
      <div class="container">
        <div class="breadcrumb">
          <a href="#/">Trang chủ</a> <i class="fas fa-chevron-right"></i>
          <span>Sản phẩm${currentCategory ? ` - ${categoriesData.categories.find(c => c.slug === currentCategory)?.name || ''}` : ''}</span>
        </div>

        <div class="products-layout">
          <!-- Sidebar -->
          <aside class="products-sidebar">
            <div class="sidebar-section">
              <h3><i class="fas fa-list"></i> Danh mục</h3>
              <ul class="category-list">
                <li><a href="#/products" class="${!currentCategory ? 'active' : ''}">Tất cả sản phẩm</a></li>
                ${categoriesData.categories.map(c => `
                  <li>
                    <a href="#/products?category=${c.slug}" class="${currentCategory === c.slug ? 'active' : ''}">
                      ${c.image} ${c.name} <span class="count">(${c.product_count})</span>
                    </a>
                  </li>
                `).join('')}
              </ul>
            </div>

            <div class="sidebar-section">
              <h3><i class="fas fa-filter"></i> Khoảng giá</h3>
              <ul class="price-filter">
                <li><a href="#/products?${buildQuery(params, {})}" class="price-link">Tất cả</a></li>
                <li><a href="#/products?${buildQuery(params, {price_max: 100000})}" class="price-link">Dưới 100.000đ</a></li>
                <li><a href="#/products?${buildQuery(params, {price_min: 100000, price_max: 200000})}" class="price-link">100.000đ - 200.000đ</a></li>
                <li><a href="#/products?${buildQuery(params, {price_min: 200000, price_max: 500000})}" class="price-link">200.000đ - 500.000đ</a></li>
                <li><a href="#/products?${buildQuery(params, {price_min: 500000})}" class="price-link">Trên 500.000đ</a></li>
              </ul>
            </div>
          </aside>

          <!-- Main Content -->
          <div class="products-main">
            <div class="products-toolbar">
              <div class="toolbar-info">
                <p>Hiển thị <strong>${productsData.products.length}</strong> / ${productsData.pagination.total} sản phẩm</p>
              </div>
              <div class="toolbar-sort">
                <label>Sắp xếp:</label>
                <select id="sortSelect">
                  <option value="" ${!currentSort ? 'selected' : ''}>Mặc định</option>
                  <option value="price_asc" ${currentSort === 'price_asc' ? 'selected' : ''}>Giá thấp đến cao</option>
                  <option value="price_desc" ${currentSort === 'price_desc' ? 'selected' : ''}>Giá cao đến thấp</option>
                  <option value="newest" ${currentSort === 'newest' ? 'selected' : ''}>Mới nhất</option>
                  <option value="best_selling" ${currentSort === 'best_selling' ? 'selected' : ''}>Bán chạy nhất</option>
                  <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>Đánh giá cao nhất</option>
                </select>
              </div>
            </div>

            ${currentSearch ? `
              <div class="search-result-info">
                <p>Kết quả tìm kiếm cho: "<strong>${currentSearch}</strong>" (${productsData.pagination.total} sản phẩm)</p>
              </div>
            ` : ''}

            ${productsData.products.length === 0 ? `
              <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy sản phẩm</h3>
                <p>Hãy thử tìm kiếm với từ khóa khác</p>
                <a href="#/products" class="btn btn-primary">Xem tất cả sản phẩm</a>
              </div>
            ` : `
              <div class="product-grid">
                ${productsData.products.map(p => productCard(p)).join('')}
              </div>
            `}

            ${productsData.pagination.totalPages > 1 ? renderPagination(productsData.pagination, params) : ''}
          </div>
        </div>
      </div>
    `;

    setupProductCards(container);

    document.getElementById('sortSelect')?.addEventListener('change', (e) => {
      const newParams = { ...params, sort: e.target.value, page: 1 };
      if (!newParams.sort) delete newParams.sort;
      const qs = new URLSearchParams(newParams).toString();
      window.location.hash = `#/products?${qs}`;
    });

  } catch (err) {
    container.innerHTML = `<div class="error-page"><h2>Có lỗi xảy ra</h2><p>${err.message}</p></div>`;
  }
}

function buildQuery(current, override) {
  const params = { ...current, ...override };
  Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
  return new URLSearchParams(params).toString();
}

function renderPagination(pagination, params) {
  const { page, totalPages } = pagination;
  let html = '<div class="pagination">';

  if (page > 1) {
    const qs = new URLSearchParams({ ...params, page: page - 1 }).toString();
    html += `<a href="#/products?${qs}" class="page-link"><i class="fas fa-chevron-left"></i></a>`;
  }

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      const qs = new URLSearchParams({ ...params, page: i }).toString();
      html += `<a href="#/products?${qs}" class="page-link ${i === page ? 'active' : ''}">${i}</a>`;
    } else if (i === page - 3 || i === page + 3) {
      html += `<span class="page-ellipsis">...</span>`;
    }
  }

  if (page < totalPages) {
    const qs = new URLSearchParams({ ...params, page: page + 1 }).toString();
    html += `<a href="#/products?${qs}" class="page-link"><i class="fas fa-chevron-right"></i></a>`;
  }

  html += '</div>';
  return html;
}
