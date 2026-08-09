import dayjs from 'dayjs';

import 'dayjs/locale/ru';

dayjs.locale('ru');

/** Отметка времени в формате «3 авг 2026, 15:04». */
export function formatDateTime(iso: string): string {
  return dayjs(iso).format('D MMM YYYY, HH:mm');
}

export function formatPercent(percent: number): string {
  return `${percent}%`;
}

/**
 * Изменение результата в процентных пунктах: со знаком плюс для роста.
 * Отрицательное значение уже содержит минус.
 */
export function formatDeltaPercent(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} п.п.`;
}

/** Длительность прохождения: «4 мин 30 с». */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds} с`;
  }
  if (seconds === 0) {
    return `${minutes} мин`;
  }
  return `${minutes} мин ${seconds} с`;
}
