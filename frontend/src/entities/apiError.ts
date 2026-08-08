import type { components } from '../api/schema';

export type ErrorBody = components['schemas']['Error'];

/** Нормализованная ошибка API: решения принимаются по `code`, а не по тексту. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly details: Record<string, unknown> | undefined;
  readonly requestId: string | undefined;

  constructor(
    message: string,
    code: string,
    status: number | undefined,
    details: Record<string, unknown> | undefined,
    requestId: string | undefined,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

/**
 * Преобразует тело единого конверта ошибки в {@link ApiError}.
 * Пустой или неструктурный ответ маскируется во внутреннюю ошибку: клиенту
 * не раскрывается внутреннее устройство системы (SEC6).
 */
export function toApiError(body: ErrorBody | undefined, status: number | undefined): ApiError {
  const code = body?.error?.code ?? 'internal_error';
  const message = body?.error?.message ?? 'Не удалось выполнить запрос';
  return new ApiError(message, code, status, body?.error?.details, body?.request_id);
}
