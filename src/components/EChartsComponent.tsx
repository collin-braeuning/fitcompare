import { useRef, useEffect, useCallback } from 'react'
import * as echarts from 'echarts'
import type { EChartsComponentProps, SimplifiedLapData, GraphDataPoint } from '../types/fitTypes'
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

    // Extract lap line markLine data
    // const getLapMarkLineData = (): any[] | undefined => {
    //   if (!laps || laps.length === 0) return undefined

    //   const tsToIndex = new Map<string, number>()
    //   data.forEach((d: GraphDataPoint, i: number) => {
    //     tsToIndex.set(d.timestamp, i)
    //   })

    //   const hrValues = hrSeriesData[0]
    //     .filter((v): v is number => v != null)
    //   const yMin = hrValues.length > 0 ? Math.min(...hrValues) : 0
    //   const yMax = hrValues.length > 0 ? Math.max(...hrValues) : 100

    //   const lapMarkLines: any[][] = []
    //   laps.forEach((lap) => {
    //     const lapDate = new Date(lap.startTime).toISOString()
    //     const index = tsToIndex.get(lapDate)
    //     if (index === undefined) return
    //     const categoryLabel = timestamps[index]
    //     if (!categoryLabel) return
    //     lapMarkLines.push([
    //       { xAxis: categoryLabel, yAxis: yMin },
    //       { xAxis: categoryLabel, yAxis: yMax },
    //     ])
    //   })

    //   return lapMarkLines.length > 0 ? lapMarkLines : undefined
    // }

    // Add pace series with inverted Y-axis
    // const paceAxisOptions: echarts.SeriesOption[] = paceSeries.map((name, index) => ({
    //   name,
    //   type: 'line',
    //   yAxisIndex: 1,
    //   data: paceSeriesData[index],
    //   lineStyle: {
    //     color: '#2ecc71',
    //     width: 2,
    //     type: 'dashed',
    //   },
    //   smooth: false,
    //   symbol: 'none',
    //   itemStyle: {
    //     color: '#2ecc71',
    //   },
    //   sampling: 'lttb',
    //   connectNulls: false,
    // }))

    // Build the combined series array with markLine inline on each series
    // const allSeries: echarts.SeriesOption[] = [...optionAxes, ...paceAxisOptions]

    // Attach markLine to each series using the example format
    // const lapMarkLineData = getLapMarkLineData()
    // if (lapMarkLineData) {
    //   allSeries.forEach((series) => {
    //     ;(series as any).markLine = {
    //       data: lapMarkLineData,
    //       lineStyle: {
    //         color: 'rgba(200, 200, 200, 0.4)',
    //         width: 1,
    //         type: 'solid',
    //       },
    //       silent: true,
    //       animation: false,
    //       label: { show: false },
    //     }
    //   })
    // }

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
      // xAxis: [
      //   {
      //     type: 'category',
      //     data: timestamps,
      //     axisLine: {
      //       lineStyle: {
      //         color: CHART_COLORS.axisLine,
      //       },
      //     },
      //     axisLabel: {
      //       color: CHART_COLORS.text,
      //       interval: Math.max(0, Math.floor(data.length / 12)),
      //       rotate: -45,
      //     },
      //   },
      // ],
      xAxis: {
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
      yAxis: {
        type: 'value',
        scale: true
      },
      // yAxis: [
      //   {
      //     type: 'value',
      //     name: 'Heart Rate (bpm)',
      //     nameTextStyle: {
      //       color: CHART_COLORS.text,
      //       fontSize: 12,
      //     },
      //     nameLocation: 'middle',
      //     nameGap: 40,
      //     axisLine: {
      //       lineStyle: {
      //         color: CHART_COLORS.axisLine,
      //       },
      //     },
      //     axisLabel: {
      //       color: CHART_COLORS.text,
      //     },
      //     splitLine: {
      //       lineStyle: {
      //         color: CHART_COLORS.splitLine,
      //       },
      //     },
      //   },
      //   {
      //     type: 'value',
      //     scale: true,
      //     inverse: true,
      //     name: 'Pace (min/km)',
      //     nameTextStyle: {
      //       color: '#2ecc71',
      //       fontSize: 12,
      //     },
      //     nameLocation: 'middle',
      //     nameGap: 40,
      //     position: 'right',
      //     axisLine: {
      //       lineStyle: {
      //         color: '#2ecc71',
      //       },
      //     },
      //     axisLabel: {
      //       color: '#2ecc71',
      //       formatter: (value: number) => {
      //         const mins = Math.floor(value)
      //         const secs = Math.round((value - mins) * 60)
      //         return `${mins}:${secs.toString().padStart(2, '0')}`
      //       },
      //     },
      //     splitLine: {
      //       show: false,
      //     },
      //   },
      // ],
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
      series: [
        {
          name: 'Heart Rate',
          type: 'line',
          data: hrSeriesData,
          yAxisIndex: 0,
          smooth: false,
          symbol: 'none',
          lineStyle: {
            color: CHART_COLORS.series.primary,
            width: 2,
          },
          itemStyle: {
            color: CHART_COLORS.series.primary,
          },
        },
        {
          name: 'Pace',
          type: 'line',
          data: paceSeriesData,
          yAxisIndex: 1,
          smooth: false,
          symbol: 'none',
          lineStyle: {
            color:  CHART_COLORS.series.secondary,
            width: 2,
          },
          itemStyle: {
            color:  CHART_COLORS.series.secondary,
          },
        }
      ]
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
