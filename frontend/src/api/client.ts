import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import { toApiError } from '../entities/apiError';
import type { components } from './schema';

type ApiErrorBody = components['schemas']['Error'];

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const TOKEN_STORAGE_KEY = 'antiscam.auth_token';

/** Пути, на которых 401 — часть рабочего сценария, а не потерянная сессия. */
const AUTH_FLOW_PATHS = [/\/auth\/login$/, /\/auth\/register$/];

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const apiError = toApiError(error.response?.data, status);

    const isAuthFlow = AUTH_FLOW_PATHS.some((re) => re.test(error.config?.url ?? ''));
    if (status === 401 && apiError.code === 'unauthorized' && !isAuthFlow) {
      clearStoredToken();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(apiError);
  },
);

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.get<T>(url, config);
  return response.data;
}

export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await client.post<T>(url, data, config);
  return response.data;
}
