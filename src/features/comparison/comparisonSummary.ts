import type { ComparisonChartData } from './comparisonChartData'
import {
  calculateAbsoluteDifferenceStats,
  calculateBlandAltmanStats,
  calculateConcordanceStats,
  type AbsoluteDifferenceStats,
  type BlandAltmanStats,
  type ConcordanceStats,
} from './comparisonStats'

/** Everything the comparison views need about one pair of devices. */
export interface ComparisonSummary {
  primaryName: string
  secondaryName: string
  /** Seconds where both devices produced a usable reading. */
  matchingPoints: number
  difference: AbsoluteDifferenceStats
  blandAltman: BlandAltmanStats | null
  concordance: ConcordanceStats | null
}

/**
 * Compute every agreement statistic for two of the charted series.
 *
 * The two devices are only comparable at seconds where *both* recorded a
 * reading — they're started and stopped by hand, and either can drop out
 * mid-run — so unmatched samples are excluded rather than zero-filled, which
 * would fabricate huge differences at the ends of the timeline.
 */
export function buildComparisonSummary(
  chartData: ComparisonChartData,
  primarySlotId: string,
  secondarySlotId: string,
): ComparisonSummary | null {
  const primary = chartData.heartRate.find((series) => series.slotId === primarySlotId)
  const secondary = chartData.heartRate.find((series) => series.slotId === secondarySlotId)
  if (!primary || !secondary) return null

  const x: number[] = []
  const y: number[] = []

  for (let i = 0; i < chartData.epochSeconds.length; i++) {
    const a = primary.values[i]
    const b = secondary.values[i]
    if (a != null && b != null) {
      x.push(a)
      y.push(b)
    }
  }

  // No overlap at all — e.g. two runs recorded on different days.
  if (x.length === 0) return null

  return {
    primaryName: primary.name,
    secondaryName: secondary.name,
    matchingPoints: x.length,
    difference: calculateAbsoluteDifferenceStats(x, y),
    blandAltman: calculateBlandAltmanStats(x, y),
    concordance: calculateConcordanceStats(x, y),
  }
}
