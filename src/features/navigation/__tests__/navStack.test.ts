import { describe, it, expect } from 'vitest'
import { INITIAL_NAV_STACK, canGoBack, currentRoute, goToDepth, pushRoute, type NavStack } from '../navStack'
import type { Route } from '../routes'

const COMPARISON: Route = { name: 'comparison' }
const BATCH: Route = { name: 'batch' }
const SESSION: Route = {
  name: 'session',
  sessionId: '2026-07-26|run',
  primaryDeviceKey: 'pace4',
  secondaryDeviceKey: 'polarsense',
}

describe('INITIAL_NAV_STACK', () => {
  it('starts at the upload route, unable to go back', () => {
    expect(currentRoute(INITIAL_NAV_STACK)).toEqual({ name: 'upload' })
    expect(canGoBack(INITIAL_NAV_STACK)).toBe(false)
  })
})

describe('pushRoute', () => {
  it('pushes comparison then session, round-tripping the session payload', () => {
    const afterComparison = pushRoute(INITIAL_NAV_STACK, COMPARISON)
    expect(currentRoute(afterComparison)).toEqual(COMPARISON)

    const afterSession = pushRoute(afterComparison, SESSION)
    expect(currentRoute(afterSession)).toEqual(SESSION)
    expect(afterSession.entries).toHaveLength(3)
    expect(canGoBack(afterSession)).toBe(true)
  })

  it('returns the same reference when pushing the current route', () => {
    const afterComparison = pushRoute(INITIAL_NAV_STACK, COMPARISON)
    const pushedAgain = pushRoute(afterComparison, { name: 'comparison' })
    expect(pushedAgain).toBe(afterComparison)
  })

  it('truncates forward entries when pushing after going back', () => {
    const afterComparison = pushRoute(INITIAL_NAV_STACK, COMPARISON)
    const backAtUpload = goToDepth(afterComparison, 0)
    expect(currentRoute(backAtUpload)).toEqual({ name: 'upload' })

    const afterBatch = pushRoute(backAtUpload, BATCH)
    expect(afterBatch.entries).toEqual([{ name: 'upload' }, BATCH])
    expect(afterBatch.index).toBe(1)
  })

  it('does not mutate the input stack entries array', () => {
    const before: NavStack = { entries: [{ name: 'upload' }], index: 0 }
    const beforeEntries = before.entries
    pushRoute(before, COMPARISON)
    expect(before.entries).toBe(beforeEntries)
    expect(before.entries).toEqual([{ name: 'upload' }])
  })
})

describe('goToDepth', () => {
  const stack = pushRoute(pushRoute(INITIAL_NAV_STACK, COMPARISON), BATCH)

  it('clamps a negative depth to 0', () => {
    expect(goToDepth(stack, -3).index).toBe(0)
  })

  it('clamps an out-of-range depth to the last entry', () => {
    expect(goToDepth(stack, 99).index).toBe(stack.entries.length - 1)
  })

  it('returns the same reference when already at the requested depth', () => {
    expect(goToDepth(stack, stack.index)).toBe(stack)
  })
})
