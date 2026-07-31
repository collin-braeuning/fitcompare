import { useState } from 'react'
import type { LoadedFile, SampleFile } from '../fit-file'
import type { BatchAgreement } from './batchAgreement'
import type { BatchFileState, BatchProgress } from './batchStates'
import type { BatchGrouping } from './activitySessions'
import { groupActivityFiles } from './activitySessions'
import { resolveDevicePair } from './devicePair'
import { useBatchAgreement } from './useBatchAgreement'
import { useBatchFiles } from './useBatchFiles'

export interface BatchScreen {
  states: Record<string, BatchFileState>
  loadedByName: Record<string, LoadedFile>
  progress: BatchProgress
  isLoading: boolean
  grouping: BatchGrouping
  agreement: BatchAgreement | null
  primaryDeviceKey: string
  secondaryDeviceKey: string
  loadSamples: (samples: readonly SampleFile[]) => Promise<void>
  loadFiles: (files: readonly File[]) => Promise<void>
  clear: () => void
  selectPrimary: (deviceKey: string) => void
  selectSecondary: (deviceKey: string) => void
}

/**
 * Hoists the batch screen's state above `BatchView` so it survives a
 * drill-down into a session and back: `BatchView` unmounts while a `session`
 * route is showing, and `App` needs `grouping` plus the device pair to
 * resolve that route (`resolveSessionPair`). Kept as one feature-owned hook
 * rather than raw `useState` + `useBatchAgreement` calls in `App`, so the
 * shell doesn't grow batch-specific derivation — see `App`'s own doc
 * comment.
 *
 * The device-pair fallback (`resolveDevicePair`) is recomputed from
 * `primarySelection`/`secondarySelection` on every call, which is cheap: a
 * handful of device entries, not the batch itself.
 */
export function useBatchScreen(): BatchScreen {
  const batchFiles = useBatchFiles()

  const [primarySelection, setPrimarySelection] = useState('')
  const [secondarySelection, setSecondarySelection] = useState('')

  const deviceCandidates = groupActivityFiles(Object.keys(batchFiles.loadedByName)).devices
  const { primaryDeviceKey, secondaryDeviceKey } = resolveDevicePair(
    deviceCandidates,
    primarySelection,
    secondarySelection,
  )

  const { grouping, agreement } = useBatchAgreement(
    batchFiles.loadedByName,
    primaryDeviceKey,
    secondaryDeviceKey,
  )

  return {
    states: batchFiles.states,
    loadedByName: batchFiles.loadedByName,
    progress: batchFiles.progress,
    isLoading: batchFiles.isLoading,
    grouping,
    agreement,
    primaryDeviceKey,
    secondaryDeviceKey,
    loadSamples: batchFiles.loadSamples,
    loadFiles: batchFiles.loadFiles,
    clear: batchFiles.reset,
    selectPrimary: setPrimarySelection,
    selectSecondary: setSecondarySelection,
  }
}
