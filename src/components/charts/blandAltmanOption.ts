import type { EChartsOption, LineSeriesOption } from 'echarts'
import type { BlandAltmanStats } from '../../features/comparison/comparisonStats'
import {
  CHART_COLORS,
  chartBackground,
  scatterStyle,
  tooltipPoint,
  tooltipStyle,
  valueAxis,
} from './chartTheme'

/** A horizontal annotation line (bias, upper LoA, lower LoA). */
function referenceLine(
  value: number,
  label: string,
  lineStyle: LineSeriesOption['lineStyle'],
  position: 'insideEndTop' | 'insideEndBottom',
) {
  return {
    yAxis: value,
    lineStyle,
    label: {
      formatter: `${label} ${value.toFixed(1)}`,
      color: CHART_COLORS.text,
      fontSize: 11,
      position,
    },
  }
}

/**
 * Bland-Altman plot: each paired reading's mean against its difference, with
 * the bias and the 95% limits of agreement drawn across it. A flat cloud
 * centred on zero means the devices agree; a slope or an offset shows where
 * they don't.
 */
export function buildBlandAltmanOption(
  stats: BlandAltmanStats,
  primaryName: string,
  secondaryName: string,
): EChartsOption {
  const diffLabel = `${primaryName} − ${secondaryName}`

  return {
    ...chartBackground,
    grid: { top: '8%', left: '4%', right: '4%', bottom: '12%', containLabel: true },
    tooltip: {
      trigger: 'item',
      ...tooltipStyle,
      formatter: (params) => {
        const point = tooltipPoint(params)
        if (!point) return ''
        const [mean, diff] = point
        return `Mean: ${mean.toFixed(1)} bpm<br/>${diffLabel}: ${diff.toFixed(1)} bpm`
      },
    },
    xAxis: valueAxis('Mean of both devices (bpm)'),
    yAxis: valueAxis(`Difference: ${diffLabel} (bpm)`, 50),
    series: [
      {
        type: 'scatter',
        data: stats.points.map((point) => [point.mean, point.diff]),
        ...scatterStyle,
        markLine: {
          symbol: 'none',
          silent: true,
          data: [
            referenceLine(
              stats.meanDiff,
              'Bias',
              { color: CHART_COLORS.accent, type: 'solid', width: 2 },
              'insideEndTop',
            ),
            referenceLine(
              stats.upperLimit,
              '+1.96 SD',
              { color: CHART_COLORS.text, type: 'dashed', width: 1 },
              'insideEndTop',
            ),
            referenceLine(
              stats.lowerLimit,
              '-1.96 SD',
              { color: CHART_COLORS.text, type: 'dashed', width: 1 },
              'insideEndBottom',
            ),
          ],
        },
      },
    ],
  }
}
