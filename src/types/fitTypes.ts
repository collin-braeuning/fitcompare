import type { SimplifiedActivity, SimplifiedLapData } from '../utils/fitDataParser'

// Re-export for use in components
export type { SimplifiedLapData }

export interface FileData {
  fileName: string
  activity: SimplifiedActivity
}

export interface GraphDataPoint {
  timestamp: string
  [key: string]: string | number
}

export interface EChartsComponentProps {
  data: GraphDataPoint[]
  zoomIndex: { startIndex: number; endIndex: number } | null
  onZoomChange: (range: { startIndex: number; endIndex: number } | null) => void
}

export interface CorrelationResult {
  r: number
  matchingPoints: number
}
