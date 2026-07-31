import { useMemo } from 'react'
import type { FileData, GraphDataPoint } from '../types/fitTypes'
import { calculateAbsoluteDifferenceStats, calculateBlandAltmanStats } from '../utils/comparisonStats'

export function useComparisonStats(file1Loaded: FileData | null, file2Loaded: FileData | null, combinedGraphData: GraphDataPoint[]) {
  const pairedValues = useMemo(() => {
    if (!file1Loaded || !file2Loaded || combinedGraphData.length === 0) return null

    const file1Name = file1Loaded.fileName.replace(/\.[^/.]+$/, '')
    const file2Name = file2Loaded.fileName.replace(/\.[^/.]+$/, '')
    const series1Name = file1Name === file2Name ? `${file1Name} (1)` : file1Name
    const series2Name = file1Name === file2Name ? `${file2Name} (2)` : file2Name

    const file1Values: number[] = []
    const file2Values: number[] = []

    // Only compare samples where both devices recorded a reading for the
    // same second — devices are started at different times so their
    // timelines won't fully overlap.
    for (const point of combinedGraphData) {
      const hr1 = point[series1Name] as number
      const hr2 = point[series2Name] as number
      if (hr1 && hr2 && hr1 !== 0 && hr2 !== 0) {
        file1Values.push(hr1)
        file2Values.push(hr2)
      }
    }

    if (file1Values.length === 0) return null

    return { file1Values, file2Values, series1Name, series2Name }
  }, [file1Loaded, file2Loaded, combinedGraphData])

  const comparisonStats = useMemo(() => {
    if (!pairedValues) return null

    const { avgAbsDiff, maxAbsDiff } = calculateAbsoluteDifferenceStats(pairedValues.file1Values, pairedValues.file2Values)
    return { avgAbsDiff, maxAbsDiff, matchingPoints: pairedValues.file1Values.length }
  }, [pairedValues])

  const blandAltmanStats = useMemo(() => {
    if (!pairedValues) return null

    return calculateBlandAltmanStats(pairedValues.file1Values, pairedValues.file2Values)
  }, [pairedValues])

  const getDiffColor = (avgAbsDiff: number): string => {
    if (avgAbsDiff <= 3) return 'diff-good'
    if (avgAbsDiff <= 7) return 'diff-warn'
    return 'diff-bad'
  }

  return {
    comparisonStats,
    blandAltmanStats,
    series1Name: pairedValues?.series1Name ?? null,
    series2Name: pairedValues?.series2Name ?? null,
    getDiffColor,
  }
}
