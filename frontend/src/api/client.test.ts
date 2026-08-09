import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  apiGet,
  clearStoredToken,
  client,
  getStoredToken,
  refreshAccessToken,
  storeToken,
} from './client';

const user = { id: 'u1', nickname: 'user123', role: 'buyer' as const };
const tokenResponse = (token: string): unknown => ({
  token,
  token_type: 'Bearer',
  expires_at: '2026-08-09T14:30:00Z',
  user,
});

function response(status: number, data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data, status, statusText: '', headers: {}, config };
}

function unauthorizedError(config: InternalAxiosRequestConfig): never {
  throw new AxiosError(
    'Request failed with status code 401',
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    response(
      401,
      { error: { code: 'unauthorized', message: 'Требуется авторизация' } },
      config,
    ),
  );
}

interface Request {
  url: string;
  method?: string;
  auth: string | null;
}

function makeAdapter(
  handler: (req: Request, config: InternalAxiosRequestConfig) => AxiosResponse | never,
): (config: InternalAxiosRequestConfig) => Promise<AxiosResponse> {
  return async (config) => {
    const auth = (config.headers?.get('Authorization') as string | undefined) ?? null;
    return handler({ url: config.url ?? '', method: config.method, auth }, config);
  };
}

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } as unknown as Storage;
  (globalThis as Record<string, unknown>).window = {
    location: { pathname: '/', assign: vi.fn() },
  };
});

afterEach(() => {
  clearStoredToken();
  delete (client.defaults as { adapter?: unknown }).adapter;
  delete (globalThis as Record<string, unknown>).localStorage;
  delete (globalThis as Record<string, unknown>).window;
});

describe('refreshAccessToken', () => {
  it('возвращает новый токен и сохраняет его', async () => {
    client.defaults.adapter = makeAdapter((req) =>
      req.url === '/auth/refresh'
        ? response(200, tokenResponse('fresh-token'), { url: req.url } as InternalAxiosRequestConfig)
        : response(200, {}, { url: req.url } as InternalAxiosRequestConfig),
    );

    const token = await refreshAccessToken();

    expect(token).toBe('fresh-token');
    expect(getStoredToken()).toBe('fresh-token');
  });

  it('возвращает null и чистит токен, если refresh-сессия завершена', async () => {
    storeToken('expired');
    client.defaults.adapter = makeAdapter((req, config) =>
      unauthorizedError({ ...config, url: req.url }),
    );

    expect(await refreshAccessToken()).toBeNull();
    expect(getStoredToken()).toBeNull();
  });
});

describe('автообновление при 401', () => {
  it('обновляет токен и ретраит исходный запрос', async () => {
    storeToken('expired-token');
    const refreshCalls = vi.fn();
    let progressCalls = 0;

    client.defaults.adapter = makeAdapter((req, config) => {
      if (req.url === '/auth/refresh') {
        refreshCalls();
        return response(200, tokenResponse('new-token'), config);
      }
      if (req.url === '/progress') {
        progressCalls += 1;
        if (progressCalls === 1) return unauthorizedError(config);
        expect(req.auth).toBe('Bearer new-token');
        return response(200, { attempts_count: 2 }, config);
      }
      return response(500, {}, config);
    });

    const data = await apiGet<{ attempts_count: number }>('/progress');

    expect(data).toEqual({ attempts_count: 2 });
    expect(refreshCalls).toHaveBeenCalledTimes(1);
    expect(progressCalls).toBe(2);
    expect(getStoredToken()).toBe('new-token');
  });

  it('при параллельных 401 делает один refresh', async () => {
    storeToken('expired-token');
    const refreshCalls = vi.fn();
    const counters: Record<string, number> = { '/progress': 0, '/scenarios': 0 };

    client.defaults.adapter = makeAdapter((req, config) => {
      if (req.url === '/auth/refresh') {
        refreshCalls();
        return response(200, tokenResponse('new-token'), config);
      }
      counters[req.url] += 1;
      if (counters[req.url] === 1) return unauthorizedError(config);
      return response(200, { ok: true }, config);
    });

    const [a, b] = await Promise.all([apiGet('/progress'), apiGet('/scenarios')]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refreshCalls).toHaveBeenCalledTimes(1);
  });

  it('при неудачном refresh очищает токен и уводит на /login', async () => {
    storeToken('expired-token');
    client.defaults.adapter = makeAdapter((req, config) => {
      if (req.url === '/auth/refresh') return unauthorizedError(config);
      if (req.url === '/progress') return unauthorizedError(config);
      return response(500, {}, config);
    });
    const assign = vi.fn();
    (globalThis as Record<string, unknown>).window = {
      location: { pathname: '/', assign },
    };

    await expect(apiGet('/progress')).rejects.toMatchObject({ code: 'unauthorized' });

    expect(getStoredToken()).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('не ретраит повторный 401 после refresh', async () => {
    storeToken('expired-token');
    const refreshCalls = vi.fn();
    let refreshResult: AxiosResponse | undefined;

    client.defaults.adapter = makeAdapter((req, config) => {
      if (req.url === '/auth/refresh') {
        refreshCalls();
        if (!refreshResult) {
          refreshResult = response(200, tokenResponse('new-token'), config);
        }
        return refreshResult;
      }
      if (req.url === '/progress') return unauthorizedError(config);
      return response(500, {}, config);
    });

    await expect(apiGet('/progress')).rejects.toMatchObject({ code: 'unauthorized' });

    expect(refreshCalls).toHaveBeenCalledTimes(1);
  });
});
