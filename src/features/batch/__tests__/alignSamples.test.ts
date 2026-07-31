import { describe, it, expect } from 'vitest'
import { intersectHeartRate, type DeviceSamples } from '../alignSamples'

function samples(deviceKey: string, entries: Array<[number, number]>): DeviceSamples {
  return { deviceKey, bySecond: new Map(entries) }
}

describe('intersectHeartRate', () => {
  it('keeps only shared seconds, with values index-aligned across devices', () => {
    const a = samples('a', [
      [1, 100],
      [2, 101],
      [3, 102],
    ])
    const b = samples('b', [
      [2, 200],
      [3, 201],
      [4, 202],
    ])

    const aligned = intersectHeartRate([a, b])

    expect(aligned.seconds).toEqual([2, 3])
    expect(aligned.valuesByDeviceKey.a).toEqual([101, 102])
    expect(aligned.valuesByDeviceKey.b).toEqual([200, 201])
  })

  it('three devices intersect to strictly fewer seconds than any pair', () => {
    const a = samples('a', [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
    ])
    const b = samples('b', [
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
    ])
    const c = samples('c', [
      [3, 3],
      [4, 3],
      [6, 3],
    ])

    const pairAB = intersectHeartRate([a, b])
    const triple = intersectHeartRate([a, b, c])

    expect(triple.seconds).toEqual([3, 4])
    expect(triple.seconds.length).toBeLessThan(pairAB.seconds.length)
  })

  it('a pause gap in one device does not shift the other device values across the gap', () => {
    // Device "steady" has every second 1..6. Device "paused" is missing 3 and 4
    // (an auto-pause), so the intersection should be {1,2,5,6} — and each
    // device's own values must line up with those exact seconds, not slide
    // over to fill the gap.
    const steady = samples('steady', [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
      [5, 50],
      [6, 60],
    ])
    const paused = samples('paused', [
      [1, 11],
      [2, 21],
      [5, 51],
      [6, 61],
    ])

    const aligned = intersectHeartRate([steady, paused])

    expect(aligned.seconds).toEqual([1, 2, 5, 6])
    expect(aligned.valuesByDeviceKey.steady).toEqual([10, 20, 50, 60])
    expect(aligned.valuesByDeviceKey.paused).toEqual([11, 21, 51, 61])
  })

  it('a device with zero usable readings intersects to empty, without throwing', () => {
    const a = samples('a', [[1, 100]])
    const empty = samples('empty', [])
    expect(() => intersectHeartRate([a, empty])).not.toThrow()
    expect(intersectHeartRate([a, empty])).toEqual({
      seconds: [],
      valuesByDeviceKey: { a: [], empty: [] },
      coverage: [
        { deviceKey: 'a', ownSeconds: 1, spanSeconds: 1, coverage: 0 },
        { deviceKey: 'empty', ownSeconds: 0, spanSeconds: 0, coverage: 0 },
      ],
    })
  })

  it('returns empty for fewer than two devices', () => {
    expect(intersectHeartRate([])).toEqual({ seconds: [], valuesByDeviceKey: {}, coverage: [] })
    expect(intersectHeartRate([samples('a', [[1, 1]])])).toEqual({
      seconds: [],
      valuesByDeviceKey: {},
      coverage: [],
    })
  })

  it('reports coverage as matched/own and spanSeconds greater than ownSeconds when paused', () => {
    const steady = samples('steady', [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
    ])
    // Auto-paused: owns seconds 1,2,4 (missing 3), so spanSeconds (4) > ownSeconds (3).
    const paused = samples('paused', [
      [1, 11],
      [2, 21],
      [4, 41],
    ])

    const aligned = intersectHeartRate([steady, paused])
    const pausedCoverage = aligned.coverage.find((c) => c.deviceKey === 'paused')!
    const steadyCoverage = aligned.coverage.find((c) => c.deviceKey === 'steady')!

    expect(pausedCoverage.ownSeconds).toBe(3)
    expect(pausedCoverage.spanSeconds).toBe(4)
    expect(pausedCoverage.spanSeconds).toBeGreaterThan(pausedCoverage.ownSeconds)
    expect(pausedCoverage.coverage).toBeCloseTo(3 / 3, 10)
    expect(steadyCoverage.coverage).toBeCloseTo(3 / 4, 10)
  })
})
