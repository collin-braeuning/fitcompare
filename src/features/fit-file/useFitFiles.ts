import { useCallback, useMemo, useRef, useState } from 'react'
import type { LoadedFile } from './fitTypes'
import type { SampleFile } from './sampleFiles'
import { fetchArrayBuffer, parseFitBuffer, readFileAsArrayBuffer } from './loadFitFile'

/**
 * What one upload slot is currently showing. Modelling this as a discriminated
 * union instead of loose `file`/`error`/`isLoading` fields makes impossible
 * combinations (loaded *and* errored) unrepresentable, and lets the card render
 * with an exhaustive switch.
 */
export type SlotState =
  | { status: 'empty' }
  | { status: 'loading'; fileName: string }
  | { status: 'loaded'; file: LoadedFile }
  | { status: 'error'; fileName: string; message: string }

const EMPTY: SlotState = { status: 'empty' }

/**
 * Owns the set of loaded FIT files, keyed by upload-slot id.
 *
 * Keying by id rather than holding `file1`/`file2` state means adding a third
 * upload slot is a one-line change in `fileSlots.ts` — the hook, the loading
 * flow and the error handling all scale automatically.
 */
export function useFitFiles() {
  const [slots, setSlots] = useState<Record<string, SlotState>>({})

  // Every load gets a monotonic token, and only the newest token per slot is
  // allowed to write its result. Without this, picking file B while file A is
  // still parsing (or hitting "Upload Different Files" mid-parse) would let the
  // stale result land last and overwrite the current one.
  const nextToken = useRef(0)
  const activeToken = useRef<Record<string, number>>({})

  const runLoad = useCallback(
    async (slotId: string, fileName: string, read: () => Promise<ArrayBuffer>) => {
      const token = ++nextToken.current
      activeToken.current[slotId] = token
      setSlots((prev) => ({ ...prev, [slotId]: { status: 'loading', fileName } }))

      const isStale = () => activeToken.current[slotId] !== token

      try {
        const file = await parseFitBuffer(await read(), fileName)
        if (isStale()) return
        setSlots((prev) => ({ ...prev, [slotId]: { status: 'loaded', file } }))
      } catch (error) {
        if (isStale()) return
        const message = error instanceof Error ? error.message : 'Unknown error.'
        setSlots((prev) => ({ ...prev, [slotId]: { status: 'error', fileName, message } }))
      }
    },
    [],
  )

  const loadFile = useCallback(
    (slotId: string, file: File) => runLoad(slotId, file.name, () => readFileAsArrayBuffer(file)),
    [runLoad],
  )

  const loadSample = useCallback(
    (slotId: string, sample: SampleFile) =>
      runLoad(slotId, sample.name, () => fetchArrayBuffer(sample.url)),
    [runLoad],
  )

  const reset = useCallback((slotId: string) => {
    delete activeToken.current[slotId]
    setSlots((prev) => ({ ...prev, [slotId]: EMPTY }))
  }, [])

  const resetAll = useCallback(() => {
    activeToken.current = {}
    setSlots({})
  }, [])

  /** Slot state for any id, including ones never touched. */
  const slotState = useCallback((slotId: string): SlotState => slots[slotId] ?? EMPTY, [slots])

  /** Loaded files only, keyed by slot id — what the comparison views consume. */
  const loadedBySlot = useMemo(() => {
    const loaded: Record<string, LoadedFile> = {}
    for (const [slotId, state] of Object.entries(slots)) {
      if (state.status === 'loaded') loaded[slotId] = state.file
    }
    return loaded
  }, [slots])

  return { slotState, loadedBySlot, loadFile, loadSample, reset, resetAll }
}
