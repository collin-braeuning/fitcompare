import { useMemo } from 'react'
import type { LoadedFile } from '../fit-file'
import { heartRateBySecond } from '../fit-file'
import { groupActivityFiles, type BatchGrouping } from './activitySessions'
import { buildBatchAgreement, type BatchAgreement, type BatchAgreementInput } from './batchAgreement'

/**
 * Derives grouping and agreement from the loaded batch files.
 *
 * Three memo layers so picking a different device pair doesn't redo the
 * expensive work: `grouping` depends only on which names are loaded,
 * `samplesByName` extracts each file's per-second heart rate once (not on
 * every pair change), and only `agreement` — the cheap part, a handful of
 * array passes over already-aligned seconds — redoes work when the pair
 * changes.
 */
export function useBatchAgreement(
  loadedByName: Record<string, LoadedFile>,
  primaryDeviceKey: string,
  secondaryDeviceKey: string,
): { grouping: BatchGrouping; agreement: BatchAgreement | null } {
  const namesKey = Object.keys(loadedByName).sort().join('|')

  const grouping = useMemo(
    () => groupActivityFiles(Object.keys(loadedByName)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [namesKey],
  )

  const samplesByName = useMemo(() => {
    const samples: Record<string, ReadonlyMap<number, number>> = {}
    for (const [name, file] of Object.entries(loadedByName)) {
      samples[name] = heartRateBySecond(file.activity.records)
    }
    return samples
  }, [loadedByName])

  const agreement = useMemo(() => {
    if (!primaryDeviceKey || !secondaryDeviceKey || primaryDeviceKey === secondaryDeviceKey) {
      return null
    }

    const deviceLabels = Object.fromEntries(grouping.devices.map((device) => [device.key, device.label]))

    const sessions: BatchAgreementInput['sessions'] = grouping.sessions.map((session) => {
      const samplesByDeviceKey: Record<string, ReadonlyMap<number, number>> = {}
      for (const [deviceKey, file] of Object.entries(session.filesByDeviceKey)) {
        const samples = samplesByName[file.fileName]
        if (samples) samplesByDeviceKey[deviceKey] = samples
      }
      return { session, samplesByDeviceKey }
    })

    return buildBatchAgreement({ sessions, primaryDeviceKey, secondaryDeviceKey, deviceLabels })
  }, [grouping, samplesByName, primaryDeviceKey, secondaryDeviceKey])

  return { grouping, agreement }
}
