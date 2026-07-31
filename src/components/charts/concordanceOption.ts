import type { EChartsOption } from 'echarts'
import type { ConcordanceStats } from '../../features/comparison/comparisonStats'
import {
  CHART_COLORS,
  chartBackground,
  scatterStyle,
  tooltipPoint,
  tooltipStyle,
  valueAxis,
  weightedScatterItemStyle,
  weightedSymbolSize,
  type AgreementPlotOptions,
} from './chartTheme'
import { collapsePairs } from './pointDensity'

/**
 * Concordance plot: one device's reading against the other's, with the line of
 * equality (x = y) drawn through it. Points hugging that line are what a CCC
 * near 1 looks like; a parallel offset is bias, scatter is imprecision.
 */
export function buildConcordanceOption(
  stats: ConcordanceStats,
  primaryName: string,
  secondaryName: string,
  plot?: AgreementPlotOptions,
): EChartsOption {
  const weighted = plot?.weighted ?? false

  const data = weighted
    ? collapsePairs(stats.points.map((point): [number, number] => [point.x, point.y])).map((p) => [
        p.x,
        p.y,
        p.count,
      ])
    : stats.points.map((point) => [point.x, point.y])

  return {
    ...chartBackground,
    grid: { top: '8%', left: '4%', right: '4%', bottom: '12%', containLabel: true },
    tooltip: {
      trigger: 'item',
      ...tooltipStyle,
      formatter: (params) => {
        const point = tooltipPoint(params)
        if (!point) return ''
        const [x, y] = point
        const base = `${primaryName}: ${x.toFixed(1)} bpm<br/>${secondaryName}: ${y.toFixed(1)} bpm`
        if (!weighted) return base
        const raw = (params as { data?: unknown }).data
        const n = Array.isArray(raw) ? raw[2] : undefined
        return typeof n === 'number' ? `${base}<br/>${n} point${n === 1 ? '' : 's'}` : base
      },
    },
    xAxis: valueAxis(`${primaryName} (bpm)`),
    yAxis: valueAxis(`${secondaryName} (bpm)`, 50),
    series: [
      {
        type: 'scatter',
        data,
        ...(weighted
          ? {
              symbolSize: weightedSymbolSize,
              itemStyle: weightedScatterItemStyle,
              progressive: 2000,
              progressiveThreshold: 3000,
            }
          : scatterStyle),
      },
      {
        type: 'line',
        name: 'Line of equality',
        data: [
          [stats.min, stats.min],
          [stats.max, stats.max],
        ],
        symbol: 'none',
        lineStyle: { color: CHART_COLORS.text, type: 'dashed', width: 1 },
        tooltip: { formatter: 'Line of equality' },
      },
    ],
  }
}
