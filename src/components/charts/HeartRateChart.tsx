import { useCallback, useEffect, useMemo } from 'react'
import type * as echarts from 'echarts'
import type { ComparisonChartData } from '../../features/comparison/comparisonChartData'
import type { FitLap } from '../../features/fit-file'
import { buildHeartRateOption } from './heartRateOption'
import { useEChart } from './useEChart'
import './chart.css'

export interface ZoomRange {
  startIndex: number
  endIndex: number
}

interface HeartRateChartProps {
  data: ComparisonChartData
  laps: FitLap[]
  /**
   * Current zoom, owned by the parent so the header can show a reset control.
   * Setting it back to `null` zooms the chart out again.
   */
  zoomRange: ZoomRange | null
  onZoomChange: (range: ZoomRange | null) => void
}

/** Translate ECharts' percentage-based zoom window into sample indices. */
function readZoomRange(chart: echarts.ECharts, sampleCount: number): ZoomRange | null {
  const dataZoom = (chart.getOption() as echarts.EChartsOption).dataZoom
  const window = Array.isArray(dataZoom) ? dataZoom[0] : dataZoom
  if (!window) return null

  const start = (window.start as number) ?? 0
  const end = (window.end as number) ?? 100

  const startIndex = Math.floor((start / 100) * sampleCount)
  const endIndex = Math.floor((end / 100) * sampleCount) - 1

  // Full range means "not zoomed", which the parent represents as null.
  return startIndex === 0 && endIndex === sampleCount - 1 ? null : { startIndex, endIndex }
}

export function HeartRateChart({ data, laps, zoomRange, onZoomChange }: HeartRateChartProps) {
  const option = useMemo(() => buildHeartRateOption(data, laps), [data, laps])
  const { containerRef, chart } = useEChart(option)

  const sampleCount = data.epochSeconds.length

  const handleZoom = useCallback(
    (chartInstance: echarts.ECharts) => {
      onZoomChange(readZoomRange(chartInstance, sampleCount))
    },
    [onZoomChange, sampleCount],
  )

  useEffect(() => {
    if (!chart) return
    const listener = () => handleZoom(chart)
    chart.on('datazoom', listener)
    return () => {
      chart.off('datazoom', listener)
    }
  }, [chart, handleZoom])

  useEffect(() => {
    // The parent clearing the range is a request to zoom back out.
    if (chart && zoomRange === null) {
      chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
    }
  }, [chart, zoomRange])

  return <div ref={containerRef} className="chart-container" />
}
