/**
 * Agreement statistics for two paired sample series.
 *
 * Pure maths — no React, no chart library. Every function takes two
 * index-aligned arrays (`x[i]` and `y[i]` are the two devices' readings at the
 * same instant) and returns null when the input can't support a result.
 */

export interface AbsoluteDifferenceStats {
  avgAbsDiff: number
  maxAbsDiff: number
}

export interface BlandAltmanPoint {
  mean: number
  diff: number
}

export interface BlandAltmanStats {
  points: BlandAltmanPoint[]
  meanDiff: number
  sdDiff: number
  upperLimit: number
  lowerLimit: number
}

export interface ConcordancePoint {
  x: number
  y: number
}

export interface ConcordanceStats {
  points: ConcordancePoint[]
  ccc: number
  min: number
  max: number
}

function isPaired(x: number[], y: number[]): boolean {
  return x.length === y.length && x.length > 0
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Average and worst-case absolute difference — the headline "how far apart are
 * these two devices" number.
 */
export function calculateAbsoluteDifferenceStats(
  x: number[],
  y: number[],
): AbsoluteDifferenceStats {
  if (!isPaired(x, y)) return { avgAbsDiff: 0, maxAbsDiff: 0 }

  let sum = 0
  let max = 0

  for (let i = 0; i < x.length; i++) {
    const diff = Math.abs(x[i] - y[i])
    sum += diff
    if (diff > max) max = diff
  }

  return { avgAbsDiff: sum / x.length, maxAbsDiff: max }
}

/**
 * Bland-Altman agreement: each pair's mean (x) against its signed difference
 * (y), plus the bias (mean difference) and the 95% limits of agreement
 * (bias ± 1.96 SD). Answers "is one device biased, and how wide is the spread"
 * — which correlation alone can't tell you.
 */
export function calculateBlandAltmanStats(x: number[], y: number[]): BlandAltmanStats | null {
  if (!isPaired(x, y)) return null

  const points: BlandAltmanPoint[] = x.map((xi, i) => ({
    mean: (xi + y[i]) / 2,
    diff: xi - y[i],
  }))

  const diffs = points.map((point) => point.diff)
  const meanDiff = mean(diffs)
  const variance = mean(diffs.map((diff) => (diff - meanDiff) ** 2))
  const sdDiff = Math.sqrt(variance)

  return {
    points,
    meanDiff,
    sdDiff,
    upperLimit: meanDiff + 1.96 * sdDiff,
    lowerLimit: meanDiff - 1.96 * sdDiff,
  }
}

/**
 * Lin's Concordance Correlation Coefficient, plus the raw points for a
 * scatter against the line of equality.
 *
 * CCC folds precision (correlation) and accuracy (distance from x = y) into
 * one score, so a device that tracks the reference perfectly but reads 10 bpm
 * high is penalised — unlike Pearson's r, which would report a perfect 1.0.
 *
 *   ρc = (2 · cov(x,y)) / (σx² + σy² + (μx − μy)²)
 */
export function calculateConcordanceStats(x: number[], y: number[]): ConcordanceStats | null {
  if (!isPaired(x, y)) return null

  const n = x.length
  const meanX = mean(x)
  const meanY = mean(y)

  let varX = 0
  let varY = 0
  let covXY = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    varX += dx * dx
    varY += dy * dy
    covXY += dx * dy
  }

  varX /= n
  varY /= n
  covXY /= n

  const denominator = varX + varY + (meanX - meanY) ** 2
  // Zero only when both series are the same constant — no agreement to measure.
  if (denominator === 0) return null

  return {
    points: x.map((xi, i) => ({ x: xi, y: y[i] })),
    ccc: (2 * covXY) / denominator,
    min: Math.min(...x, ...y),
    max: Math.max(...x, ...y),
  }
}
