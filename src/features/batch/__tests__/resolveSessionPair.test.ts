import { describe, it, expect } from 'vitest'
import { groupActivityFiles } from '../activitySessions'
import { resolveSessionPair } from '../resolveSessionPair'
import { stripFileExtension } from '../../../lib/filename'
import type { LoadedFile } from '../../fit-file'

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

function stubFile(fileName: string): LoadedFile {
  return { fileName, activity: {} as LoadedFile['activity'] }
}

/** `loadedByName` as `useBatchFiles` actually builds it: keyed by extension-stripped name. */
function loadedByNameFor(fileNames: readonly string[]): Record<string, LoadedFile> {
  const loaded: Record<string, LoadedFile> = {}
  for (const fileName of fileNames) {
    const stripped = stripFileExtension(fileName)
    loaded[stripped] = stubFile(stripped)
  }
  return loaded
}

const loadedByName = loadedByNameFor(REAL_FILE_NAMES)
// Mirrors `useBatchAgreement`'s real call site: grouping is built from
// `loadedByName`'s own (already extension-stripped) keys, never from the raw
// filenames — which is exactly why `SessionFile.fileName` agrees with
// `loadedByName`'s keys in production.
const grouping = groupActivityFiles(Object.keys(loadedByName))
const session0723 = grouping.sessions.find((s) => s.date === '2026-07-23')!

describe('resolveSessionPair', () => {
  it('resolves both files and their original-casing labels for the happy path', () => {
    const pair = resolveSessionPair(grouping, loadedByName, session0723.id, 'pace4', 'polarsense')
    expect(pair).not.toBeNull()
    expect(pair!.primary.fileName).toBe('2026-07-23_pace4_run')
    expect(pair!.secondary.fileName).toBe('2026-07-23_polarSense_run')
    expect(pair!.primaryLabel).toBe('pace4')
    expect(pair!.secondaryLabel).toBe('polarSense')
    expect(pair!.date).toBe('2026-07-23')
    expect(pair!.activity).toBe('run')
  })

  it('returns null for an unknown sessionId', () => {
    expect(resolveSessionPair(grouping, loadedByName, 'nope', 'pace4', 'polarsense')).toBeNull()
  })

  it('returns null when a device is absent from that session', () => {
    expect(resolveSessionPair(grouping, loadedByName, session0723.id, 'pace4', 'thirddevice')).toBeNull()
  })

  it('returns null when the file is in the grouping but missing from loadedByName', () => {
    // This is the case that drives `RouteUnavailable`: the session was parsed
    // from filenames, but the actual parsed file has since been cleared.
    const sparseLoaded = { ...loadedByName }
    delete sparseLoaded['2026-07-23_pace4_run']
    expect(resolveSessionPair(grouping, sparseLoaded, session0723.id, 'pace4', 'polarsense')).toBeNull()
  })

  it('returns null when the two device keys are equal', () => {
    expect(resolveSessionPair(grouping, loadedByName, session0723.id, 'pace4', 'pace4')).toBeNull()
  })

  it('resolves a hyphen-separated filename against its extension-stripped loadedByName key', () => {
    // Pins the invariant the whole drill-down rests on: `LoadedFile.fileName`
    // is always extension-stripped, and because the grouping is built from
    // `loadedByName`'s own keys (never the raw filenames), `SessionFile.fileName`
    // is already extension-stripped too — so this lookup is a plain equality,
    // not a re-stripping.
    const session0726 = grouping.sessions.find((s) => s.date === '2026-07-26')!
    expect(session0726.filesByDeviceKey.pace4.fileName).toBe('2026-07-26-pace4_run')

    const pair = resolveSessionPair(grouping, loadedByName, session0726.id, 'pace4', 'polarsense')
    expect(pair).not.toBeNull()
    expect(pair!.primary.fileName).toBe('2026-07-26-pace4_run')
  })
})
