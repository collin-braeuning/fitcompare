import { useState, useCallback } from 'react'
import FitParser from 'fit-file-parser'
import type { FileData } from '../types/fitTypes'
import { parseFitData, type SimplifiedFitData } from '../utils/fitDataParser'
import type { SampleFile } from '../constants/sampleFiles'

export function useFitFileLoader() {
  const [data, setData] = useState<FileData | null>(null)

  const loadActivity = useCallback((buffer: ArrayBuffer, name: string) => {
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
        console.error('Error parsing FIT file:', error)
        alert(`Error parsing file: ${error.message}`)
      } else {
        try {
          const simplifiedData: SimplifiedFitData = parseFitData(parsedData)
          if (simplifiedData.activities.length > 0) {
            setData({
              fileName: name.replace(/\.[^/.]+$/, ''),
              activity: simplifiedData.activities[0],
            })
          }
        } catch (parseError) {
          console.error('Error parsing simplified FIT data:', parseError)
          alert('Error processing FIT data')
        }
      }
    })
  }, [])

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      loadActivity(e.target?.result as ArrayBuffer, file.name)
    }
    reader.readAsArrayBuffer(file)
  }, [loadActivity])

  const loadSample = useCallback((sample: SampleFile) => {
    fetch(sample.url)
      .then((r) => r.arrayBuffer())
      .then((buf) => loadActivity(buf, sample.name))
      .catch((err) => {
        console.error('Error loading sample: ', err)
        alert('Error loading sample file')
      })
  }, [loadActivity])

  const reset = useCallback(() => {
    setData(null)
  }, [])

  return { data, parseFile, loadSample, reset }
}
