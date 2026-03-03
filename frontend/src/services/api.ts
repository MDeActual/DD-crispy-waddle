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
};

export const deliveriesApi = {
  getAll: () => api.get('/deliveries'),
  create: (data: Record<string, unknown>) => api.post('/deliveries', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/deliveries/${id}`, data),
};

export default api;
