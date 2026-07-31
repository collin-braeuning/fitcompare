import { useCallback, useMemo, useRef, useState } from 'react'
import type { LoadedFile, SampleFile } from '../fit-file'
import { fetchArrayBuffer, readFileAsArrayBuffer } from '../fit-file/loadFitFile'
import { stripFileExtension } from '../../lib/filename'
import { loadBatch, type BatchSource } from './loadBatch'

/**
 * Loading state for one file in the batch, keyed by its extension-stripped
 * name so it lines up with `SAMPLE_FILES.name` and `parseActivityFileName`.
 */
export type BatchFileState =
  | { status: 'pending' }
  | { status: 'loading' }
  | { status: 'loaded'; file: LoadedFile }
  | { status: 'error'; message: string }

export interface BatchProgress {
  total: number
  done: number
  errored: number
}

const EMPTY_PROGRESS: BatchProgress = { total: 0, done: 0, errored: 0 }

/** How many files `loadBatch` reads/parses at once. */
const CONCURRENCY = 3

/**
 * Owns the set of files loaded for the batch screen.
 *
 * Mirrors the stale-write guard in `fit-file/useFitFiles.ts`, but with a
 * single run token rather than a per-slot map: a batch load is one atomic
 * operation (load all of `data/`, or a chosen file set), so cancelling it —
 * by starting a new run or calling `reset` — must invalidate every in-flight
 * file at once. A per-file token map would let a half-cancelled run leave
 * orphaned entries behind.
 */
export function useBatchFiles() {
  const [states, setStates] = useState<Record<string, BatchFileState>>({})
  const [progress, setProgress] = useState<BatchProgress>(EMPTY_PROGRESS)
  const [isLoading, setIsLoading] = useState(false)

  const runToken = useRef(0)

  const run = useCallback(async (sources: BatchSource[]) => {
    const token = ++runToken.current
    const isStale = () => runToken.current !== token

    setIsLoading(true)
    setProgress({ total: sources.length, done: 0, errored: 0 })
    setStates((prev) => {
      const next = { ...prev }
      for (const source of sources) next[source.name] = { status: 'pending' }
      return next
    })

    await loadBatch(
      sources,
      {
        onStart: (name) => {
          if (isStale()) return
          setStates((prev) => ({ ...prev, [name]: { status: 'loading' } }))
        },
        onLoaded: (name, file) => {
          if (isStale()) return
          setStates((prev) => ({ ...prev, [name]: { status: 'loaded', file } }))
          setProgress((prev) => ({ ...prev, done: prev.done + 1 }))
        },
        onError: (name, message) => {
          if (isStale()) return
          setStates((prev) => ({ ...prev, [name]: { status: 'error', message } }))
          setProgress((prev) => ({ ...prev, done: prev.done + 1, errored: prev.errored + 1 }))
        },
        isStale,
      },
      CONCURRENCY,
    )

    if (!isStale()) setIsLoading(false)
  }, [])

  const loadSamples = useCallback(
    (samples: readonly SampleFile[]) =>
      run(samples.map((sample) => ({ name: sample.name, read: () => fetchArrayBuffer(sample.url) }))),
    [run],
  )

  const loadFiles = useCallback(
    (files: readonly File[]) => {
      // Extension-stripped names are the batch's identity, so `x.fit` and
      // `x.FIT` collide. The first wins the slot; the second is reported as
      // its own error (keyed by its full original name, which still differs)
      // rather than silently overwriting the first file's result.
      const seen = new Set<string>()
      const sources: BatchSource[] = []
      const duplicates: Array<{ originalName: string; strippedName: string }> = []

      for (const file of files) {
        const strippedName = stripFileExtension(file.name)
        if (seen.has(strippedName)) {
          duplicates.push({ originalName: file.name, strippedName })
          continue
        }
        seen.add(strippedName)
        sources.push({ name: strippedName, read: () => readFileAsArrayBuffer(file) })
      }

      if (duplicates.length > 0) {
        setStates((prev) => {
          const next = { ...prev }
          for (const { originalName, strippedName } of duplicates) {
            next[originalName] = {
              status: 'error',
              message: `"${originalName}" duplicates "${strippedName}" and was skipped.`,
            }
          }
          return next
        })
      }

      return run(sources)
    },
    [run],
  )

  const reset = useCallback(() => {
    runToken.current++
    setStates({})
    setProgress(EMPTY_PROGRESS)
    setIsLoading(false)
  }, [])

  /** Loaded files only, keyed by extension-stripped name. */
  const loadedByName = useMemo(() => {
    const loaded: Record<string, LoadedFile> = {}
    for (const [name, state] of Object.entries(states)) {
      if (state.status === 'loaded') loaded[name] = state.file
    }
    return loaded
  }, [states])

  return { states, loadedByName, progress, isLoading, loadSamples, loadFiles, reset }
}
