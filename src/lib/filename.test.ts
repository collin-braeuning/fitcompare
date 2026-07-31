import { describe, it, expect } from 'vitest'
import { parseActivityFileName, stripFileExtension } from './filename'

const REAL_FILE_NAMES = [
  '2026-07-23_pace4_run.fit',
  '2026-07-23_polarSense_run.FIT',
  '2026-07-24_pace4_run.fit',
  '2026-07-24_polarSense_run.FIT',
  '2026-07-25_pace4_run.fit',
  '2026-07-25_polarSense_run.FIT',
  '2026-07-26_polarSense_run.FIT',
  '2026-07-26-pace4_run.fit',
  '2026-07-27_pace4_run.fit',
  '2026-07-27_polarSense_run.FIT',
  '2026-07-28_pace4_run.fit',
  '2026-07-28_polarSense_run.FIT',
  '2026-07-30_pace4_run.fit',
  '2026-07-30_polarSense_run.FIT',
]

describe('parseActivityFileName', () => {
  it('parses all 14 real data filenames', () => {
    for (const fileName of REAL_FILE_NAMES) {
      const parsed = parseActivityFileName(fileName)
      expect(parsed, fileName).not.toBeNull()
      expect(parsed!.date, fileName).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(parsed!.activity, fileName).toBe('run')
    }
  })

  it('parses a standard underscore-separated name', () => {
    expect(parseActivityFileName('2026-07-23_pace4_run.fit')).toEqual({
      date: '2026-07-23',
      device: 'pace4',
      deviceKey: 'pace4',
      activity: 'run',
      activityKey: 'run',
    })
  })

  it('regression: 2026-07-26-pace4_run.fit uses a hyphen before the device', () => {
    expect(parseActivityFileName('2026-07-26-pace4_run.fit')).toEqual({
      date: '2026-07-26',
      device: 'pace4',
      deviceKey: 'pace4',
      activity: 'run',
      activityKey: 'run',
    })
  })

  it('handles an uppercase .FIT extension', () => {
    const parsed = parseActivityFileName('2026-07-23_polarSense_run.FIT')
    expect(parsed?.device).toBe('polarSense')
    expect(parsed?.deviceKey).toBe('polarsense')
  })

  it('handles already-extension-stripped input', () => {
    expect(parseActivityFileName('2026-07-23_pace4_run')).toEqual({
      date: '2026-07-23',
      device: 'pace4',
      deviceKey: 'pace4',
      activity: 'run',
      activityKey: 'run',
    })
  })

  it('keeps a multi-word activity intact', () => {
    const parsed = parseActivityFileName('2026-07-23_pace4_long_run.fit')
    expect(parsed?.activity).toBe('long_run')
    expect(parsed?.activityKey).toBe('long_run')
  })

  it('defaults the activity when none is given', () => {
    expect(parseActivityFileName('2026-07-30_pace4.fit')).toEqual({
      date: '2026-07-30',
      device: 'pace4',
      deviceKey: 'pace4',
      activity: 'activity',
      activityKey: 'activity',
    })
  })

  it('preserves device casing in `device` but lowercases `deviceKey`', () => {
    const parsed = parseActivityFileName('2026-07-23_polarSense_run.fit')
    expect(parsed?.device).toBe('polarSense')
    expect(parsed?.deviceKey).toBe('polarsense')
  })

  it('rejects an invalid calendar date', () => {
    expect(parseActivityFileName('2026-13-40_pace4_run.fit')).toBeNull()
  })

  it('rejects a name that does not start with a date', () => {
    expect(parseActivityFileName('run_pace4_2026-07-30.fit')).toBeNull()
  })

  it('rejects a name with no date at all', () => {
    expect(parseActivityFileName('pace4_run.fit')).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(parseActivityFileName('')).toBeNull()
  })

  it('documents the device-ambiguity: the first underscore-delimited token wins', () => {
    // "my_device_run" has no way to know "my_device" was meant to be one
    // token — the parser resolves it as device "my", activity "device_run".
    const parsed = parseActivityFileName('2026-07-26_my_device_run.fit')
    expect(parsed?.device).toBe('my')
    expect(parsed?.activity).toBe('device_run')
  })
})

describe('stripFileExtension', () => {
  it('strips a trailing extension', () => {
    expect(stripFileExtension('2026-07-30_pace4_run.fit')).toBe('2026-07-30_pace4_run')
  })
})
