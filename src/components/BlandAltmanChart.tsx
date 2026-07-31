import { useRef, useEffect } from 'react'
import * as echarts from 'echarts'
import type { BlandAltmanStats } from '../utils/comparisonStats'
import './EChartsComponent.css'
import { CHART_COLORS } from '../utils/chartColors'

interface BlandAltmanChartProps {
  stats: BlandAltmanStats
  series1Name: string
  series2Name: string
}

const BlandAltmanChart: React.FC<BlandAltmanChartProps> = ({ stats, series1Name, series2Name }) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, 'dark')
    }

    const chart = chartInstanceRef.current
    const diffLabel = `${series1Name} − ${series2Name}`

    const referenceLine = (
      value: number,
      label: string,
      lineStyle: echarts.LineSeriesOption['lineStyle'],
      labelPosition: 'insideEndTop' | 'insideEndBottom',
    ) => ({
      yAxis: value,
      lineStyle,
      label: {
        formatter: `${label} ${value.toFixed(1)}`,
        color: CHART_COLORS.text,
        fontSize: 11,
        position: labelPosition,
      },
    })

    const option: echarts.EChartsOption = {
      backgroundColor: CHART_COLORS.background,
      textStyle: {
        color: CHART_COLORS.text,
      },
      grid: {
        top: '8%',
        left: '4%',
        right: '4%',
        bottom: '12%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: CHART_COLORS.tooltip.background,
        borderColor: CHART_COLORS.tooltip.border,
        borderWidth: 2,
        textStyle: {
          color: CHART_COLORS.tooltip.text,
        },
        formatter: (params: unknown) => {
          const point = params as { data: [number, number] }
          const [mean, diff] = point.data
          return `Mean: ${mean.toFixed(1)} bpm<br/>${diffLabel}: ${diff.toFixed(1)} bpm`
        },
      },
      xAxis: {
        type: 'value',
        name: 'Mean of both devices (bpm)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: CHART_COLORS.text,
          fontSize: 12,
        },
        scale: true,
        axisLine: {
          lineStyle: { color: CHART_COLORS.axisLine },
        },
        axisLabel: {
          color: CHART_COLORS.text,
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.splitLine },
        },
      },
      yAxis: {
        type: 'value',
        name: `Difference: ${diffLabel} (bpm)`,
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: CHART_COLORS.text,
          fontSize: 12,
        },
        scale: true,
        axisLine: {
          lineStyle: { color: CHART_COLORS.axisLine },
        },
        axisLabel: {
          color: CHART_COLORS.text,
        },
        splitLine: {
          lineStyle: { color: CHART_COLORS.splitLine },
        },
      },
      series: [
        {
          type: 'scatter',
          data: stats.points.map((p) => [p.mean, p.diff]),
          symbolSize: 8,
          itemStyle: {
            color: CHART_COLORS.series[0],
            opacity: 0.65,
            borderColor: '#1a1f3a',
            borderWidth: 2,
          },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [
              referenceLine(
                stats.meanDiff,
                'Bias',
                { color: '#ff6b35', type: 'solid', width: 2 },
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

    chart.setOption(option, true)

    const handleResize = () => {
      chart.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [stats, series1Name, series2Name])

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose()
      chartInstanceRef.current = null
    }
  }, [])

  return <div ref={chartRef} className="echarts-container" />
}

export default BlandAltmanChart
