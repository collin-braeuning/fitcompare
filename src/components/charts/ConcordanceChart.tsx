import { useMemo } from 'react'
import type { ConcordanceStats } from '../../features/comparison/comparisonStats'
import { buildConcordanceOption } from './concordanceOption'
import type { AgreementPlotOptions } from './chartTheme'
import { useEChart } from './useEChart'
import './chart.css'

interface ConcordanceChartProps {
  stats: ConcordanceStats
  primaryName: string
  secondaryName: string
  /** Omit for the pairwise screen's plain scatter — the batch screen's pooled chart passes `{ weighted: true }`. */
  plot?: AgreementPlotOptions
}

export function ConcordanceChart({ stats, primaryName, secondaryName, plot }: ConcordanceChartProps) {
  const option = useMemo(
    () => buildConcordanceOption(stats, primaryName, secondaryName, plot),
    [stats, primaryName, secondaryName, plot],
  )
  const { containerRef } = useEChart(option)

  return <div ref={containerRef} className="chart-container" />
}
