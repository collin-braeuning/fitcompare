import type { EChartsOption, LineSeriesOption } from 'echarts'
import type { BlandAltmanStats } from '../../features/comparison/comparisonStats'
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
  plot?: AgreementPlotOptions,
): EChartsOption {
  const diffLabel = `${primaryName} − ${secondaryName}`
  const weighted = plot?.weighted ?? false

  const data = weighted
    ? collapsePairs(stats.points.map((point): [number, number] => [point.mean, point.diff])).map(
        (p) => [p.x, p.y, p.count],
      )
    : stats.points.map((point) => [point.mean, point.diff])

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
        const base = `Mean: ${mean.toFixed(1)} bpm<br/>${diffLabel}: ${diff.toFixed(1)} bpm`
        if (!weighted) return base
        const count = (params as { data?: unknown }).data
        const n = Array.isArray(count) ? count[2] : undefined
        return typeof n === 'number' ? `${base}<br/>${n} point${n === 1 ? '' : 's'}` : base
      },
    },
    xAxis: valueAxis('Mean of both devices (bpm)'),
    yAxis: valueAxis(`Difference: ${diffLabel} (bpm)`, 50),
    series: [
      {
        type: 'scatter',
        data,
        ...(weighted
          ? {
              symbolSize: weightedSymbolSize,
              itemStyle: weightedScatterItemStyle,
              // Safety net for the pooled scatter's point count; large mode
              // is deliberately not set — its simplified renderer ignores a
              // per-point `symbolSize` callback and would silently discard
              // the density encoding this view exists to show.
              progressive: 2000,
              progressiveThreshold: 3000,
            }
          : scatterStyle),
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
