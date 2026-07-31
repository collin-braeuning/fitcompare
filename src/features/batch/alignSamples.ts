/**
 * N-device intersection of second-indexed heart-rate samples.
 *
 * The devices in this app aren't synchronised — they're started and stopped
 * by hand, and `pace4` auto-pauses — so a session's comparable samples are
 * only the whole seconds where *every* selected device produced a usable
 * reading. That's an intersection, not a union: unlike the pairwise
 * comparison screen (which draws a time series and so needs every second,
 * `null`-filled, on a shared x-axis), the batch view draws no time series, so
 * building a union timeline with null-filled arrays would be pure waste —
 * roughly 5,000 slots for each of 14 files, never read.
 */

export interface DeviceSamples {
  deviceKey: string
  bySecond: ReadonlyMap<number, number>
}

export interface DeviceCoverage {
  deviceKey: string
  /** Usable readings this device recorded. */
  ownSeconds: number
  /** last − first + 1: how long it was running. */
  spanSeconds: number
  /** matchedSeconds / ownSeconds, 0..1. */
  coverage: number
}

export interface AlignedSession {
  /** Present in EVERY device passed in. */
  seconds: number[]
  /** Index-aligned with `seconds`. */
  valuesByDeviceKey: Record<string, number[]>
  coverage: DeviceCoverage[]
}

const EMPTY_ALIGNED_SESSION: AlignedSession = { seconds: [], valuesByDeviceKey: {}, coverage: [] }

function spanOf(bySecond: ReadonlyMap<number, number>): number {
  if (bySecond.size === 0) return 0
  let min = Infinity
  let max = -Infinity
  for (const second of bySecond.keys()) {
    if (second < min) min = second
    if (second > max) max = second
  }
  return max - min + 1
}

/**
 * Intersect any number of devices' second-indexed samples.
 *
 * Iterates the smallest map and probes the rest — O(min·N) rather than
 * building a union first. Two or more devices are required for an
 * intersection to mean anything; fewer returns an empty result rather than
 * throwing, since "not enough devices selected yet" is a normal transient UI
 * state, not an error.
 */
export function intersectHeartRate(devices: readonly DeviceSamples[]): AlignedSession {
  if (devices.length < 2) return EMPTY_ALIGNED_SESSION

  const smallest = devices.reduce((a, b) => (a.bySecond.size <= b.bySecond.size ? a : b))

  const seconds: number[] = []
  for (const second of smallest.bySecond.keys()) {
    if (devices.every((device) => device.bySecond.has(second))) seconds.push(second)
  }
  seconds.sort((a, b) => a - b)

  const valuesByDeviceKey: Record<string, number[]> = {}
  for (const device of devices) {
    valuesByDeviceKey[device.deviceKey] = seconds.map((second) => device.bySecond.get(second)!)
  }

  const matchedSeconds = seconds.length
  const coverage: DeviceCoverage[] = devices.map((device) => {
    const ownSeconds = device.bySecond.size
    return {
      deviceKey: device.deviceKey,
      ownSeconds,
      spanSeconds: spanOf(device.bySecond),
      coverage: ownSeconds === 0 ? 0 : matchedSeconds / ownSeconds,
    }
  })

  return { seconds, valuesByDeviceKey, coverage }
}
