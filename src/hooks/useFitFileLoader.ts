import { useState, useCallback } from 'react'
import FitParser from 'fit-file-parser'
import type { FileData } from '../types/fitTypes'
import { parseFitData, type SimplifiedFitData } from '../utils/fitDataParser'
import type { SampleFile } from '../constants/sampleFiles'

/**
 * Manages an arbitrary number of loaded FIT files keyed by an arbitrary slot id,
 * so adding another upload slot is just adding another id — no new hook instance
 * or new state variable required.
 */
export function useMultiFitFileLoader() {
  const [filesById, setFilesById] = useState<Record<string, FileData | null>>({})

  const loadActivity = useCallback((id: string, buffer: ArrayBuffer, name: string) => {
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'celsius',
      pressureUnit: 'bar',
      elapsedRecordField: true,
      mode: 'cascade',
    })

    fitParser.parse(buffer, (error: Error | null, parsedData: unknown) => {
      if (error) {
        console.error('[useMultiFitFileLoader] FIT parse error:', error)
        alert(`Error parsing file: ${error.message}`)
      } else {
        try {
          const simplifiedData: SimplifiedFitData = parseFitData(parsedData)
          if (simplifiedData.activities.length > 0) {
            const fileData: FileData = {
              fileName: name.replace(/\.[^/.]+$/, ''),
              activity: simplifiedData.activities[0],
            }
            setFilesById((prev) => ({ ...prev, [id]: fileData }))
          } else {
            console.warn('[useMultiFitFileLoader] no activities found in parsed data')
          }
        } catch (parseError) {
          console.error('[useMultiFitFileLoader] Error parsing simplified FIT data:', parseError)
          alert('Error processing FIT data')
        }
      }
    })
  }, [])

  const parseFile = useCallback((id: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      loadActivity(id, e.target?.result as ArrayBuffer, file.name)
    }
    reader.readAsArrayBuffer(file)
  }, [loadActivity])

  const loadSample = useCallback((id: string, sample: SampleFile) => {
    fetch(sample.url)
      .then((r) => {
        return r.arrayBuffer()
      })
      .then((buf) => {
        loadActivity(id, buf, sample.name)
      })
      .catch((err) => {
        console.error('[useMultiFitFileLoader] Error loading sample: ', err)
        alert('Error loading sample file')
      })
  }, [loadActivity])

  const reset = useCallback((id: string) => {
    setFilesById((prev) => ({ ...prev, [id]: null }))
  }, [])

  const resetAll = useCallback(() => {
    setFilesById({})
  }, [])

  return { filesById, parseFile, loadSample, reset, resetAll }
}
