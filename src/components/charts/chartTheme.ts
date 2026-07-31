/**
 * Shared ECharts styling.
 *
 * The three charts are visually one family, so their palette and their axis /
 * tooltip / grid boilerplate live here. Each chart's own option builder is then
 * left describing only what makes that chart different.
 */

export const CHART_COLORS = {
  text: '#bbb',
  /** Brighter than `text` — tooltips sit on a solid surface. */
  tooltipText: '#fff',
  axisLine: '#444',
  splitLine: '#333',
  /** Card background — also used to outline scatter points so they separate. */
  surface: '#1a1f3a',
  /** Brand orange, used for emphasis lines and tooltip borders. */
  accent: '#ff6b35',
  /** One colour per device series, in order. */
  series: [
    '#5470c6',
    '#91cc75',
    '#fac858',
    '#ee6666',
    '#73c0de',
    '#3ba272',
    '#fc8452',
    '#9a60b4',
    '#ea7ccc',
  ],
  pace: '#e0efde',
  /** Transparent so the card's gradient shows through. */
  background: 'rgba(10, 14, 39, 0)',
} as const

/** Colour for the nth device series, wrapping if there are more series than colours. */
export function seriesColor(index: number): string {
  return CHART_COLORS.series[index % CHART_COLORS.series.length]
}

export const chartBackground = {
  backgroundColor: CHART_COLORS.background,
  textStyle: { color: CHART_COLORS.text },
} as const

export const tooltipStyle = {
  backgroundColor: CHART_COLORS.surface,
  borderColor: CHART_COLORS.accent,
  borderWidth: 2,
  textStyle: { color: CHART_COLORS.tooltipText },
} as const

/** A styled value axis. `nameGap` is the distance from the axis to its label. */
export function valueAxis(name: string, nameGap = 30) {
  return {
    type: 'value' as const,
    name,
    nameLocation: 'middle' as const,
    nameGap,
    nameTextStyle: { color: CHART_COLORS.text, fontSize: 12 },
    scale: true,
    axisLine: { lineStyle: { color: CHART_COLORS.axisLine } },
    axisLabel: { color: CHART_COLORS.text },
    splitLine: { lineStyle: { color: CHART_COLORS.splitLine } },
  }
}

/**
 * Read the `[x, y]` pair out of an `item`-triggered tooltip callback.
 *
 * ECharts types the callback argument as a union covering every trigger mode,
 * so narrowing it here keeps the cast in one audited place instead of one per
 * scatter chart.
 */
export function tooltipPoint(params: unknown): [number, number] | null {
  const data = (params as { data?: unknown }).data
  if (!Array.isArray(data)) return null
  const [x, y] = data
  return typeof x === 'number' && typeof y === 'number' ? [x, y] : null
}

/** Shared look for the two agreement scatter plots. */
export const scatterStyle = {
  symbolSize: 8,
  itemStyle: {
    color: CHART_COLORS.series[0],
    opacity: 0.65,
    // Outlining in the card colour keeps overlapping points readable.
    borderColor: CHART_COLORS.surface,
    borderWidth: 2,
  },
} as const

/**
 * Optional extra behaviour for the two agreement scatters, additive so the
 * existing pairwise screen (which never sets `weighted`) is byte-for-byte
 * unchanged.
 */
export interface AgreementPlotOptions {
  /**
   * Dedupe points and size by multiplicity instead of drawing every raw pair.
   * Needed once a scatter pools thousands of points into a few hundred
   * distinct integer coordinates — a fixed `symbolSize` would otherwise
   * render a solid blob no denser-looking than a single point.
   */
  weighted?: boolean
}

/** Marker sizing for a weighted (deduped) scatter — count-aware, capped so dense points don't dominate. */
export function weightedSymbolSize(value: readonly number[]): number {
  const count = value[2] ?? 1
  return Math.min(18, 4 + 3 * Math.sqrt(count))
}

/** Item style for a weighted scatter: same palette, lighter so overlapping markers stay legible. */
export const weightedScatterItemStyle = {
  ...scatterStyle.itemStyle,
  opacity: 0.5,
} as const
