import { useMemo } from 'react'
import type { FileData, GraphDataPoint } from '../types/fitTypes'

export interface GraphFileInput {
  id: string
  data: FileData | null
}

/**
 * Assigns each loaded file a unique series name, appending "(n)" only for
 * files that actually collide on name. Works for any number of files, not
 * just a hardcoded pair.
 */
function buildSeriesNameById(loadedFiles: Array<{ id: string; data: FileData }>): Map<string, string> {
  const baseNameById = new Map<string, string>()
  const totalByBaseName = new Map<string, number>()

  loadedFiles.forEach(({ id, data }) => {
    const baseName = data.fileName.replace(/\.[^/.]+$/, '')
    baseNameById.set(id, baseName)
    totalByBaseName.set(baseName, (totalByBaseName.get(baseName) ?? 0) + 1)
  })

  const seenByBaseName = new Map<string, number>()
  const seriesNameById = new Map<string, string>()
  loadedFiles.forEach(({ id }) => {
    const baseName = baseNameById.get(id)!
    if ((totalByBaseName.get(baseName) ?? 0) > 1) {
      const occurrence = (seenByBaseName.get(baseName) ?? 0) + 1
      seenByBaseName.set(baseName, occurrence)
      seriesNameById.set(id, `${baseName} (${occurrence})`)
    } else {
      seriesNameById.set(id, baseName)
    }
  })

  return seriesNameById
}

export function useGraphData(files: GraphFileInput[], paceSourceId: string | null) {
  const loadedFiles = useMemo(
    () => files.filter((f): f is { id: string; data: FileData } => f.data !== null),
    [files],
  )

  const seriesNameById = useMemo(() => buildSeriesNameById(loadedFiles), [loadedFiles])

  const combinedGraphData = useMemo<GraphDataPoint[]>(() => {
    if (loadedFiles.length < 2) return []

    const dataMap = new Map<number, GraphDataPoint>()

    const mergeRecords = (
      records: FileData['activity']['records'],
      seriesName: string,
      includePace: boolean,
    ) => {
      records.forEach((record) => {
        const secondKey = Math.round(new Date(record.timestamp).getTime() / 1000)
        let point = dataMap.get(secondKey)
        if (!point) {
          point = { timestamp: new Date(secondKey * 1000).toISOString() }
          dataMap.set(secondKey, point)
        }
        point[seriesName] = record.heartRate || 0

        if (includePace && record.speed && record.speed > 0) {
          // Pace in min/mile = 60 / speed (km/h) * 1.609344
          const pace = (60 / record.speed) * 1.609344
          const paceKey = `${seriesName} Pace`
          point[paceKey] = pace
        }
      })
    }

    loadedFiles.forEach(({ id, data }) => {
      mergeRecords(data.activity.records, seriesNameById.get(id)!, id === paceSourceId)
    })

    const allData = Array.from(dataMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, point]) => point)

    return allData
  }, [loadedFiles, seriesNameById, paceSourceId])

  return { combinedGraphData, seriesNameById }
}
