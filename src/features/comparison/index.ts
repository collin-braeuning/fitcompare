export { ComparisonView } from './ComparisonView'
export { ActivityComparisonTable } from './ActivityComparisonTable'
export { useComparisonData } from './useComparisonData'
export {
  buildComparisonChartData,
  EMPTY_CHART_DATA,
  type AlignedSeries,
  type ComparisonChartData,
} from './comparisonChartData'
export { buildComparisonSummary, type ComparisonSummary } from './comparisonSummary'
export {
  calculateAbsoluteDifferenceStats,
  calculateBlandAltmanStats,
  calculateConcordanceStats,
  type AbsoluteDifferenceStats,
  type BlandAltmanStats,
  type ConcordanceStats,
} from './comparisonStats'
export { cccLabel, cccLevel, differenceLevel, type AgreementLevel } from './agreementScale'
