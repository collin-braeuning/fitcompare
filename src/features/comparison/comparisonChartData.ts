import type { FileSlot, LoadedFile } from '../fit-file'
import { speedToPace } from '../../lib/pace'

/**
 * Aligns several recordings onto one shared timeline so they can be charted
 * and compared sample-for-sample.
 */

/** One chart line, index-aligned with `ComparisonChartData.epochSeconds`. */
export interface AlignedSeries {
  /** Upload slot this series came from — how consumers pick a specific device. */
  slotId: string
  /** Display label, de-duplicated across files. */
  name: string
  /** `null` where this device had no sample for that second. */
  values: Array<number | null>
}

export interface ComparisonChartData {
  /** The shared x-axis: whole-second epoch timestamps, ascending. */
  epochSeconds: number[]
  heartRate: AlignedSeries[]
  /** Pace comes from a single user-chosen device, so at most one series. */
  pace: AlignedSeries | null
}

export const EMPTY_CHART_DATA: ComparisonChartData = {
  epochSeconds: [],
  heartRate: [],
  pace: null,
}

/**
 * Give every file a unique display name, adding "(n)" only to names that
 * actually collide — uploading the same file twice shouldn't silently produce
 * two identically-labelled chart lines.
 */
function buildDisplayNames(files: Array<{ slotId: string; file: LoadedFile }>): Map<string, string> {
  const totals = new Map<string, number>()
  for (const { file } of files) {
    totals.set(file.fileName, (totals.get(file.fileName) ?? 0) + 1)
  }

  const seen = new Map<string, number>()
  const names = new Map<string, string>()
  for (const { slotId, file } of files) {
    const base = file.fileName
    if ((totals.get(base) ?? 0) > 1) {
      const occurrence = (seen.get(base) ?? 0) + 1
      seen.set(base, occurrence)
      names.set(slotId, `${base} (${occurrence})`)
    } else {
      names.set(slotId, base)
    }
  }
  return names
}

/** Whole-second bucket for a record timestamp, or null if unparseable. */
function toSecondBucket(timestamp: string): number | null {
  const ms = Date.parse(timestamp)
  return Number.isNaN(ms) ? null : Math.round(ms / 1000)
}

/**
 * Build the shared timeline and one aligned series per device.
 *
 * Two devices started by hand never share a sample clock, so readings are
 * bucketed to whole seconds and merged onto the union of all buckets. That
 * gives a common x-axis without resampling or interpolating either signal —
 * gaps stay `null` and simply don't draw, rather than being invented.
 */
export function buildComparisonChartData(
  slots: readonly FileSlot[],
  loadedBySlot: Record<string, LoadedFile>,
  paceSourceId: string,
): ComparisonChartData {
  const files = slots
    .map((slot) => ({ slotId: slot.id, file: loadedBySlot[slot.id] }))
    .filter((entry): entry is { slotId: string; file: LoadedFile } => entry.file !== undefined)

  // A comparison needs something to compare against.
  if (files.length < 2) return EMPTY_CHART_DATA

  const names = buildDisplayNames(files)

  const buckets = new Set<number>()
  for (const { file } of files) {
    for (const record of file.activity.records) {
      const bucket = toSecondBucket(record.timestamp)
      if (bucket !== null) buckets.add(bucket)
    }
  }

  const epochSeconds = [...buckets].sort((a, b) => a - b)
  const indexByBucket = new Map(epochSeconds.map((second, index) => [second, index]))

  const heartRate: AlignedSeries[] = []
  let pace: AlignedSeries | null = null

  for (const { slotId, file } of files) {
    const name = names.get(slotId)!
    const isPaceSource = slotId === paceSourceId

    const hrValues: Array<number | null> = new Array(epochSeconds.length).fill(null)
    const paceValues: Array<number | null> | null = isPaceSource
      ? new Array(epochSeconds.length).fill(null)
      : null

    for (const record of file.activity.records) {
      const bucket = toSecondBucket(record.timestamp)
      if (bucket === null) continue
      const index = indexByBucket.get(bucket)
      if (index === undefined) continue

      // Devices report 0 bpm when the sensor loses contact; that's a dropout,
      // not a reading, so it must not be charted or fed into the statistics.
      hrValues[index] = record.heartRate && record.heartRate > 0 ? record.heartRate : null
      if (paceValues) paceValues[index] = speedToPace(record.speed)
    }

    heartRate.push({ slotId, name, values: hrValues })
    if (paceValues) pace = { slotId, name: `${name} Pace`, values: paceValues }
  }

  return { epochSeconds, heartRate, pace }
}
