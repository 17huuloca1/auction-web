const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
  return data;
}

export const api = {
  auth: {
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    google: (body) => request('/auth/google', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me'),
    updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  },
  products: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/products?${qs}`);
    },
    featured: () => request('/products/featured'),
    bestSellers: () => request('/products/best-sellers'),
    get: (slug) => request(`/products/${slug}`),
  },
  categories: {
    list: () => request('/categories'),
    get: (slug) => request(`/categories/${slug}`),
  },
  cart: {
    list: () => request('/cart'),
    add: (product_id, quantity = 1) => request('/cart/add', { method: 'POST', body: JSON.stringify({ product_id, quantity }) }),
    update: (id, quantity) => request(`/cart/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
    remove: (id) => request(`/cart/${id}`, { method: 'DELETE' }),
    count: () => request('/cart/count'),
  },
  orders: {
    create: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
    list: () => request('/orders'),
    get: (id) => request(`/orders/${id}`),
    cancel: (id) => request(`/orders/${id}/cancel`, { method: 'PUT' }),
  },
};
