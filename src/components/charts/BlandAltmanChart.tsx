import { useMemo } from 'react'
import type { BlandAltmanStats } from '../../features/comparison/comparisonStats'
import { buildBlandAltmanOption } from './blandAltmanOption'
import { useEChart } from './useEChart'
import './chart.css'

interface BlandAltmanChartProps {
  stats: BlandAltmanStats
  primaryName: string
  secondaryName: string
}

export function BlandAltmanChart({ stats, primaryName, secondaryName }: BlandAltmanChartProps) {
  const option = useMemo(
    () => buildBlandAltmanOption(stats, primaryName, secondaryName),
    [stats, primaryName, secondaryName],
  )
  const { containerRef } = useEChart(option)

  return <div ref={containerRef} className="chart-container" />
}
