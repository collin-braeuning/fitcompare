/**
 * Pace conversion and formatting.
 *
 * FIT files are parsed with `speedUnit: 'km/h'`, but runners read pace in
 * minutes per mile. Every pace number in the app flows through this module so
 * the conversion factor and the `m:ss` format live in exactly one place.
 */

const KM_PER_MILE = 1.609344

/** Shown wherever a pace can't be computed (no moving samples). */
export const NO_PACE = '—'

/**
 * Convert a speed in km/h to a pace in decimal minutes per mile.
 * Returns null when stopped — pace is undefined at zero speed.
 */
export function speedToPace(speedKmh: number | null | undefined): number | null {
  if (!speedKmh || speedKmh <= 0) return null
  return (60 / speedKmh) * KM_PER_MILE
}

/** Format decimal minutes as `m:ss` — e.g. 7.5 → "7:30". */
export function formatPace(paceMinutes: number): string {
  const minutes = Math.floor(paceMinutes)
  const seconds = Math.round((paceMinutes - minutes) * 60)
  // Rounding 59.7s up must roll into the next minute rather than print "7:60".
  if (seconds === 60) return `${minutes + 1}:00`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Average pace across a run's samples, formatted as `m:ss`.
 *
 * Averages *speed* and then converts, rather than averaging the per-sample
 * paces. Samples are evenly spaced in time, so mean speed equals
 * distance/time — the true average pace. Averaging paces instead would
 * over-weight slow samples (a 20 min/mi walk break would drag the number far
 * more than the few seconds it actually lasted).
 */
export function averagePace(records: ReadonlyArray<{ speed: number | null }>): string {
  let totalSpeed = 0
  let movingSamples = 0

  for (const record of records) {
    if (record.speed && record.speed > 0) {
      totalSpeed += record.speed
      movingSamples++
    }
  }

  if (movingSamples === 0) return NO_PACE

  const pace = speedToPace(totalSpeed / movingSamples)
  return pace === null ? NO_PACE : formatPace(pace)
}
