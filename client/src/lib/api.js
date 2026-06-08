import axios from 'axios';

/**
 * Base API URL — Vite's dev server proxies /api to localhost:3001.
 * In production, this resolves to the same origin.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Public Axios instance for unauthenticated content fetching.
 *
 * Why a separate instance? Public routes use cookie-based auth
 * (withCredentials) while admin routes use Bearer tokens. Separating
 * them prevents accidental credential leakage across namespaces.
 */
export const publicApi = axios.create({
  baseURL: `${BASE_URL}/public`,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

/**
 * Admin Axios instance for authenticated CMS operations.
 *
 * Why separate? Admin routes require Bearer token auth and different
 * CORS origin. The interceptors attached to this instance handle
 * token injection and 401 recovery independently.
 */
export const adminApi = axios.create({
  baseURL: `${BASE_URL}/admin`,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});
