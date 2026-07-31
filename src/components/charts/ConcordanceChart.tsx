import { useMemo } from 'react'
import type { ConcordanceStats } from '../../features/comparison/comparisonStats'
import { buildConcordanceOption } from './concordanceOption'
import { useEChart } from './useEChart'
import './chart.css'

interface ConcordanceChartProps {
  stats: ConcordanceStats
  primaryName: string
  secondaryName: string
}

export function ConcordanceChart({ stats, primaryName, secondaryName }: ConcordanceChartProps) {
  const option = useMemo(
    () => buildConcordanceOption(stats, primaryName, secondaryName),
    [stats, primaryName, secondaryName],
  )
  const { containerRef } = useEChart(option)

  return <div ref={containerRef} className="chart-container" />
}
