import { useMemo } from 'react'
import type { FileData, GraphDataPoint } from '../types/fitTypes'
import { calculateCorrelation } from '../utils/correlation'

export function useCorrelation(file1Loaded: FileData | null, file2Loaded: FileData | null, combinedGraphData: GraphDataPoint[]) {
  const correlationData = useMemo(() => {
    if (!file1Loaded || !file2Loaded || combinedGraphData.length === 0) return null

    const file1Name = file1Loaded.fileName.replace(/\.[^/.]+$/, '')
    const file2Name = file2Loaded.fileName.replace(/\.[^/.]+$/, '')
    const series1Name = file1Name === file2Name ? `${file1Name} (1)` : file1Name
    const series2Name = file1Name === file2Name ? `${file2Name} (2)` : file2Name

    const file1Values: number[] = []
    const file2Values: number[] = []

    for (const point of combinedGraphData) {
      const hr1 = point[series1Name] as number
      const hr2 = point[series2Name] as number
      if (hr1 && hr2 && hr1 !== 0 && hr2 !== 0) {
        file1Values.push(hr1)
        file2Values.push(hr2)
      }
    }

    if (file1Values.length < 2) return null

    const r = calculateCorrelation(file1Values, file2Values)
    return { r, matchingPoints: file1Values.length }
  }, [file1Loaded, file2Loaded, combinedGraphData])

  const getCorrelationColor = (r: number): string => {
    const absR = Math.abs(r)
    if (absR >= 0.7) return 'correlation-high'
    if (absR >= 0.4) return 'correlation-medium'
    return 'correlation-low'
  }

  return { correlationData, getCorrelationColor }
}
