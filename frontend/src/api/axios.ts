import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Automatically attach JWT token to every request
API.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If token expired or invalid on a protected call, log out and go to login.
// Do NOT do this for failed /auth/login or /auth/register — those legitimately return 401.
API.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    const ax = error as AxiosError;
    const status = ax.response?.status;
    const url = ax.config?.url ?? '';
    const isAuthForm =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url === 'auth/login' ||
      url === 'auth/register';
    if (status === 401 && !isAuthForm) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
