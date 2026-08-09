import { describe, expect, it } from 'vitest';

import { ApiError, toApiError } from './apiError';

describe('toApiError', () => {
  it('забирает код, сообщение, детали и request_id из конверта', () => {
    const error = toApiError(
      {
        error: {
          code: 'session_already_active',
          message: 'По этому сценарию есть незавершённая тренировка',
          details: { session_id: '3f1c9c1e-6f2a-4f7f-9a7b-6b5f2e2f1a11' },
        },
        request_id: '01J8XQ2M7K3ZC0P4B6R9V2T5',
      },
      409,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('session_already_active');
    expect(error.status).toBe(409);
    expect(error.details).toEqual({ session_id: '3f1c9c1e-6f2a-4f7f-9a7b-6b5f2e2f1a11' });
    expect(error.requestId).toBe('01J8XQ2M7K3ZC0P4B6R9V2T5');
  });

  it('маскирует пустой ответ во внутреннюю ошибку (SEC6)', () => {
    const error = toApiError(undefined, 500);
    expect(error.code).toBe('internal_error');
    expect(error.message).toBe('Не удалось выполнить запрос');
  });

  it('не раскрывает устройство системы при ошибке 500 без тела', () => {
    const error = toApiError(undefined, 500);
    expect(error.message).not.toMatch(/panic|sql|stack/i);
  });
});
