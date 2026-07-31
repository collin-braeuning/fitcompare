import type { DeviceIdentity } from './activitySessions'

export interface DevicePair {
  primaryDeviceKey: string
  secondaryDeviceKey: string
}

/**
 * Resolves the primary/secondary device keys the batch screen compares,
 * honouring an explicit user selection when it's still valid and falling
 * back to sensible defaults otherwise.
 *
 * `devices` is already sorted most-used first (`groupActivityFiles`), so
 * "no selection yet" and "the selected device disappeared" both fall back to
 * the two most common devices — cheap to recompute on every batch change, so
 * this stays a pure function rather than a `useState` synced by an effect.
 */
export function resolveDevicePair(
  devices: readonly DeviceIdentity[],
  primarySelection: string,
  secondarySelection: string,
): DevicePair {
  const primaryDeviceKey = devices.some((d) => d.key === primarySelection)
    ? primarySelection
    : (devices[0]?.key ?? '')

  const secondaryDeviceKey = devices.some(
    (d) => d.key === secondarySelection && d.key !== primaryDeviceKey,
  )
    ? secondarySelection
    : (devices.find((d) => d.key !== primaryDeviceKey)?.key ?? '')

  return { primaryDeviceKey, secondaryDeviceKey }
}
