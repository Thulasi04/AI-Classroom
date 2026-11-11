import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// In-memory access token avoids exposing JWTs in localStorage while
// preserving seamless sessions through the HttpOnly refresh cookie.
let accessTokenMemory = null;
let refreshPromise = null;
let unauthorizedHandler = null;

export function setAccessToken(token) {
  accessTokenMemory = token || null;
}

export function getAccessToken() {
  return accessTokenMemory;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (accessTokenMemory) {
      config.headers.Authorization = `Bearer ${accessTokenMemory}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
            .then((res) => {
              const newToken = res.data?.access_token;
              setAccessToken(newToken);
              return newToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const refreshedToken = await refreshPromise;
        if (refreshedToken) {
          originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        setAccessToken(null);
        if (unauthorizedHandler) unauthorizedHandler();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { API_BASE_URL };
export default api;

