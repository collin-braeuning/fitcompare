import { describe, it, expect } from 'vitest'
import { formatSessionDate, formatShortSessionDate } from './formatDate'

describe('formatSessionDate', () => {
  it('formats a calendar date, regardless of the machine timezone', () => {
    // This is the regression test for the "every date is one day early" bug:
    // parsing as UTC midnight then formatting without `timeZone: 'UTC'` lets
    // the local zone reinterpret the instant and roll the date back one day
    // west of UTC. Whatever `TZ` this test happens to run under, the output
    // must equal the input date.
    expect(formatSessionDate('2026-07-26', 'en-US')).toBe('Jul 26, 2026')
  })

  it('returns the raw input when unparseable', () => {
    expect(formatSessionDate('not-a-date', 'en-US')).toBe('not-a-date')
  })
})

describe('formatShortSessionDate', () => {
  it('formats without a year, for the nav title', () => {
    expect(formatShortSessionDate('2026-07-26', 'en-US')).toBe('Jul 26')
  })

  it('returns the raw input when unparseable', () => {
    expect(formatShortSessionDate('not-a-date', 'en-US')).toBe('not-a-date')
  })
})
