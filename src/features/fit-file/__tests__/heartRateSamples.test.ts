import { describe, it, expect } from 'vitest'
import { toSecondBucket, usableHeartRate, heartRateBySecond } from '../heartRateSamples'
import type { FitRecord } from '../fitTypes'

function record(timestamp: string, heartRate: number | null): FitRecord {
  return {
    timestamp,
    heartRate,
    speed: null,
    cadence: null,
    altitude: null,
    power: null,
    distance: null,
    positionLat: null,
    positionLong: null,
  }
}

describe('toSecondBucket', () => {
  it('rounds sub-second timestamps down into their second', () => {
    expect(toSecondBucket('2026-01-01T00:00:00.499Z')).toBe(toSecondBucket('2026-01-01T00:00:00.000Z'))
  })

  it('rounds .500Z up into the next second', () => {
    const base = toSecondBucket('2026-01-01T00:00:00.000Z')!
    expect(toSecondBucket('2026-01-01T00:00:00.500Z')).toBe(base + 1)
  })

  it('returns null for unparseable timestamps', () => {
    expect(toSecondBucket('')).toBeNull()
    expect(toSecondBucket('nope')).toBeNull()
  })
})

describe('usableHeartRate', () => {
  it('treats 0 as a dropout', () => {
    expect(usableHeartRate({ heartRate: 0 })).toBeNull()
  })

  it('treats negative values as a dropout', () => {
    expect(usableHeartRate({ heartRate: -5 })).toBeNull()
  })

  it('treats null as a dropout', () => {
    expect(usableHeartRate({ heartRate: null })).toBeNull()
  })

  it('passes through a genuinely low but truthy reading', () => {
    // Guards a truthiness regression: `record.heartRate &&` alone would treat
    // 1 correctly, but a careless rewrite as `!record.heartRate` would not.
    expect(usableHeartRate({ heartRate: 1 })).toBe(1)
  })
})

describe('heartRateBySecond', () => {
  it('omits dropouts entirely', () => {
    const bySecond = heartRateBySecond([record('2026-01-01T00:00:00Z', 0)])
    expect(bySecond.size).toBe(0)
  })

  it('does not let a dropout erase a good reading at the same second', () => {
    // Both records land on the same second bucket; the dropout comes second.
    const bySecond = heartRateBySecond([
      record('2026-01-01T00:00:00.000Z', 120),
      record('2026-01-01T00:00:00.200Z', 0),
    ])
    expect(bySecond.get(toSecondBucket('2026-01-01T00:00:00.000Z')!)).toBe(120)
  })

  it('lets the last usable reading win on a duplicated second', () => {
    const bySecond = heartRateBySecond([
      record('2026-01-01T00:00:00.000Z', 120),
      record('2026-01-01T00:00:00.200Z', 125),
    ])
    expect(bySecond.get(toSecondBucket('2026-01-01T00:00:00.000Z')!)).toBe(125)
  })
})
