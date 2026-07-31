import { parseActivityFileName } from '../../lib/filename'

/**
 * Groups uploaded/loaded filenames into (date, activity) sessions.
 *
 * `lib/filename.ts` only extracts what a name says; deciding how those parsed
 * facts turn into sessions — one row per (date, activity), which device wins
 * a collision, what counts as "most common" — is a policy decision, so it
 * lives here rather than in the filename parser.
 */

export interface SessionFile {
  fileName: string
  device: string
  deviceKey: string
}

export interface ActivitySession {
  /** `${date}|${activityKey}` — React key and memo key. */
  id: string
  date: string
  activity: string
  filesByDeviceKey: Record<string, SessionFile>
  deviceKeys: string[]
}

export interface DeviceIdentity {
  key: string
  label: string
  fileCount: number
}

export interface UnparsedFile {
  fileName: string
  reason: 'name-pattern' | 'duplicate-device'
}

export interface BatchGrouping {
  /** Ascending by date, then activity. */
  sessions: ActivitySession[]
  /** Most files first — drives the default pair selection. */
  devices: DeviceIdentity[]
  unparsed: UnparsedFile[]
}

/**
 * Group a set of filenames into sessions.
 *
 * Unparsed names and same-session device collisions are reported in
 * `unparsed`, never silently dropped — a broken join should be visible, not
 * quietly hidden by falling back to fewer rows.
 */
export function groupActivityFiles(fileNames: readonly string[]): BatchGrouping {
  const sessionsById = new Map<string, ActivitySession>()
  // First-seen original casing per device, so "polarSense" displays correctly
  // while "polarsense"/"polarSense" still group together.
  const deviceLabels = new Map<string, string>()
  const deviceFileCounts = new Map<string, number>()
  const unparsed: UnparsedFile[] = []

  for (const fileName of fileNames) {
    const parsed = parseActivityFileName(fileName)
    if (!parsed) {
      unparsed.push({ fileName, reason: 'name-pattern' })
      continue
    }

    const { date, device, deviceKey, activity, activityKey } = parsed
    const sessionId = `${date}|${activityKey}`

    let session = sessionsById.get(sessionId)
    if (!session) {
      session = { id: sessionId, date, activity, filesByDeviceKey: {}, deviceKeys: [] }
      sessionsById.set(sessionId, session)
    }

    if (session.filesByDeviceKey[deviceKey]) {
      // Same (date, activity, device) seen again — first one wins the slot.
      unparsed.push({ fileName, reason: 'duplicate-device' })
      continue
    }

    session.filesByDeviceKey[deviceKey] = { fileName, device, deviceKey }
    session.deviceKeys.push(deviceKey)

    if (!deviceLabels.has(deviceKey)) deviceLabels.set(deviceKey, device)
    deviceFileCounts.set(deviceKey, (deviceFileCounts.get(deviceKey) ?? 0) + 1)
  }

  const sessions = [...sessionsById.values()].sort((a, b) =>
    a.date === b.date ? a.activity.localeCompare(b.activity) : a.date.localeCompare(b.date),
  )

  const devices: DeviceIdentity[] = [...deviceLabels.entries()]
    .map(([key, label]) => ({ key, label, fileCount: deviceFileCounts.get(key) ?? 0 }))
    .sort((a, b) => b.fileCount - a.fileCount)

  return { sessions, devices, unparsed }
}

/** Sessions that have a file for every one of the given devices. */
export function completeSessions(
  grouping: BatchGrouping,
  deviceKeys: readonly string[],
): ActivitySession[] {
  return grouping.sessions.filter((session) =>
    deviceKeys.every((key) => session.filesByDeviceKey[key] !== undefined),
  )
}
