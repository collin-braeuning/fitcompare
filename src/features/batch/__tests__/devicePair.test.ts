import { describe, it, expect } from 'vitest'
import { resolveDevicePair } from '../devicePair'
import type { DeviceIdentity } from '../activitySessions'

const A: DeviceIdentity = { key: 'a', label: 'A', fileCount: 5 }
const B: DeviceIdentity = { key: 'b', label: 'B', fileCount: 3 }
const C: DeviceIdentity = { key: 'c', label: 'C', fileCount: 1 }

describe('resolveDevicePair', () => {
  it('resolves both keys to empty when there are no devices', () => {
    expect(resolveDevicePair([], '', '')).toEqual({ primaryDeviceKey: '', secondaryDeviceKey: '' })
  })

  it('leaves the secondary empty when only one device exists', () => {
    expect(resolveDevicePair([A], '', '')).toEqual({ primaryDeviceKey: 'a', secondaryDeviceKey: '' })
  })

  it('honours valid explicit selections', () => {
    expect(resolveDevicePair([A, B, C], 'b', 'c')).toEqual({
      primaryDeviceKey: 'b',
      secondaryDeviceKey: 'c',
    })
  })

  it('falls back the secondary when it equals the primary', () => {
    expect(resolveDevicePair([A, B, C], 'b', 'b')).toEqual({
      primaryDeviceKey: 'b',
      secondaryDeviceKey: 'a',
    })
  })

  it('falls back a stale primary selection to the highest fileCount device', () => {
    expect(resolveDevicePair([A, B, C], 'nonexistent', '')).toEqual({
      primaryDeviceKey: 'a',
      secondaryDeviceKey: 'b',
    })
  })

  it('defaults to the two most-used devices, in order, when nothing is selected', () => {
    expect(resolveDevicePair([A, B, C], '', '')).toEqual({
      primaryDeviceKey: 'a',
      secondaryDeviceKey: 'b',
    })
  })
})
