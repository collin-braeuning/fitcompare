import { useMemo } from 'react'
import type { BlandAltmanStats } from '../../features/comparison/comparisonStats'
import { buildBlandAltmanOption } from './blandAltmanOption'
import type { AgreementPlotOptions } from './chartTheme'
import { useEChart } from './useEChart'
import './chart.css'

interface BlandAltmanChartProps {
  stats: BlandAltmanStats
  primaryName: string
  secondaryName: string
  /** Omit for the pairwise screen's plain scatter — the batch screen's pooled chart passes `{ weighted: true }`. */
  plot?: AgreementPlotOptions
}

export function BlandAltmanChart({ stats, primaryName, secondaryName, plot }: BlandAltmanChartProps) {
  const option = useMemo(
    () => buildBlandAltmanOption(stats, primaryName, secondaryName, plot),
    [stats, primaryName, secondaryName, plot],
  )
  const { containerRef } = useEChart(option)

  return <div ref={containerRef} className="chart-container" />
}
