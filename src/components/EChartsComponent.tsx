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

    // Validate data
    if (hrSeries.length === 0 || data.length === 0) {
      console.warn('No HR data to render:', { seriesNames, dataLength: data.length })
      return
    }

    // Transform data for ECharts
    const timestamps = data.map((d) => new Date(d.timestamp).toLocaleTimeString())

    // Build HR series data (first Y-axis)
    const hrSeriesData = hrSeries.map((name) => data.map((d) => d[name] || null))

    // Build pace series data (second Y-axis, inverted)
    const paceSeriesData = paceSeries.map((name) => data.map((d) => d[name] ?? null))

    // Build chart options
    const optionAxes: echarts.SeriesOption[] = hrSeries.map((name, index) => ({
      name,
      type: 'line',
      yAxisIndex: 0,
      data: hrSeriesData[index],
      lineStyle: {
        color: index === 0 ? CHART_COLORS.series.accent : CHART_COLORS.series.default,
        width: 2,
      },
      smooth: false,
      symbol: 'none',
      itemStyle: {
        color: index === 0 ? CHART_COLORS.series.accent : CHART_COLORS.series.default,
      },
      sampling: 'lttb',
      connectNulls: false,
    }))

    // Add pace series with inverted Y-axis
    const paceAxisOptions: echarts.SeriesOption[] = paceSeries.map((name, index) => ({
      name,
      type: 'line',
      yAxisIndex: 1,
      data: paceSeriesData[index],
      lineStyle: {
        color: '#2ecc71',
        width: 2,
        type: 'dashed',
      },
      smooth: false,
      symbol: 'none',
      itemStyle: {
        color: '#2ecc71',
      },
      sampling: 'lttb',
      connectNulls: false,
    }))

    const options: echarts.EChartsOption = {
      backgroundColor: CHART_COLORS.background,
      textStyle: {
        color: CHART_COLORS.text,
      },
      grid: {
        top: '5%',
        left: '2%',
        right: '15%',
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
      },
      legend: {
        data: seriesNames,
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
          scale: true,
          name: 'Heart Rate (bpm)',
          nameTextStyle: {
            color: CHART_COLORS.text,
            fontSize: 12,
          },
          nameLocation: 'middle',
          nameGap: 40,
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
          scale: true,
          inverse: true,
          name: 'Pace (min/km)',
          nameTextStyle: {
            color: '#2ecc71',
            fontSize: 12,
          },
          nameLocation: 'middle',
          nameGap: 40,
          position: 'right',
          axisLine: {
            lineStyle: {
              color: '#2ecc71',
            },
          },
          axisLabel: {
            color: '#2ecc71',
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
          bottom: 20,
        },
      ],
      series: [...optionAxes, ...paceAxisOptions],
    }

    // Add vertical lap lines as markLine on the x-axis
    if (laps && laps.length > 0) {
      // Build a timestamp-to-index map for the x-axis
      const tsToIndex = new Map<string, number>()
      data.forEach((d, i) => {
        tsToIndex.set(d.timestamp, i)
      })

      const lapMarkLines = laps.map((lap, idx) => {
        // Find the closest data point index for this lap's start time
        const lapDate = new Date(lap.startTime).toISOString()
        const index = tsToIndex.get(lapDate) ?? -1
        if (index < 0) return null
        return {
          xAxis: index,
          lineStyle: {
            color: '#f39c12',
            width: 1,
            type: 'dotted',
          },
          label: {
            show: idx === 0, // show label only on first lap to avoid clutter
            formatter: `Lap ${idx + 1}`,
            color: '#f39c12',
          },
        }
      }).filter(Boolean)

      if (lapMarkLines.length > 0) {
        // Use echarts 'any' to bypass type limitations for markLine on xAxis
        const xAxisWithLaps = [
          ...((options.xAxis as any[]) ?? []),
        ]
        if (xAxisWithLaps[0]) {
          (xAxisWithLaps[0] as any).markLine = {
            data: lapMarkLines,
            silent: true,
            animation: false,
          }
        }
        ;(options as any).xAxis = xAxisWithLaps
      }
    }

    chart.setOption(options)

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
