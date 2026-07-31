/**
 * Turns raw agreement numbers into the good/warn/bad scale the UI colours by.
 *
 * Kept separate from `comparisonStats.ts` because these thresholds are a
 * product judgement, not maths — they're the part most likely to be tuned.
 */

/** Matches `StatLevel` in `components/StatBadge` — the badge colours these. */
export type AgreementLevel = 'good' | 'warn' | 'bad'

/**
 * Mean absolute heart-rate difference, in bpm. Optical and chest-strap sensors
 * routinely disagree by a beat or two, so ≤3 bpm reads as agreement and >7 bpm
 * as a meaningful mismatch.
 */
export function differenceLevel(avgAbsDiff: number): AgreementLevel {
  if (avgAbsDiff <= 3) return 'good'
  if (avgAbsDiff <= 7) return 'warn'
  return 'bad'
}

/** McBride's (2005) strength-of-agreement benchmarks for Lin's CCC. */
export function cccLevel(ccc: number): AgreementLevel {
  if (ccc >= 0.95) return 'good'
  if (ccc >= 0.9) return 'warn'
  return 'bad'
}

/** McBride's wording for the same benchmarks. */
export function cccLabel(ccc: number): string {
  if (ccc >= 0.99) return 'almost perfect'
  if (ccc >= 0.95) return 'substantial'
  if (ccc >= 0.9) return 'moderate'
  return 'poor'
}
