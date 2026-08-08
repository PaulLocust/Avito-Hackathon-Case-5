import { describe, expect, it } from 'vitest';

import { formatDeltaPercent, formatDuration, formatPercent } from './format';

describe('format', () => {
  it('форматирует проценты', () => {
    expect(formatPercent(83)).toBe('83%');
  });

  it('форматирует дельту с плюсом для роста и минусом для спада', () => {
    expect(formatDeltaPercent(34)).toBe('+34 п.п.');
    expect(formatDeltaPercent(-12)).toBe('-12 п.п.');
    expect(formatDeltaPercent(0)).toBe('0 п.п.');
  });

  it('форматирует длительность', () => {
    expect(formatDuration(270)).toBe('4 мин 30 с');
    expect(formatDuration(60)).toBe('1 мин');
    expect(formatDuration(45)).toBe('45 с');
  });
});
