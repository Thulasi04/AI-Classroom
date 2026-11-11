import api, { setAccessToken } from './api';

export const authService = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    if (data?.access_token) {
      setAccessToken(data.access_token);
    }
    return data;
  },

  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    if (data?.access_token) {
      setAccessToken(data.access_token);
    }
    return data;
  },

  async refresh() {
    const { data } = await api.post('/auth/refresh', {});
    if (data?.access_token) {
      setAccessToken(data.access_token);
    }
    return data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout', {});
    } finally {
      setAccessToken(null);
    }
  },
};

