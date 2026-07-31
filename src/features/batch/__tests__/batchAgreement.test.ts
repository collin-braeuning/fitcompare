import { describe, it, expect } from 'vitest'
import { buildBatchAgreement, type BatchAgreementInput } from '../batchAgreement'
import type { ActivitySession } from '../activitySessions'
import { cccLevel } from '../../comparison/agreementScale'

const PRIMARY = 'p'
const SECONDARY = 's'
const DEVICE_LABELS = { [PRIMARY]: 'Primary', [SECONDARY]: 'Secondary' }

function session(id: string, date: string): ActivitySession {
  return { id, date, activity: 'run', filesByDeviceKey: {}, deviceKeys: [PRIMARY, SECONDARY] }
}

function mapFrom(values: number[]): Map<number, number> {
  return new Map(values.map((v, i) => [i + 1, v]))
}

function entry(id: string, date: string, x: number[], y: number[]) {
  return {
    session: session(id, date),
    samplesByDeviceKey: { [PRIMARY]: mapFrom(x), [SECONDARY]: mapFrom(y) },
  }
}

function input(sessions: BatchAgreementInput['sessions']): BatchAgreementInput {
  return { sessions, primaryDeviceKey: PRIMARY, secondaryDeviceKey: SECONDARY, deviceLabels: DEVICE_LABELS }
}

describe('buildBatchAgreement', () => {
  it('matches hand-computed bias, SD and CCC for a tiny session', () => {
    // Constant -1 offset: bias -1, sdDiff 0. CCC by hand (see doc comment
    // derivation): varX = varY = 1, cov = 1, denom = 1+1+1 = 3 -> ccc = 2/3.
    const result = buildBatchAgreement(input([entry('s1', '2026-01-01', [100, 102], [101, 103])]))

    expect(result.sessions).toHaveLength(1)
    const [s1] = result.sessions
    expect(s1.matchedSeconds).toBe(2)
    expect(s1.blandAltman!.meanDiff).toBeCloseTo(-1, 10)
    expect(s1.blandAltman!.sdDiff).toBeCloseTo(0, 10)
    expect(s1.concordance!.ccc).toBeCloseTo(2 / 3, 10)
  })

  it('computes spread min/mean/median/max correctly across three sessions', () => {
    // Three sessions, each two points, constant per-session offset:
    //   s1: bias -1, ccc 2/3
    //   s2: bias -5, ccc 2/27
    //   s3: bias  0, ccc 1 (identical arrays)
    const result = buildBatchAgreement(
      input([
        entry('s1', '2026-01-01', [100, 102], [101, 103]),
        entry('s2', '2026-01-02', [100, 102], [105, 107]),
        entry('s3', '2026-01-03', [100, 102], [100, 102]),
      ]),
    )

    expect(result.sessions).toHaveLength(3)
    const spread = result.spread!
    expect(spread.sessions).toBe(3)
    expect(spread.matchedSeconds).toBe(6)

    expect(spread.minSessionBias).toBeCloseTo(-5, 10)
    expect(spread.maxSessionBias).toBeCloseTo(0, 10)
    expect(spread.meanSessionBias).toBeCloseTo((-1 + -5 + 0) / 3, 10)

    const cccs = [2 / 3, 2 / 27, 1]
    const sorted = [...cccs].sort((a, b) => a - b)
    expect(spread.minSessionCcc).toBeCloseTo(Math.min(...cccs), 10)
    expect(spread.maxSessionCcc).toBeCloseTo(Math.max(...cccs), 10)
    expect(spread.meanSessionCcc).toBeCloseTo(cccs.reduce((a, b) => a + b, 0) / 3, 10)
    expect(spread.medianSessionCcc).toBeCloseTo(sorted[1], 10)

    // cccBands must agree with running cccLevel over each session's own ccc.
    const expectedBands = { good: 0, warn: 0, bad: 0 }
    for (const c of cccs) expectedBands[cccLevel(c)]++
    expect(spread.cccBands).toEqual(expectedBands)
  })

  it('skips a session with only one matched second as too-few-points, without affecting others', () => {
    const result = buildBatchAgreement(
      input([
        entry('good', '2026-01-01', [100, 102], [101, 103]),
        entry('lonely', '2026-01-02', [100], [105]),
      ]),
    )

    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].sessionId).toBe('good')
    expect(result.skipped).toEqual([{ sessionId: 'lonely', date: '2026-01-02', reason: 'too-few-points' }])
  })

  it('skips a session with zero overlap as no-overlap', () => {
    const result = buildBatchAgreement(
      input([
        {
          session: session('disjoint', '2026-01-01'),
          samplesByDeviceKey: {
            [PRIMARY]: new Map([[1, 100]]),
            [SECONDARY]: new Map([[99, 105]]),
          },
        },
      ]),
    )

    expect(result.sessions).toHaveLength(0)
    expect(result.skipped).toEqual([{ sessionId: 'disjoint', date: '2026-01-01', reason: 'no-overlap' }])
  })

  it('pools exactly the sum of the per-session matched seconds', () => {
    const result = buildBatchAgreement(
      input([
        entry('s1', '2026-01-01', [100, 102, 104], [101, 103, 105]),
        entry('s2', '2026-01-02', [100, 102], [100, 102]),
      ]),
    )

    const total = result.sessions.reduce((sum, s) => sum + s.matchedSeconds, 0)
    expect(result.pooled!.matchedSeconds).toBe(total)
    expect(result.pooled!.matchedSeconds).toBe(5)
  })

  it('range-inflation: pooling sessions with disjoint HR bands raises CCC above every session\'s own CCC', () => {
    // Two sessions with identical within-session disagreement (y = x - 2,
    // same spread) but disjoint HR bands: 100-110 and 160-170. Pooling widens
    // the HR range without changing the actual per-second disagreement, so
    // the pooled CCC must come out higher than either session's own CCC —
    // encoding the range-inflation finding as an executable fact so the
    // pooled number can never be quietly promoted to a headline.
    const low = [100, 102, 104, 106, 108, 110]
    const high = [160, 162, 164, 166, 168, 170]
    const offset = (arr: number[]) => arr.map((v) => v - 2)

    const result = buildBatchAgreement(
      input([entry('low', '2026-01-01', low, offset(low)), entry('high', '2026-01-02', high, offset(high))]),
    )

    expect(result.sessions).toHaveLength(2)
    expect(result.pooled!.concordance!.ccc).toBeGreaterThan(result.spread!.maxSessionCcc)
  })
})
