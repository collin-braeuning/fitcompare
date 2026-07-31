import { describe, it, expect } from 'vitest'
import { buildBlandAltmanOption } from '../blandAltmanOption'
import { buildConcordanceOption } from '../concordanceOption'
import type { BlandAltmanStats, ConcordanceStats } from '../../../features/comparison/comparisonStats'

// Duplicate points on purpose: this is what makes `weighted: true` interesting
// (points collapse) while keeping the `weighted: false` path exercising the
// exact same series everyone else's chart already renders.
const BA_STATS: BlandAltmanStats = {
  points: [
    { mean: 100, diff: 2 },
    { mean: 100, diff: 2 },
    { mean: 105, diff: -1 },
  ],
  meanDiff: 1,
  sdDiff: 1.5,
  upperLimit: 3.94,
  lowerLimit: -1.94,
}

const CC_STATS: ConcordanceStats = {
  points: [
    { x: 100, y: 98 },
    { x: 100, y: 98 },
    { x: 105, y: 106 },
  ],
  ccc: 0.92,
  min: 98,
  max: 106,
}

/** Strip function-valued fields (formatters, symbolSize) so the rest compares structurally. */
function withoutFunctions<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value))
}

describe('buildBlandAltmanOption weighted option', () => {
  it('defaults to unweighted and matches passing weighted:false explicitly', () => {
    const implicit = buildBlandAltmanOption(BA_STATS, 'Primary', 'Secondary')
    const explicit = buildBlandAltmanOption(BA_STATS, 'Primary', 'Secondary', { weighted: false })
    expect(withoutFunctions(implicit)).toEqual(withoutFunctions(explicit))
  })

  it('unweighted output is untouched: raw 2-tuples, fixed symbolSize, no progressive rendering', () => {
    const option = buildBlandAltmanOption(BA_STATS, 'Primary', 'Secondary')
    const series = option.series as Array<Record<string, unknown>>
    expect(series[0].data).toEqual([
      [100, 2],
      [100, 2],
      [105, -1],
    ])
    expect(series[0].symbolSize).toBe(8)
    expect(series[0].progressive).toBeUndefined()
    expect(series[0].progressiveThreshold).toBeUndefined()
    expect(series[0].large).toBeUndefined()

    const tooltip = option.tooltip as { formatter: (params: unknown) => string }
    const text = tooltip.formatter({ data: [100, 2] })
    expect(text).toBe('Mean: 100.0 bpm<br/>Primary − Secondary: 2.0 bpm')
  })

  it('weighted output emits 3-element tuples with counts and a symbolSize function', () => {
    const option = buildBlandAltmanOption(BA_STATS, 'Primary', 'Secondary', { weighted: true })
    const series = option.series as Array<Record<string, unknown>>

    expect(series[0].data).toEqual([
      [100, 2, 2],
      [105, -1, 1],
    ])
    expect(typeof series[0].symbolSize).toBe('function')
    expect(series[0].large).toBeUndefined()
    expect(series[0].progressive).toBe(2000)
    expect(series[0].progressiveThreshold).toBe(3000)

    const symbolSize = series[0].symbolSize as (v: number[]) => number
    expect(symbolSize([100, 2, 1])).toBeLessThan(symbolSize([100, 2, 40]))
    expect(symbolSize([100, 2, 1000])).toBeLessThanOrEqual(18)

    const tooltip = option.tooltip as { formatter: (params: unknown) => string }
    expect(tooltip.formatter({ data: [100, 2, 2] })).toBe(
      'Mean: 100.0 bpm<br/>Primary − Secondary: 2.0 bpm<br/>2 points',
    )
    expect(tooltip.formatter({ data: [105, -1, 1] })).toBe(
      'Mean: 105.0 bpm<br/>Primary − Secondary: -1.0 bpm<br/>1 point',
    )
  })
})

describe('buildConcordanceOption weighted option', () => {
  it('defaults to unweighted and matches passing weighted:false explicitly', () => {
    const implicit = buildConcordanceOption(CC_STATS, 'Primary', 'Secondary')
    const explicit = buildConcordanceOption(CC_STATS, 'Primary', 'Secondary', { weighted: false })
    expect(withoutFunctions(implicit)).toEqual(withoutFunctions(explicit))
  })

  it('unweighted output keeps raw 2-tuples and the fixed marker size', () => {
    const option = buildConcordanceOption(CC_STATS, 'Primary', 'Secondary')
    const series = option.series as Array<Record<string, unknown>>
    expect(series[0].data).toEqual([
      [100, 98],
      [100, 98],
      [105, 106],
    ])
    expect(series[0].symbolSize).toBe(8)
    expect(series[0].progressive).toBeUndefined()
  })

  it('weighted output collapses duplicates and sizes by count', () => {
    const option = buildConcordanceOption(CC_STATS, 'Primary', 'Secondary', { weighted: true })
    const series = option.series as Array<Record<string, unknown>>
    expect(series[0].data).toEqual([
      [100, 98, 2],
      [105, 106, 1],
    ])
    expect(typeof series[0].symbolSize).toBe('function')
    expect(series[0].large).toBeUndefined()
  })
})
