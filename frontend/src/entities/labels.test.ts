import { describe, expect, it } from 'vitest';

import { difficultyLabel, outcomeLabel, roleLabel, securityLevelLabel } from './labels';

describe('labels', () => {
  it('расшифровывает уровни безопасности (FR21)', () => {
    expect(securityLevelLabel('resilient')).toBe('Устойчив');
    expect(securityLevelLabel('attentive')).toBe('Внимателен');
    expect(securityLevelLabel('vulnerable')).toBe('Уязвим');
  });

  it('расшифровывает последствия выбора (FR17)', () => {
    expect(outcomeLabel('safe')).toBe('Безопасно');
    expect(outcomeLabel('risky')).toBe('Спорно');
    expect(outcomeLabel('critical')).toBe('Опасно');
  });

  it('расшифровывает сложность и роль', () => {
    expect(difficultyLabel('basic')).toBe('Базовый');
    expect(difficultyLabel('advanced')).toBe('Продвинутый');
    expect(difficultyLabel('demo')).toBe('Демо');
    expect(roleLabel('buyer')).toBe('Покупатель');
    expect(roleLabel('seller')).toBe('Продавец');
  });
});
