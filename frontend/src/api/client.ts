import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import { toApiError } from '../entities/apiError';
import type { components } from './schema';

type ApiErrorBody = components['schemas']['Error'];
type AuthResponse = components['schemas']['AuthResponse'];

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const TOKEN_STORAGE_KEY = 'antiscam.auth_token';

/** Пути, на которых 401 — часть рабочего сценария, а не потерянная сессия. */
const AUTH_FLOW_PATHS = [/\/auth\/login$/, /\/auth\/register$/];

const REFRESH_PATH = '/auth/refresh';

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
  // Refresh-токен живёт в HttpOnly cookie с путём /api/v1/auth: браузер
  // сам приложит её к /auth/refresh, если запросы идут с credentials.
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Ротация refresh-токена инвалидирует старый: при параллельных 401
// держим один общий запрос на обновление, иначе часть ретраев упадёт.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Обновляет JWT доступа через /auth/refresh. Refresh-токен берётся из
 * HttpOnly cookie и ротируется сервером (FR2). Возвращает новый токен или
 * null, если сессия завершена.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = client
      .post<AuthResponse>(REFRESH_PATH, undefined, { withCredentials: true })
      .then(({ data }) => {
        storeToken(data.token);
        return data.token;
      })
      .catch(() => {
        clearStoredToken();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const apiError = toApiError(error.response?.data, status);
    const config = error.config;
    const url = config?.url ?? '';
    const retryMark = config as { _retry?: boolean } | undefined;

    const isAuthFlow = AUTH_FLOW_PATHS.some((re) => re.test(url));
    const isRefresh = url === REFRESH_PATH;
    // Было ли что обновлять: у гостя токена нет, и его 401 (например, на
    // защищённом /attempts) не должен гнать на страницу входа.
    const hadToken = getStoredToken() != null;

    // Флаг _retry едет в config сквозь mergeConfig: повторный 401 после
    // успешного refresh не уходит на новый ретрай, чтобы не зациклиться.
    const canRefresh =
      status === 401 &&
      apiError.code === 'unauthorized' &&
      !isAuthFlow &&
      !isRefresh &&
      retryMark != null &&
      retryMark._retry !== true;

    if (canRefresh) {
      const token = await refreshAccessToken();
      if (token) {
        retryMark._retry = true;
        config!.headers.set('Authorization', `Bearer ${token}`);
        return client.request(config!);
      }
      if (hadToken && window.location.pathname !== '/login') {
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
