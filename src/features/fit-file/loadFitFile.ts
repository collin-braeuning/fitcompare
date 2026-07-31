import FitParser from 'fit-file-parser'
import { stripFileExtension } from '../../lib/filename'
import { parseFitData } from './parseFitData'
import type { LoadedFile } from './fitTypes'

/**
 * Async plumbing for turning a `.fit` source into a `LoadedFile`.
 *
 * Deliberately React-free: it returns promises and throws on failure, leaving
 * loading/error *state* to `useFitFiles`. That split keeps the I/O testable
 * and keeps the hook down to state transitions.
 */

const PARSER_OPTIONS = {
  force: true,
  speedUnit: 'km/h',
  lengthUnit: 'km',
  temperatureUnit: 'celsius',
  pressureUnit: 'bar',
  elapsedRecordField: true,
  mode: 'cascade',
} as const

/** Parse a `.fit` buffer. Rejects if the file is unreadable or has no session. */
export function parseFitBuffer(buffer: ArrayBuffer, fileName: string): Promise<LoadedFile> {
  return new Promise((resolve, reject) => {
    new FitParser(PARSER_OPTIONS).parse(buffer, (error, rawData) => {
      if (error) {
        reject(new Error(`Could not read this FIT file: ${error.message}`))
        return
      }

      const { activities } = parseFitData(rawData)
      if (activities.length === 0) {
        reject(new Error('This FIT file has no activity sessions.'))
        return
      }

      // A file can hold several sessions (e.g. a multisport workout); this app
      // compares single activities, so only the first is used.
      resolve({ fileName: stripFileExtension(fileName), activity: activities[0] })
    })
  })
}

/** Read a user-selected file into memory. */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsArrayBuffer(file)
  })
}

/** Fetch one of the bundled sample activities. */
export async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not download the sample file (HTTP ${response.status}).`)
  }
  return response.arrayBuffer()
}
