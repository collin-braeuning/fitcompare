import type { LoadedFile } from '../fit-file'
import type { BatchGrouping } from './activitySessions'

export interface SessionPair {
  sessionId: string
  date: string
  activity: string
  primary: LoadedFile
  secondary: LoadedFile
  /** Original-casing device names, for the nav title. */
  primaryLabel: string
  secondaryLabel: string
}

/**
 * Resolves a batch table row's session and device pair into the two loaded
 * files a drill-down comparison needs — a lookup, not a load, since every
 * batch file is already parsed and in memory.
 *
 * Takes primitives rather than the batch feature's own hook shape, so
 * `navigation` never needs to import `batch` to build a route's title.
 *
 * `null` covers every way a route can outlive the state it points at: the
 * session no longer exists in the grouping, one of the devices was never
 * part of it, one of its files has since been cleared from `loadedByName`,
 * or the two device keys collapsed to the same one. The caller (`App`) is
 * responsible for turning `null` into a visible "unavailable" panel rather
 * than a silent fallback — see `activitySessions.ts`'s "a broken join should
 * be visible" principle.
 */
export function resolveSessionPair(
  grouping: BatchGrouping,
  loadedByName: Readonly<Record<string, LoadedFile>>,
  sessionId: string,
  primaryDeviceKey: string,
  secondaryDeviceKey: string,
): SessionPair | null {
  if (primaryDeviceKey === secondaryDeviceKey) return null

  const session = grouping.sessions.find((candidate) => candidate.id === sessionId)
  if (!session) return null

  const primaryFile = session.filesByDeviceKey[primaryDeviceKey]
  const secondaryFile = session.filesByDeviceKey[secondaryDeviceKey]
  if (!primaryFile || !secondaryFile) return null

  const primary = loadedByName[primaryFile.fileName]
  const secondary = loadedByName[secondaryFile.fileName]
  if (!primary || !secondary) return null

  return {
    sessionId: session.id,
    date: session.date,
    activity: session.activity,
    primary,
    secondary,
    primaryLabel: primaryFile.device,
    secondaryLabel: secondaryFile.device,
  }
}
