/**
 * A batch/session date (`"2026-07-26"`) names a calendar day parsed from a
 * filename, not an instant in time. Formatting it without `timeZone: 'UTC'`
 * lets `toLocaleDateString` reinterpret the UTC-midnight `Date` in the
 * machine's local zone, which renders the day *before* west of UTC (e.g.
 * `2026-07-26` → "Jul 25, 2026" at `TZ=America/New_York`). Pinning the
 * timezone keeps the displayed date equal to the input regardless of where
 * the browser happens to be.
 */

function parseIsoDate(isoDate: string): Date | null {
  const parsed = new Date(`${isoDate}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** "2026-07-26" → "Jul 26, 2026". Returns the raw input when unparseable. */
export function formatSessionDate(isoDate: string, locale?: string | string[]): string {
  const parsed = parseIsoDate(isoDate)
  if (!parsed) return isoDate
  return parsed.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** "2026-07-26" → "Jul 26", for the nav title. Returns the raw input when unparseable. */
export function formatShortSessionDate(isoDate: string, locale?: string | string[]): string {
  const parsed = parseIsoDate(isoDate)
  if (!parsed) return isoDate
  return parsed.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
