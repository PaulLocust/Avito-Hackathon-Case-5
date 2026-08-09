import { ApiError } from '../../entities/apiError';

/** Человекочитаемое сообщение об ошибке из любого исключения. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Не удалось выполнить запрос';
}
