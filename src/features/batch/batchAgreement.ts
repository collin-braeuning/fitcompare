import type { ActivitySession } from './activitySessions'
import { intersectHeartRate, type DeviceCoverage } from './alignSamples'
import {
  calculateAbsoluteDifferenceStats,
  calculateBlandAltmanStats,
  calculateConcordanceStats,
  type AbsoluteDifferenceStats,
  type BlandAltmanStats,
  type ConcordanceStats,
} from '../comparison/comparisonStats'
import { cccLevel, type AgreementLevel } from '../comparison/agreementScale'

/**
 * Aggregates per-session and pooled agreement statistics across many
 * (date, activity) sessions for one chosen pair of devices.
 *
 * Reuses `calculateAbsoluteDifferenceStats`, `calculateBlandAltmanStats` and
 * `calculateConcordanceStats` unchanged — the maths for "do two paired series
 * agree" doesn't change just because there are now several series to run it
 * over.
 *
 * **Pooled Bland-Altman is fine to headline. Pooled CCC is not.** Measured on
 * this app's bundled `data/`:
 *
 * ```
 * naive pooled CCC (concat all sessions' pairs)   0.9533   ← range-inflated
 * mean of the per-session CCCs                    0.9320
 * Fisher/atanh-averaged CCC                       0.9714   ← worse, not better
 * ```
 *
 * CCC's denominator is `σx² + σy² + (μx − μy)²`. Concatenating sessions with
 * different heart-rate profiles (e.g. an easy run around 100–110 bpm and a
 * hard interval session around 160–170 bpm) grows that denominator faster
 * than the difference variance, so the pooled coefficient rises even though
 * no session actually agreed any better. Fisher/`atanh` averaging looks like
 * a fix but is worse: the transform diverges as ρc → 1, so it lets the single
 * best session dominate the average.
 *
 * So: `spread` is the primary artefact for a headline CCC number — report the
 * distribution (`median (min–max)`, McBride band counts, or `meanSessionCcc`
 * labelled "mean of N per-activity CCCs"), never `pooled.concordance.ccc`
 * labelled as if it were "CCC across activities". `pooled.concordance` exists
 * so the scatter has something to draw; it is deliberately excluded from
 * `AgreementSpread` and should never land in a `StatBadge`.
 */

/** Below this many matched seconds, a session's difference/CCC are noise, not signal. */
const MIN_MATCHED_SECONDS = 2

export interface SessionAgreement {
  sessionId: string
  date: string
  activity: string
  matchedSeconds: number
  coverage: DeviceCoverage[]
  /** CCC is only interpretable against the HR range it was measured over. */
  hrRange: { min: number; max: number }
  difference: AbsoluteDifferenceStats
  blandAltman: BlandAltmanStats | null
  concordance: ConcordanceStats | null
}

export interface AgreementSpread {
  /** k — number of sessions contributing to this spread. */
  sessions: number
  /** Σn_i — context only. */
  matchedSeconds: number
  meanSessionBias: number
  minSessionBias: number
  maxSessionBias: number
  meanSessionCcc: number
  medianSessionCcc: number
  minSessionCcc: number
  maxSessionCcc: number
  /** How many sessions per McBride band. */
  cccBands: Record<AgreementLevel, number>
}

export interface PooledAgreement {
  matchedSeconds: number
  blandAltman: BlandAltmanStats | null
  /** Range-inflated by construction — for the scatter, not for a headline. */
  concordance: ConcordanceStats | null
}

export interface BatchAgreementInput {
  sessions: ReadonlyArray<{
    session: ActivitySession
    samplesByDeviceKey: Record<string, ReadonlyMap<number, number>>
  }>
  primaryDeviceKey: string
  secondaryDeviceKey: string
  deviceLabels: Record<string, string>
}

export interface BatchAgreement {
  primaryName: string
  secondaryName: string
  sessions: SessionAgreement[]
  spread: AgreementSpread | null
  pooled: PooledAgreement | null
  skipped: Array<{ sessionId: string; date: string; reason: 'no-overlap' | 'too-few-points' }>
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(sortedValues: number[]): number {
  const mid = Math.floor(sortedValues.length / 2)
  return sortedValues.length % 2 === 0
    ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
    : sortedValues[mid]
}

/** Min/max over two arrays without spreading — pooled arrays run into the tens of thousands. */
function rangeOf(a: readonly number[], b: readonly number[]): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  for (const value of a) {
    if (value < min) min = value
    if (value > max) max = value
  }
  for (const value of b) {
    if (value < min) min = value
    if (value > max) max = value
  }
  return { min, max }
}

/** Plain min/mean/median/max over the per-session results — no ANOVA, no CIs. */
function computeSpread(sessions: readonly SessionAgreement[]): AgreementSpread | null {
  const withStats = sessions.filter(
    (s): s is SessionAgreement & { blandAltman: BlandAltmanStats; concordance: ConcordanceStats } =>
      s.blandAltman !== null && s.concordance !== null,
  )
  if (withStats.length === 0) return null

  const biases = withStats.map((s) => s.blandAltman.meanDiff)
  const cccs = withStats.map((s) => s.concordance.ccc)
  const sortedCccs = [...cccs].sort((a, b) => a - b)

  const cccBands: Record<AgreementLevel, number> = { good: 0, warn: 0, bad: 0 }
  for (const ccc of cccs) cccBands[cccLevel(ccc)]++

  return {
    sessions: withStats.length,
    matchedSeconds: sessions.reduce((sum, s) => sum + s.matchedSeconds, 0),
    meanSessionBias: mean(biases),
    minSessionBias: Math.min(...biases),
    maxSessionBias: Math.max(...biases),
    meanSessionCcc: mean(cccs),
    medianSessionCcc: median(sortedCccs),
    minSessionCcc: Math.min(...cccs),
    maxSessionCcc: Math.max(...cccs),
    cccBands,
  }
}

export function buildBatchAgreement(input: BatchAgreementInput): BatchAgreement {
  const { sessions, primaryDeviceKey, secondaryDeviceKey, deviceLabels } = input
  const primaryName = deviceLabels[primaryDeviceKey] ?? primaryDeviceKey
  const secondaryName = deviceLabels[secondaryDeviceKey] ?? secondaryDeviceKey

  const sessionAgreements: SessionAgreement[] = []
  const skipped: BatchAgreement['skipped'] = []
  const pooledX: number[] = []
  const pooledY: number[] = []

  for (const { session, samplesByDeviceKey } of sessions) {
    const primary = samplesByDeviceKey[primaryDeviceKey] ?? new Map<number, number>()
    const secondary = samplesByDeviceKey[secondaryDeviceKey] ?? new Map<number, number>()

    const aligned = intersectHeartRate([
      { deviceKey: primaryDeviceKey, bySecond: primary },
      { deviceKey: secondaryDeviceKey, bySecond: secondary },
    ])

    const matchedSeconds = aligned.seconds.length
    if (matchedSeconds === 0) {
      skipped.push({ sessionId: session.id, date: session.date, reason: 'no-overlap' })
      continue
    }
    if (matchedSeconds < MIN_MATCHED_SECONDS) {
      skipped.push({ sessionId: session.id, date: session.date, reason: 'too-few-points' })
      continue
    }

    const x = aligned.valuesByDeviceKey[primaryDeviceKey]
    const y = aligned.valuesByDeviceKey[secondaryDeviceKey]

    pooledX.push(...x)
    pooledY.push(...y)

    sessionAgreements.push({
      sessionId: session.id,
      date: session.date,
      activity: session.activity,
      matchedSeconds,
      coverage: aligned.coverage,
      hrRange: rangeOf(x, y),
      difference: calculateAbsoluteDifferenceStats(x, y),
      blandAltman: calculateBlandAltmanStats(x, y),
      concordance: calculateConcordanceStats(x, y),
    })
  }

  const spread = computeSpread(sessionAgreements)
  const pooled: PooledAgreement | null =
    pooledX.length > 0
      ? {
          matchedSeconds: pooledX.length,
          blandAltman: calculateBlandAltmanStats(pooledX, pooledY),
          concordance: calculateConcordanceStats(pooledX, pooledY),
        }
      : null

  return { primaryName, secondaryName, sessions: sessionAgreements, spread, pooled, skipped }
}
