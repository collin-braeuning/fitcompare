export interface AbsoluteDifferenceStats {
  avgAbsDiff: number;
  maxAbsDiff: number;
}

export interface BlandAltmanPoint {
  mean: number;
  diff: number;
}

export interface BlandAltmanStats {
  points: BlandAltmanPoint[];
  meanDiff: number;
  sdDiff: number;
  upperLimit: number;
  lowerLimit: number;
}

/**
 * Calculate the average and max absolute difference between two arrays of
 * paired samples (e.g. heart rate readings from two devices at matching
 * timestamps).
 */
export function calculateAbsoluteDifferenceStats(x: number[], y: number[]): AbsoluteDifferenceStats {
  if (x.length !== y.length || x.length === 0) {
    return { avgAbsDiff: 0, maxAbsDiff: 0 };
  }

  let sum = 0;
  let max = 0;

  for (let i = 0; i < x.length; i++) {
    const diff = Math.abs(x[i] - y[i]);
    sum += diff;
    if (diff > max) max = diff;
  }

  return { avgAbsDiff: sum / x.length, maxAbsDiff: max };
}

/**
 * Calculate Bland-Altman agreement stats between two arrays of paired
 * samples: each pair's mean (x-axis) plotted against its signed difference
 * (y-axis), plus the mean bias and 95% limits of agreement (mean ± 1.96 SD).
 */
export function calculateBlandAltmanStats(x: number[], y: number[]): BlandAltmanStats | null {
  if (x.length !== y.length || x.length === 0) {
    return null;
  }

  const points: BlandAltmanPoint[] = x.map((xi, i) => ({
    mean: (xi + y[i]) / 2,
    diff: xi - y[i],
  }));

  const meanDiff = points.reduce((sum, p) => sum + p.diff, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + (p.diff - meanDiff) ** 2, 0) / points.length;
  const sdDiff = Math.sqrt(variance);

  return {
    points,
    meanDiff,
    sdDiff,
    upperLimit: meanDiff + 1.96 * sdDiff,
    lowerLimit: meanDiff - 1.96 * sdDiff,
  };
}
