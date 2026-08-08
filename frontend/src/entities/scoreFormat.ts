/** Вес выбранного варианта с указанием единицы измерения. */
export function formatDeltaScore(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} баллов`;
}
