import { useRef, useEffect, useCallback } from 'react'
import * as echarts from 'echarts'
import type { EChartsComponentProps } from '../types/fitTypes'
import './EChartsComponent.css'

const EChartsComponent: React.FC<EChartsComponentProps> = ({
  data,
  zoomIndex,
  onZoomChange,
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

    console.log('ECharts Data Debug:', {
      dataLength: data.length,
      seriesNames,
      firstDataPoint: data[0],
    })

    // Validate data
    if (seriesNames.length === 0 || data.length === 0) {
      console.warn('No data to render:', { seriesNames, dataLength: data.length })
      return
    }

    // Transform data for ECharts
    const timestamps = data.map((d) => new Date(d.timestamp).toLocaleTimeString())
    const seriesData = seriesNames.map((name) => data.map((d) => d[name] || null))

    console.log('Series Data Lengths:', seriesData.map((s) => s.length))

    // Build chart options
    const options: echarts.EChartsOption = {
      backgroundColor: 'rgba(10, 14, 39, 0)',
      textStyle: {
        color: '#bbb',
      },
      grid: {
        top: '5%',
        left: '2%',
        right: '2%',
        bottom: '20%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1a1f3a',
        borderColor: '#ff6b35',
        borderWidth: 2,
        textStyle: {
          color: '#fff',
        },
      },
      legend: {
        data: seriesNames,
        textStyle: {
          color: '#bbb',
        },
        bottom: 50,
        itemStyle: {
          color: 'transparent',
          borderColor: 'transparent',
        },
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLine: {
          lineStyle: {
            color: '#444',
          },
        },
        axisLabel: {
          color: '#bbb',
          interval: Math.max(0, Math.floor(data.length / 12)),
          rotate: -45,
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: 'Heart Rate (bpm)',
        nameTextStyle: {
          color: '#bbb',
          fontSize: 12,
        },
        nameLocation: 'middle',
        nameGap: 40,
        axisLine: {
          lineStyle: {
            color: '#444',
          },
        },
        axisLabel: {
          color: '#bbb',
        },
        splitLine: {
          lineStyle: {
            color: '#333',
          },
        },
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          start: 0,
          end: 100,
          textStyle: {
            color: '#bbb',
          },
          bottom: 20,
        },
      ],
      series: seriesNames.map((name, index) => ({
        name,
        type: 'line',
        data: seriesData[index],
        lineStyle: {
          color: index === 0 ? '#ff6b35' : '#3498db',
          width: 2,
        },
        smooth: false,
        symbol: 'none',
        itemStyle: {
          color: index === 0 ? '#ff6b35' : '#3498db',
        },
        sampling: 'lttb',
        connectNulls: false,
      })),
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
