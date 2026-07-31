import { describe, it, expect } from 'vitest'
import { buildComparisonChartData } from '../comparisonChartData'
import { buildComparisonSummary } from '../comparisonSummary'
import type { FitActivity, FitRecord, FileSlot, LoadedFile } from '../../fit-file'

const SLOTS: FileSlot[] = [
  { id: 'file-1', label: 'File 1' },
  { id: 'file-2', label: 'File 2' },
]

function record(timestamp: string, heartRate: number | null, speed: number | null = null): FitRecord {
  return {
    timestamp,
    heartRate,
    speed,
    cadence: null,
    altitude: null,
    power: null,
    distance: null,
    positionLat: null,
    positionLong: null,
  }
}

function file(fileName: string, records: FitRecord[]): LoadedFile {
  const activity: FitActivity = {
    sport: 'running',
    subSport: 'generic',
    timestamp: '',
    startTime: '',
    avgHeartRate: 0,
    maxHeartRate: 0,
    records,
    laps: [],
  }
  return { fileName, activity }
}

describe('buildComparisonChartData', () => {
  it('needs at least two files to compare', () => {
    const loaded = { 'file-1': file('a', [record('2026-01-01T00:00:00Z', 100)]) }
    expect(buildComparisonChartData(SLOTS, loaded, 'file-1').heartRate).toEqual([])
  })

  it('merges partially-overlapping recordings onto one timeline', () => {
    const loaded = {
      'file-1': file('watch', [
        record('2026-01-01T00:00:00Z', 100),
        record('2026-01-01T00:00:01Z', 101),
      ]),
      'file-2': file('strap', [
        record('2026-01-01T00:00:01Z', 111),
        record('2026-01-01T00:00:02Z', 112),
      ]),
    }

    const data = buildComparisonChartData(SLOTS, loaded, 'file-1')

    expect(data.epochSeconds).toHaveLength(3)
    // Gaps stay null rather than being zero-filled or interpolated.
    expect(data.heartRate[0].values).toEqual([100, 101, null])
    expect(data.heartRate[1].values).toEqual([null, 111, 112])
  })

  it('treats a 0 bpm reading as a sensor dropout, not a value', () => {
    const loaded = {
      'file-1': file('watch', [record('2026-01-01T00:00:00Z', 0)]),
      'file-2': file('strap', [record('2026-01-01T00:00:00Z', 111)]),
    }

    const data = buildComparisonChartData(SLOTS, loaded, 'file-1')
    expect(data.heartRate[0].values).toEqual([null])
  })

  it('builds a pace series only for the chosen pace source', () => {
    const loaded = {
      'file-1': file('watch', [record('2026-01-01T00:00:00Z', 100, 16.09344)]),
      'file-2': file('strap', [record('2026-01-01T00:00:00Z', 111, 16.09344)]),
    }

    const data = buildComparisonChartData(SLOTS, loaded, 'file-2')
    expect(data.pace?.slotId).toBe('file-2')
    expect(data.pace?.values[0]).toBeCloseTo(6, 5)
  })

  it('disambiguates identical file names', () => {
    const loaded = {
      'file-1': file('run', [record('2026-01-01T00:00:00Z', 100)]),
      'file-2': file('run', [record('2026-01-01T00:00:00Z', 101)]),
    }

    const data = buildComparisonChartData(SLOTS, loaded, 'file-1')
    expect(data.heartRate.map((s) => s.name)).toEqual(['run (1)', 'run (2)'])
  })
})

describe('buildComparisonSummary', () => {
  it('only pairs seconds where both devices recorded', () => {
    const loaded = {
      'file-1': file('watch', [
        record('2026-01-01T00:00:00Z', 100),
        record('2026-01-01T00:00:01Z', 100),
      ]),
      'file-2': file('strap', [
        record('2026-01-01T00:00:01Z', 110),
        record('2026-01-01T00:00:02Z', 110),
      ]),
    }

    const data = buildComparisonChartData(SLOTS, loaded, 'file-1')
    const summary = buildComparisonSummary(data, 'file-1', 'file-2')

    // Three seconds on the timeline, but only one where both have a reading.
    expect(data.epochSeconds).toHaveLength(3)
    expect(summary?.matchingPoints).toBe(1)
    expect(summary?.difference.avgAbsDiff).toBe(10)
  })

  it('returns null when the recordings never overlap', () => {
    const loaded = {
      'file-1': file('watch', [record('2026-01-01T00:00:00Z', 100)]),
      'file-2': file('strap', [record('2026-06-01T00:00:00Z', 110)]),
    }

    const data = buildComparisonChartData(SLOTS, loaded, 'file-1')
    expect(buildComparisonSummary(data, 'file-1', 'file-2')).toBeNull()
  })
})
