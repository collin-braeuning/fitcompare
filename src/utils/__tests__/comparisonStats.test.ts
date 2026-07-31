import { describe, it, expect } from 'vitest';
import { calculateConcordanceStats } from '../comparisonStats';

describe('calculateConcordanceStats', () => {
  it('returns ccc of 1 for identical arrays', () => {
    const x = [60, 65, 70, 75, 80];
    const result = calculateConcordanceStats(x, [...x]);
    expect(result).not.toBeNull();
    expect(result!.ccc).toBeCloseTo(1, 10);
  });

  it('penalizes a perfectly correlated but offset series', () => {
    const x = [60, 65, 70, 75, 80];
    const y = x.map((v) => v + 10);
    const result = calculateConcordanceStats(x, y);
    expect(result).not.toBeNull();
    expect(result!.ccc).toBeGreaterThan(0);
    expect(result!.ccc).toBeLessThan(1);
  });

  it('returns a low/negative ccc for inverted (discordant) data', () => {
    const x = [60, 65, 70, 75, 80];
    const y = [80, 75, 70, 65, 60];
    const result = calculateConcordanceStats(x, y);
    expect(result).not.toBeNull();
    expect(result!.ccc).toBeLessThan(0);
  });

  it('returns null for empty input', () => {
    expect(calculateConcordanceStats([], [])).toBeNull();
  });

  it('returns null for mismatched-length input', () => {
    expect(calculateConcordanceStats([1, 2, 3], [1, 2])).toBeNull();
  });

  it('carries the correct point pairs and data range', () => {
    const x = [60, 80];
    const y = [65, 90];
    const result = calculateConcordanceStats(x, y);
    expect(result).not.toBeNull();
    expect(result!.points).toEqual([
      { x: 60, y: 65 },
      { x: 80, y: 90 },
    ]);
    expect(result!.min).toBe(60);
    expect(result!.max).toBe(90);
  });
});
