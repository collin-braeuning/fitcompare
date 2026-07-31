import { useRef, useEffect } from 'react'
import * as echarts from 'echarts'
import type { ConcordanceStats } from '../utils/comparisonStats'
import './EChartsComponent.css'
import { CHART_COLORS } from '../utils/chartColors'

interface ConcordanceChartProps {
  stats: ConcordanceStats
  series1Name: string
  series2Name: string
}

const ConcordanceChart: React.FC<ConcordanceChartProps> = ({ stats, series1Name, series2Name }) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, 'dark')
    }

    const chart = chartInstanceRef.current

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
          const [x, y] = point.data
          return `${series1Name}: ${x.toFixed(1)} bpm<br/>${series2Name}: ${y.toFixed(1)} bpm`
        },
      },
      xAxis: {
        type: 'value',
        name: `${series1Name} (bpm)`,
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
        name: `${series2Name} (bpm)`,
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
          data: stats.points.map((p) => [p.x, p.y]),
          symbolSize: 8,
          itemStyle: {
            color: CHART_COLORS.series[0],
            opacity: 0.65,
            borderColor: '#1a1f3a',
            borderWidth: 2,
          },
        },
        {
          type: 'line',
          data: [
            [stats.min, stats.min],
            [stats.max, stats.max],
          ],
          symbol: 'none',
          lineStyle: { color: CHART_COLORS.text, type: 'dashed', width: 1 },
          tooltip: {
            formatter: () => 'Line of equality',
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

export default ConcordanceChart
