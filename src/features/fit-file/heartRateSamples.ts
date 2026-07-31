import type { FitRecord } from './fitTypes'

/**
 * Shared timeline primitives for turning a device's records into a
 * second-indexed heart rate signal.
 *
 * Both the pairwise comparison screen and the batch screen need to bucket
 * records to whole seconds and to know what counts as a usable heart-rate
 * reading, so those decisions live here once rather than being duplicated (or
 * drifting) between features.
 */

/** Whole-second bucket for a record timestamp, or null if unparseable. */
export function toSecondBucket(timestamp: string): number | null {
  const ms = Date.parse(timestamp)
  return Number.isNaN(ms) ? null : Math.round(ms / 1000)
}

/**
 * The reading, or null on a dropout (absent, 0, negative).
 *
 * Devices report 0 bpm (or, on some sensors, a negative value) when contact
 * is lost; that's a dropout, not a reading, so it must never be charted or
 * fed into statistics as if it were real data.
 */
export function usableHeartRate(record: Pick<FitRecord, 'heartRate'>): number | null {
  return record.heartRate && record.heartRate > 0 ? record.heartRate : null
}

/**
 * second → bpm for every usable reading. Dropouts are skipped, never stored.
 *
 * A dropout must not erase an already-recorded good reading at the same
 * second — two records sharing a second is not expected on 1 Hz devices, but
 * skipping rather than unconditionally overwriting means a stray duplicate
 * can never silently blank out real data.
 */
export function heartRateBySecond(records: readonly FitRecord[]): Map<number, number> {
  const bySecond = new Map<number, number>()
  for (const record of records) {
    const second = toSecondBucket(record.timestamp)
    if (second === null) continue
    const hr = usableHeartRate(record)
    if (hr !== null) bySecond.set(second, hr)
  }
  return bySecond
}
