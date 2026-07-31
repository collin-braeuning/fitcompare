import { describe, it, expect } from 'vitest'
import { averagePace, formatPace, NO_PACE, speedToPace } from './pace'

describe('speedToPace', () => {
  it('converts km/h to minutes per mile', () => {
    // 16.09344 km/h is exactly 10 mph, i.e. a 6:00 mile.
    expect(speedToPace(16.09344)).toBeCloseTo(6, 10)
  })

  it('has no pace when stopped or missing', () => {
    expect(speedToPace(0)).toBeNull()
    expect(speedToPace(null)).toBeNull()
    expect(speedToPace(undefined)).toBeNull()
  })
})

describe('formatPace', () => {
  it('formats decimal minutes as m:ss', () => {
    expect(formatPace(7.5)).toBe('7:30')
    expect(formatPace(8)).toBe('8:00')
    expect(formatPace(10.0833)).toBe('10:05')
  })

  it('rolls seconds over instead of printing :60', () => {
    expect(formatPace(7.999)).toBe('8:00')
  })
})

describe('averagePace', () => {
  it('averages speed rather than pace', () => {
    // Equal time at 10 mph (6:00/mi) and 5 mph (12:00/mi) is 15 miles in two
    // hours — a true average of 8:00/mi. Averaging the paces would say 9:00.
    const records = [{ speed: 16.09344 }, { speed: 8.04672 }]
    expect(averagePace(records)).toBe('8:00')
  })

  it('ignores stopped samples', () => {
    const records = [{ speed: 16.09344 }, { speed: 0 }, { speed: null }]
    expect(averagePace(records)).toBe('6:00')
  })

  it('reports no pace when nothing was moving', () => {
    expect(averagePace([{ speed: 0 }, { speed: null }])).toBe(NO_PACE)
  })
})
