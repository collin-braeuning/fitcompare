import { describe, it, expect } from 'vitest'
import { groupActivityFiles, completeSessions } from '../activitySessions'

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

describe('groupActivityFiles', () => {
  it('groups the 14 real filenames into 7 sessions across 2 devices with nothing unparsed', () => {
    const grouping = groupActivityFiles(REAL_FILE_NAMES)
    expect(grouping.sessions).toHaveLength(7)
    expect(grouping.devices).toHaveLength(2)
    expect(grouping.unparsed).toHaveLength(0)
  })

  it('orders sessions ascending by date', () => {
    const grouping = groupActivityFiles(REAL_FILE_NAMES)
    const dates = grouping.sessions.map((s) => s.date)
    expect(dates).toEqual([...dates].sort())
  })

  it('the 07-26 session holds both the hyphen and underscore files', () => {
    const grouping = groupActivityFiles(REAL_FILE_NAMES)
    const session = grouping.sessions.find((s) => s.date === '2026-07-26')
    expect(session).toBeDefined()
    expect(session!.filesByDeviceKey.pace4?.fileName).toBe('2026-07-26-pace4_run.fit')
    expect(session!.filesByDeviceKey.polarsense?.fileName).toBe('2026-07-26_polarSense_run.FIT')
  })

  it('orders devices by file count, most first', () => {
    const grouping = groupActivityFiles([
      ...REAL_FILE_NAMES,
      '2026-07-31_thirddevice_run.fit',
    ])
    expect(grouping.devices[0].fileCount).toBeGreaterThanOrEqual(grouping.devices[1].fileCount)
    expect(grouping.devices[grouping.devices.length - 1].key).toBe('thirddevice')
  })

  it('collapses polarsense and polarSense into one device, keeping the first-seen label', () => {
    const grouping = groupActivityFiles([
      '2026-07-01_polarSense_run.fit',
      '2026-07-02_polarsense_run.fit',
    ])
    expect(grouping.devices).toHaveLength(1)
    expect(grouping.devices[0].label).toBe('polarSense')
    expect(grouping.devices[0].fileCount).toBe(2)
  })

  it('reports a bad name as unparsed without reducing the session count', () => {
    const grouping = groupActivityFiles([...REAL_FILE_NAMES, 'not-a-valid-name.fit'])
    expect(grouping.sessions).toHaveLength(7)
    expect(grouping.unparsed).toEqual([{ fileName: 'not-a-valid-name.fit', reason: 'name-pattern' }])
  })

  it('reports a second file for the same (date, activity, device) as duplicate-device, first wins', () => {
    // Two genuinely distinct filenames (different extension case) that parse
    // to the identical (date, activity, device).
    const grouping = groupActivityFiles(['2026-07-23_pace4_run.fit', '2026-07-23_pace4_run.FIT'])
    expect(grouping.unparsed).toEqual([
      { fileName: '2026-07-23_pace4_run.FIT', reason: 'duplicate-device' },
    ])
    expect(grouping.sessions).toHaveLength(1)
    expect(grouping.sessions[0].filesByDeviceKey.pace4.fileName).toBe('2026-07-23_pace4_run.fit')
  })

  it('creates two sessions for two activities on the same date', () => {
    const grouping = groupActivityFiles([
      '2026-07-23_pace4_run.fit',
      '2026-07-23_pace4_bike.fit',
    ])
    expect(grouping.sessions).toHaveLength(2)
  })
})

describe('completeSessions', () => {
  it('drops a session missing one of the requested devices', () => {
    const grouping = groupActivityFiles([
      '2026-07-23_pace4_run.fit',
      '2026-07-23_polarSense_run.fit',
      '2026-07-24_pace4_run.fit',
    ])
    const complete = completeSessions(grouping, ['pace4', 'polarsense'])
    expect(complete).toHaveLength(1)
    expect(complete[0].date).toBe('2026-07-23')
  })
})
