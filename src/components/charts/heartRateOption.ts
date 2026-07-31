import type { EChartsOption, LineSeriesOption } from 'echarts'
import type { ComparisonChartData } from '../../features/comparison/comparisonChartData'
import type { FitLap } from '../../features/fit-file'
import { formatPace } from '../../lib/pace'
import { CHART_COLORS, chartBackground, seriesColor, tooltipStyle, valueAxis } from './chartTheme'

/**
 * Builds the ECharts option for the combined heart-rate / pace chart.
 *
 * Pure and free of React so the (substantial) chart configuration can be read,
 * diffed and tested on its own; the component beside it only wires it up.
 */

/** Roughly how many x-axis labels to show, whatever the run's length. */
const TARGET_X_AXIS_LABELS = 12

/** The shape ECharts passes to an `axis`-triggered tooltip formatter. */
interface AxisTooltipItem {
  seriesName?: string
  dataIndex: number
  value: unknown
  marker?: string
}

/**
 * Map lap boundaries onto x-axis indices.
 *
 * Both lists are already sorted, so one merge pass is enough — searching the
 * timeline per lap would be O(laps × samples), and a long run is tens of
 * thousands of samples.
 */
function lapBoundaryIndices(epochSeconds: number[], laps: FitLap[]): number[] {
  const indices: number[] = []
  let cursor = 0

  // Lap 1's start is the start of the activity, not a boundary worth drawing.
  for (const lap of laps.slice(1)) {
    const lapStartMs = Date.parse(lap.startTime)
    if (Number.isNaN(lapStartMs)) continue

    const lapStartSecond = lapStartMs / 1000
    while (cursor < epochSeconds.length && epochSeconds[cursor] < lapStartSecond) cursor++
    if (cursor >= epochSeconds.length) break

    indices.push(cursor)
  }

  return indices
}

function buildLapMarkLine(epochSeconds: number[], laps: FitLap[]): LineSeriesOption['markLine'] {
  const indices = lapBoundaryIndices(epochSeconds, laps)
  if (indices.length === 0) return undefined

  return {
    symbol: 'none',
    silent: true,
    label: { show: false },
    data: indices.map((xAxis) => ({ xAxis })),
    lineStyle: { color: 'rgba(150, 150, 150, 0.1)', width: 1, type: 'dashed' },
  }
}

export function buildHeartRateOption(
  data: ComparisonChartData,
  laps: FitLap[],
): EChartsOption | null {
  if (data.epochSeconds.length === 0 || data.heartRate.length === 0) return null

  const timeLabels = data.epochSeconds.map((second) =>
    new Date(second * 1000).toLocaleTimeString(),
  )
  const lapMarkLine = buildLapMarkLine(data.epochSeconds, laps)
  const paceName = data.pace?.name

  const heartRateSeries: LineSeriesOption[] = data.heartRate.map((series, index) => ({
    name: `${series.name} HR`,
    type: 'line',
    data: series.values,
    yAxisIndex: 0,
    symbol: 'none',
    lineStyle: { color: seriesColor(index), width: 2 },
    itemStyle: { color: seriesColor(index) },
    // Attached to the first series only; the lap lines are shared, and
    // repeating them per series just draws the same lines several times over.
    markLine: index === 0 ? lapMarkLine : undefined,
  }))

  const paceSeries: LineSeriesOption[] = data.pace
    ? [
        {
          name: data.pace.name,
          type: 'line',
          data: data.pace.values,
          yAxisIndex: 1,
          symbol: 'none',
          lineStyle: { type: 'dotted', color: CHART_COLORS.pace, width: 1 },
          itemStyle: { color: CHART_COLORS.pace },
        },
      ]
    : []

  const series = [...heartRateSeries, ...paceSeries]

  return {
    ...chartBackground,
    grid: { top: '5%', left: '4%', right: '4%', bottom: '20%', containLabel: true },
    tooltip: {
      trigger: 'axis',
      ...tooltipStyle,
      formatter: (params) => {
        const items = (Array.isArray(params) ? params : [params]) as AxisTooltipItem[]
        if (items.length === 0) return ''

        const lines = [`<strong>${timeLabels[items[0].dataIndex] ?? ''}</strong>`]
        for (const item of items) {
          if (typeof item.value !== 'number') continue
          const display =
            item.seriesName === paceName ? formatPace(item.value) : String(item.value)
          lines.push(`${item.marker ?? ''}${item.seriesName}: ${display}`)
        }
        return lines.join('<br/>')
      },
    },
    legend: {
      data: series.map((s) => s.name as string),
      textStyle: { color: CHART_COLORS.text },
      bottom: 50,
      itemStyle: { color: 'transparent', borderColor: 'transparent' },
    },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLine: { lineStyle: { color: CHART_COLORS.axisLine } },
      axisLabel: {
        color: CHART_COLORS.text,
        rotate: -45,
        // ECharts' `interval` is "labels to skip between shown labels", so
        // dividing by the target count keeps the axis readable at any duration.
        interval: Math.max(0, Math.floor(data.epochSeconds.length / TARGET_X_AXIS_LABELS)),
      },
    },
    yAxis: [
      valueAxis('Heart Rate (bpm)', 40),
      {
        ...valueAxis('Pace (min/mi)', 40),
        // Inverted so a faster pace (a smaller number) sits higher, matching
        // the intuition that "up means going better".
        inverse: true,
        scale: false,
        position: 'right',
        splitLine: { show: false },
        axisLabel: { color: CHART_COLORS.text, formatter: formatPace },
      },
    ],
    dataZoom: [
      { type: 'slider', show: true, start: 0, end: 100, textStyle: { color: CHART_COLORS.text } },
    ],
    series,
  }
}
