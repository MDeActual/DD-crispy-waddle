import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role: string) =>
    api.post('/auth/register', { name, email, password, role }),
  setupMfa: () => api.post('/auth/mfa/setup'),
  validateMfa: (pre_auth_token: string, token: string) =>
    api.post('/auth/mfa/validate', { pre_auth_token, token }),
};

export const driversApi = {
  getAll: () => api.get('/drivers'),
  updateLocation: (id: string, lat: number, lng: number) =>
    api.put(`/drivers/${id}/location`, { lat, lng }),
  updateStatus: (id: string, status: string) =>
    api.patch(`/drivers/${id}/status`, { status }),
  reportIncident: (id: string, reason: string) =>
    api.post(`/drivers/${id}/incident`, { reason }),
};

export const deliveriesApi = {
  getAll: () => api.get('/deliveries'),
  create: (data: Record<string, unknown>) => api.post('/deliveries', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/deliveries/${id}`, data),
};

export const routesApi = {
  getRoutes: () => api.get('/routes'),
  optimize: () => api.post('/routes/optimize'),
};

export const auditApi = {
  getChain: () => api.get('/audit'),
  getRecent: (limit = 20) => api.get(`/audit/recent?limit=${limit}`),
  verify: () => api.get('/audit/verify'),
};

export default api;
