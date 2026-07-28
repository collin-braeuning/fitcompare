import { useState, useCallback } from 'react'
import FitParser from 'fit-file-parser'
import type { FileData } from '../types/fitTypes'
import { parseFitData, type SimplifiedFitData } from '../utils/fitDataParser'
import type { SampleFile } from '../constants/sampleFiles'

export function useFitFileLoader() {
  const [data, setData] = useState<FileData | null>(null)

  const loadActivity = useCallback((buffer: ArrayBuffer, name: string) => {
    console.log('[useFitFileLoader] loadActivity called, buffer size:', buffer.byteLength, 'name:', name)
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
        console.error('[useFitFileLoader] FIT parse error:', error)
        alert(`Error parsing file: ${error.message}`)
      } else {
        console.log('[useFitFileLoader] FIT parsed successfully')
        try {
          const simplifiedData: SimplifiedFitData = parseFitData(parsedData)
          console.log('[useFitFileLoader] simplified data:', {
            activitiesCount: simplifiedData.activities.length,
            fileName: name.replace(/\.[^/.]+$/, ''),
          })
          if (simplifiedData.activities.length > 0) {
            const fileData: FileData = {
              fileName: name.replace(/\.[^/.]+$/, ''),
              activity: simplifiedData.activities[0],
            }
            console.log('[useFitFileLoader] setting data:', {
              fileName: fileData.fileName,
              sport: fileData.activity.sport,
              records: fileData.activity.records.length,
              laps: fileData.activity.laps.length,
            })
            setData(fileData)
          } else {
            console.warn('[useFitFileLoader] no activities found in parsed data')
          }
        } catch (parseError) {
          console.error('[useFitFileLoader] Error parsing simplified FIT data:', parseError)
          alert('Error processing FIT data')
        }
      }
    })
  }, [])

  const parseFile = useCallback((file: File) => {
    console.log('[useFitFileLoader] parseFile called:', file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      loadActivity(e.target?.result as ArrayBuffer, file.name)
    }
    reader.readAsArrayBuffer(file)
  }, [loadActivity])

  const loadSample = useCallback((sample: SampleFile) => {
    console.log('[useFitFileLoader] loadSample called:', sample.name)
    fetch(sample.url)
      .then((r) => {
        console.log('[useFitFileLoader] sample fetch status:', r.status)
        return r.arrayBuffer()
      })
      .then((buf) => {
        console.log('[useFitFileLoader] sample arrayBuffer size:', buf.byteLength)
        loadActivity(buf, sample.name)
      })
      .catch((err) => {
        console.error('[useFitFileLoader] Error loading sample: ', err)
        alert('Error loading sample file')
      })
  }, [loadActivity])

  const reset = useCallback(() => {
    console.log('[useFitFileLoader] reset called')
    setData(null)
  }, [])

  return { data, parseFile, loadSample, reset }
}
