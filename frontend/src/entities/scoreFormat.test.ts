import { describe, expect, it } from 'vitest';

import { formatDeltaScore } from './scoreFormat';

describe('formatDeltaScore', () => {
  it('показывает знак для роста и минус для опасного выбора', () => {
    expect(formatDeltaScore(10)).toBe('+10 баллов');
    expect(formatDeltaScore(0)).toBe('0 баллов');
    expect(formatDeltaScore(-10)).toBe('-10 баллов');
  });
});
