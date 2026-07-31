import type { EChartsOption } from 'echarts'
import type { ConcordanceStats } from '../../features/comparison/comparisonStats'
import {
  CHART_COLORS,
  chartBackground,
  scatterStyle,
  tooltipPoint,
  tooltipStyle,
  valueAxis,
} from './chartTheme'

/**
 * Concordance plot: one device's reading against the other's, with the line of
 * equality (x = y) drawn through it. Points hugging that line are what a CCC
 * near 1 looks like; a parallel offset is bias, scatter is imprecision.
 */
export function buildConcordanceOption(
  stats: ConcordanceStats,
  primaryName: string,
  secondaryName: string,
): EChartsOption {
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
        return `${primaryName}: ${x.toFixed(1)} bpm<br/>${secondaryName}: ${y.toFixed(1)} bpm`
      },
    },
    xAxis: valueAxis(`${primaryName} (bpm)`),
    yAxis: valueAxis(`${secondaryName} (bpm)`, 50),
    series: [
      {
        type: 'scatter',
        data: stats.points.map((point) => [point.x, point.y]),
        ...scatterStyle,
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
