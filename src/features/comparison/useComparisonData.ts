import { useMemo } from 'react'
import { FILE_SLOTS, PRIMARY_SLOT, SECONDARY_SLOT, type LoadedFile } from '../fit-file'
import { buildComparisonChartData } from './comparisonChartData'
import { buildComparisonSummary } from './comparisonSummary'

/**
 * Derives everything the comparison screen renders from the loaded files.
 *
 * All the work lives in pure functions; this hook only decides *when* to redo
 * it. Both steps are heavy (aligning tens of thousands of samples, then three
 * passes of statistics over them), so each is memoised on exactly what it
 * reads — the summary recomputes only when the aligned data itself changes,
 * not on every re-render or on unrelated state like the zoom range.
 */
export function useComparisonData(
  loadedBySlot: Record<string, LoadedFile>,
  paceSourceId: string,
) {
  const chartData = useMemo(
    () => buildComparisonChartData(FILE_SLOTS, loadedBySlot, paceSourceId),
    [loadedBySlot, paceSourceId],
  )

  const summary = useMemo(
    () => buildComparisonSummary(chartData, PRIMARY_SLOT.id, SECONDARY_SLOT.id),
    [chartData],
  )

  return { chartData, summary }
}
