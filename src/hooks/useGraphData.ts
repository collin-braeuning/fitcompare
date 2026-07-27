import { useMemo } from 'react'
import type { FileData, GraphDataPoint } from '../types/fitTypes'

export function useGraphData(file1Loaded: FileData | null, file2Loaded: FileData | null) {
  const combinedGraphData = useMemo<GraphDataPoint[]>(() => {
    if (!file1Loaded || !file2Loaded) return []

    const file1Name = file1Loaded.fileName.replace(/\.[^/.]+$/, '')
    const file2Name = file2Loaded.fileName.replace(/\.[^/.]+$/, '')
    
    // Create unique series names - if names are identical, append (1) and (2)
    const series1Name = file1Name === file2Name ? `${file1Name} (1)` : file1Name
    const series2Name = file1Name === file2Name ? `${file2Name} (2)` : file2Name
    
    const dataMap = new Map<number, GraphDataPoint>()

    const mergeRecords = (records: typeof file1Loaded.activity.records, seriesName: string) => {
      records.forEach((record) => {
        const secondKey = Math.round(new Date(record.timestamp).getTime() / 1000)
        let point = dataMap.get(secondKey)
        if (!point) {
          point = { timestamp: new Date(secondKey * 1000).toISOString() }
          dataMap.set(secondKey, point)
        }
        point[seriesName] = record.heartRate || 0
      })
    }
    
    mergeRecords(file1Loaded.activity.records, series1Name)
    mergeRecords(file2Loaded.activity.records, series2Name)

    const allData = Array.from(dataMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, point]) => point)
  
    return allData
  }, [file1Loaded, file2Loaded])

  return { combinedGraphData }
}
