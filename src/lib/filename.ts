/** Strip a trailing file extension: "2026-07-30_pace4_run.fit" → "2026-07-30_pace4_run". */
export function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '')
}

/**
 * What a sample filename tells us about its recording, straight from the
 * name — no session grouping or policy decisions here (that's
 * `features/batch/activitySessions.ts`).
 */
export interface ActivityFileName {
  /** "2026-07-30", exactly as written. */
  date: string
  /** "polarSense" — original casing, for display. */
  device: string
  /** Lower-cased, grouping only. */
  deviceKey: string
  /** May contain underscores ("long_run"). */
  activity: string
  activityKey: string
}

// `[-_ ]` handles "2026-07-26-pace4_run.fit", where the device is separated
// from the date by a hyphen instead of the usual underscore. `[^_]+` stops the
// device at the first `_` (tolerating hyphens inside a device name), and the
// trailing `(?:_(.+))?` is optional and greedy so a multi-word activity like
// "long_run" survives intact and a missing activity still parses.
//
// Documented ambiguity: the device is always the first `_`-delimited token,
// so "2026-07-26_my_device_run" yields device "my" — unresolvable from the
// name alone, which is why the UI renders the parse result rather than hiding
// it.
const FILENAME_PATTERN = /^(\d{4}-\d{2}-\d{2})[-_ ]([^_]+)(?:_(.+))?$/

/** True when `y-m-d` is a real calendar date, catching things like 2026-13-40. */
function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

/** Parse a sample filename into its date, device and activity, or null if it doesn't match. */
export function parseActivityFileName(fileName: string): ActivityFileName | null {
  const match = FILENAME_PATTERN.exec(stripFileExtension(fileName).trim())
  if (!match) return null

  const [, date, device, activity = 'activity'] = match
  const [year, month, day] = date.split('-').map(Number)
  if (!isValidDate(year, month, day)) return null

  return {
    date,
    device,
    deviceKey: device.toLowerCase(),
    activity,
    activityKey: activity.toLowerCase(),
  }
}
