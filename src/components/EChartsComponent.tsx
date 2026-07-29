import { useRef, useEffect, useCallback } from 'react'
import * as echarts from 'echarts'
import type { EChartsComponentProps, SimplifiedLapData } from '../types/fitTypes'
import './EChartsComponent.css'
import { CHART_COLORS } from '../utils/chartColors'

interface ExtendedEChartsComponentProps extends EChartsComponentProps {
  laps?: SimplifiedLapData[]
}

const EChartsComponent: React.FC<ExtendedEChartsComponentProps> = ({
  data,
  zoomIndex,
  onZoomChange,
  laps,
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  const handleZoomChange = useCallback((range: { startIndex: number; endIndex: number } | null) => {
    onZoomChange(range)
  }, [onZoomChange])

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return

    // Initialize chart
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, 'dark')
    }

    const chart = chartInstanceRef.current

    // Build series names from data keys
    const seriesNameSet = new Set<string>()
    data.forEach((d) => {
      Object.keys(d).forEach((key) => {
        if (key !== 'timestamp') {
          seriesNameSet.add(key)
        }
      })
    })
    const seriesNames: string[] = Array.from(seriesNameSet)

    // Separate pace series from heart rate series
    const paceSeries: string[] = []
    const hrSeries: string[] = []
    seriesNames.forEach((name) => {
      if (name.endsWith(' Pace')) {
        paceSeries.push(name)
      } else {
        hrSeries.push(name)
      }
    })

    // Build display name map: HR series get " HR" suffix, pace series stay as-is
    const seriesDisplayNameMap = new Map<string, string>()
    hrSeries.forEach((name) => seriesDisplayNameMap.set(name, `${name} HR`))
    paceSeries.forEach((name) => seriesDisplayNameMap.set(name, name))

    // Validate data
    if (hrSeries.length === 0 || data.length === 0) {
      console.warn('No HR data to render:', { seriesNames, dataLength: data.length })
      return
    }

    // Transform data for ECharts
    const timestamps = data.map((d) => new Date(d.timestamp).toLocaleTimeString())

    // Build lap mark line positions (skip the first lap)
    const lapMarkLineData = (laps || [])
      .filter((_, i) => i > 0)
      .map((lap) => {
        const lapDate = new Date(lap.startTime).getTime()
        // Find the closest data point index
        const idx = data.findIndex((d) => {
          return new Date(d.timestamp).getTime() >= lapDate
        })
        return idx >= 0 ? { xAxis: idx } : null
      })
      .filter((m): m is { xAxis: number } => m !== null)

    const markLineOption = lapMarkLineData.length > 0 ? ({
      symbol: 'none',
      label: { show: false },
      data: lapMarkLineData.map((m) => ({ xAxis: m.xAxis })),
      lineStyle: {
        color: 'rgba(150, 150, 150, 0.1)',
        width: 1,
        type: 'dashed' as const,
      },
    }) : undefined

    // Build heart rate series — one series per HR data source (one per device)
    const heartRateSeriesConfiguration = hrSeries.map((name, index) => ({
      name: seriesDisplayNameMap.get(name) || name,
      type: 'line' as const,
      data: data.map((d) => d[name] || null),
      xAxisIndex: 0,
      yAxisIndex: 0,
      smooth: false,
      symbol: 'none',
      lineStyle: {
        color: CHART_COLORS.series[index],
        width: 2,
      },
      itemStyle: {
        color: CHART_COLORS.series[index],
      },
      markLine: markLineOption,
    }))

    // Build pace series data
    const paceSeriesData = paceSeries.map((name) =>
      data.map((d) => d[name] ?? null)
    )

    const option: echarts.EChartsOption = {
      backgroundColor: CHART_COLORS.background,
      textStyle: {
        color: CHART_COLORS.text,
      },
      grid: {
        top: '5%',
        left: '4%',
        right: '4%',
        bottom: '20%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: CHART_COLORS.tooltip.background,
        borderColor: CHART_COLORS.tooltip.border,
        borderWidth: 2,
        textStyle: {
          color: CHART_COLORS.tooltip.text,
        },
        formatter: (params: unknown) => {
          // ECharts passes `echarts.SymbolItem[]` — one item per series at the hovered x-axis point.
          // Each item: { seriesName: string, value: number, marker: string, dataIndex: number, data: any }
          // params[0] is the category/timestamp axis label; remaining items are HR & pace series.
          if (!Array.isArray(params)) return ''

          // Extract time label from the timestamp series or fallback to our pre-built array
          let timeLabel = ''
          const tsParam = params.find((p) => p?.seriesName === 'timestamp')
          if (tsParam?.value && typeof tsParam.value === 'string') {
            timeLabel = tsParam.value
          } else if (tsParam?.dataIndex != null) {
            timeLabel = timestamps[tsParam.dataIndex] || ''
          }

          const lines: string[] = timeLabel ? [`<strong>${timeLabel}</strong>`] : []

          for (const p of params) {
            if (p?.seriesName === 'timestamp' || p?.value == null || p?.value === '-') continue
            const name = p?.seriesName || ''
            const value = p?.value as number
            const display = name.endsWith(' Pace')
              ? `${Math.floor(value)}:${String(Math.round((value - Math.floor(value)) * 60)).padStart(2, '0')}`
              : String(value)
            lines.push(`${p?.marker || ''}${name}: ${display}`)
          }
          return lines.join('<br/>')
        },
      },
      legend: {
        data: seriesNames.map((name) => seriesDisplayNameMap.get(name) || name),
        textStyle: {
          color: CHART_COLORS.text,
        },
        bottom: 50,
        itemStyle: {
          color: 'transparent',
          borderColor: 'transparent',
        },
      },
      xAxis: [
        {
          type: 'category',
          data: timestamps,
          axisLine: {
            lineStyle: {
              color: CHART_COLORS.axisLine,
            },
          },
          axisLabel: {
            color: CHART_COLORS.text,
            interval: Math.max(0, Math.floor(data.length / 12)),
            rotate: -45,
          },
        },
      ],
      yAxis: [
        {
          type: 'value',
          name: 'Heart Rate (bpm)',
          nameTextStyle: {
            color: CHART_COLORS.text,
            fontSize: 12,
          },
          nameLocation: 'middle',
          nameGap: 40,
          // min: 'dataMin',
          // max: 'dataMax',
          scale: true,
          axisLine: {
            lineStyle: {
              color: CHART_COLORS.axisLine,
            },
          },
          axisLabel: {
            color: CHART_COLORS.text,
          },
          splitLine: {
            lineStyle: {
              color: CHART_COLORS.splitLine,
            },
          },
        },
        {
          type: 'value',
          scale: false,
          inverse: true,
          name: 'Pace (min/mi)',
          nameLocation: 'middle',
          nameGap: 40,
          position: 'right',
          axisLabel: {
            formatter: (value: number) => {
              const mins = Math.floor(value)
              const secs = Math.round((value - mins) * 60)
              return `${mins}:${secs.toString().padStart(2, '0')}`
            },
          },
          splitLine: {
            show: false,
          },
        },
      ],
      dataZoom: [
        {
          type: 'slider',
          show: true,
          start: 0,
          end: 100,
          textStyle: {
            color: CHART_COLORS.text,
          },
        },
      ],
      series: [
        ...heartRateSeriesConfiguration,
        {
          name: paceSeries.length > 0 ? (seriesDisplayNameMap.get(paceSeries[0]) || paceSeries[0]) : 'Pace',
          type: 'line',
          data: paceSeriesData[0] || [],
          xAxisIndex: 0,
          yAxisIndex: 1,
          smooth: false,
          symbol: 'none',
          lineStyle: {
            type: 'dotted',
            color: CHART_COLORS.pace,
            width: 1,
          },
          itemStyle: {
            color: CHART_COLORS.pace,
          },
          markLine: markLineOption,
        },
      ],
    }

    chart.setOption(option)


    // Handle zoom events
    const handleDataZoom = () => {
      const option = chart.getOption() as echarts.EChartsOption
      const dataZoomOption = (option.dataZoom as echarts.DataZoomComponentOption[]) || []

      if (dataZoomOption.length > 0) {
        const start = (dataZoomOption[0].start as number) || 0
        const end = (dataZoomOption[0].end as number) || 100

        const startIndex = Math.floor((start / 100) * data.length)
        const endIndex = Math.floor((end / 100) * data.length) - 1

        if (startIndex === 0 && endIndex === data.length - 1) {
          handleZoomChange(null)
        } else {
          handleZoomChange({ startIndex, endIndex })
        }
      }
    }

    chart.on('datazoom', handleDataZoom)

    // Handle window resize
    const handleResize = () => {
      chart.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.off('datazoom', handleDataZoom)
    }
  }, [data, handleZoomChange])

  useEffect(() => {
    const chart = chartInstanceRef.current
    if (chart && zoomIndex === null) {
      chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
    }
  }, [zoomIndex])

  return <div ref={chartRef} className="echarts-container" />
}

export default EChartsComponent
