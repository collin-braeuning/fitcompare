import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import FitParser from 'fit-file-parser'
import { parseFitData } from '../../fit-file/parseFitData'
import { heartRateBySecond } from '../../fit-file/heartRateSamples'
import { stripFileExtension } from '../../../lib/filename'
import { groupActivityFiles } from '../activitySessions'
import { buildBatchAgreement, type BatchAgreementInput } from '../batchAgreement'

// End-to-end characterisation test in the style of
// `fit-file/__tests__/parseFitData.test.ts`: six real files (07-23, 07-25,
// and the hyphenated 07-26 pair) go through the real parser, then through
// filename grouping -> per-second samples -> N-device intersection ->
// per-session and pooled agreement, exactly as the batch feature will run
// them. Pins whatever this implementation actually computes — the numbers in
// the design doc are from an independent exploration script and only
// establish the right ballpark.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../../../../data')

const FILE_NAMES = [
  '2026-07-23_pace4_run.fit',
  '2026-07-23_polarSense_run.FIT',
  '2026-07-25_pace4_run.fit',
  '2026-07-25_polarSense_run.FIT',
  '2026-07-26_polarSense_run.FIT',
  '2026-07-26-pace4_run.fit',
]

const PARSER_OPTIONS = {
  force: true,
  speedUnit: 'km/h',
  lengthUnit: 'km',
  temperatureUnit: 'celsius',
  pressureUnit: 'bar',
  elapsedRecordField: true,
  mode: 'cascade',
} as const

function parseRealFile(fileName: string): Promise<unknown> {
  const buffer = fs.readFileSync(path.join(DATA_DIR, fileName))
  return new Promise((resolve, reject) => {
    new FitParser(PARSER_OPTIONS).parse(buffer, (error, data) => {
      if (error) reject(error)
      else resolve(data)
    })
  })
}

describe('buildBatchAgreement — real-file characterisation (07-23, 07-25, 07-26)', () => {
  let hrByStrippedName: Record<string, Map<number, number>>

  beforeAll(async () => {
    hrByStrippedName = {}
    for (const fileName of FILE_NAMES) {
      const raw = await parseRealFile(fileName)
      const { activities } = parseFitData(raw)
      hrByStrippedName[stripFileExtension(fileName)] = heartRateBySecond(activities[0].records)
    }
  })

  it('groups into 3 sessions across 2 devices with nothing unparsed', () => {
    const grouping = groupActivityFiles(FILE_NAMES)
    expect(grouping.sessions).toHaveLength(3)
    expect(grouping.devices.map((d) => d.key).sort()).toEqual(['pace4', 'polarsense'])
    expect(grouping.unparsed).toHaveLength(0)
  })

  it('pins the per-session and pooled agreement this implementation computes', () => {
    const grouping = groupActivityFiles(FILE_NAMES)
    const primaryDeviceKey = 'pace4'
    const secondaryDeviceKey = 'polarsense'
    const deviceLabels = Object.fromEntries(grouping.devices.map((d) => [d.key, d.label]))

    const sessions: BatchAgreementInput['sessions'] = grouping.sessions.map((session) => {
      const samplesByDeviceKey: Record<string, ReadonlyMap<number, number>> = {}
      for (const [deviceKey, file] of Object.entries(session.filesByDeviceKey)) {
        samplesByDeviceKey[deviceKey] = hrByStrippedName[stripFileExtension(file.fileName)]
      }
      return { session, samplesByDeviceKey }
    })

    const agreement = buildBatchAgreement({ sessions, primaryDeviceKey, secondaryDeviceKey, deviceLabels })

    expect(agreement.skipped).toHaveLength(0)
    expect(agreement.sessions).toHaveLength(3)

    const byDate = Object.fromEntries(agreement.sessions.map((s) => [s.date, s]))

    // Pinned to what this implementation actually computes (see the doc
    // comment on `buildBatchAgreement` for why pooled CCC is reported
    // separately from these per-session numbers). The plan's exploration
    // script measured this same data at matched 3794/3260/4660, bias ~0.69,
    // and CCC ~0.996/0.993/0.847 for these three sessions — consistent with
    // the exact figures pinned below.
    const s0723 = byDate['2026-07-23']
    expect(s0723.matchedSeconds).toBe(3794)
    expect(s0723.blandAltman!.meanDiff).toBeCloseTo(0.6853, 4)
    expect(s0723.blandAltman!.sdDiff).toBeCloseTo(1.5511, 4)
    expect(s0723.concordance!.ccc).toBeCloseTo(0.9955, 4)
    expect(s0723.hrRange).toEqual({ min: 107, max: 180 })
    const cov0723 = Object.fromEntries(s0723.coverage.map((c) => [c.deviceKey, c]))
    expect(cov0723.pace4.coverage).toBeCloseTo(1, 10)
    expect(cov0723.polarsense.coverage).toBeCloseTo(0.7751, 4)

    const s0725 = byDate['2026-07-25']
    expect(s0725.matchedSeconds).toBe(3260)
    expect(s0725.blandAltman!.meanDiff).toBeCloseTo(0.3767, 4)
    expect(s0725.concordance!.ccc).toBeCloseTo(0.993, 3)
    const cov0725 = Object.fromEntries(s0725.coverage.map((c) => [c.deviceKey, c]))
    expect(cov0725.pace4.coverage).toBeCloseTo(1, 10)
    expect(cov0725.polarsense.coverage).toBeCloseTo(0.7897, 4)

    const s0726 = byDate['2026-07-26']
    expect(s0726.matchedSeconds).toBe(4660)
    expect(s0726.blandAltman!.meanDiff).toBeCloseTo(-0.9064, 4)
    expect(s0726.concordance!.ccc).toBeCloseTo(0.8468, 4)
    const cov0726 = Object.fromEntries(s0726.coverage.map((c) => [c.deviceKey, c]))
    expect(cov0726.pace4.coverage).toBeCloseTo(1, 10)
    expect(cov0726.polarsense.coverage).toBeCloseTo(0.7795, 4)
    // 07-26 is the genuinely bad session (per the plan): widest limits of
    // agreement and the worst CCC of the three.
    expect(s0726.concordance!.ccc).toBeLessThan(s0723.concordance!.ccc)
    expect(s0726.concordance!.ccc).toBeLessThan(s0725.concordance!.ccc)

    expect(agreement.pooled!.matchedSeconds).toBe(
      agreement.sessions.reduce((sum, s) => sum + s.matchedSeconds, 0),
    )
    expect(agreement.pooled!.matchedSeconds).toBe(11714)
    expect(agreement.pooled!.concordance!.ccc).toBeCloseTo(0.9748, 4)
    // Range-inflation on real data: pooled CCC (0.9748) comes out well above
    // the mean of the three per-session CCCs (0.9451) — the same direction of
    // bias the plan measured across all 7 sessions (pooled 0.9533 vs mean
    // 0.9320). It is not necessarily above every *individual* session's CCC
    // (07-23 alone is already 0.9955) — that stronger claim is what the
    // synthetic disjoint-band test in batchAgreement.test.ts pins instead.
    expect(agreement.pooled!.concordance!.ccc).toBeGreaterThan(agreement.spread!.meanSessionCcc)

    expect(agreement.spread!.sessions).toBe(3)
    expect(agreement.spread!.meanSessionCcc).toBeCloseTo(0.9451, 4)
    expect(agreement.spread!.medianSessionCcc).toBeCloseTo(0.993, 3)
    expect(agreement.spread!.minSessionCcc).toBeCloseTo(0.8468, 4)
    expect(agreement.spread!.maxSessionCcc).toBeCloseTo(0.9955, 4)
    expect(agreement.spread!.cccBands).toEqual({ good: 2, warn: 0, bad: 1 })
  })
})
