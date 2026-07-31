import { describe, it, expect } from 'vitest'
import { routeTitle, type RouteTitleContext } from '../routeTitle'
import type { Route } from '../routes'

const NO_CONTEXT: RouteTitleContext = { comparisonLabels: null, session: null, locale: 'en-US' }

describe('routeTitle', () => {
  it('titles the upload route', () => {
    expect(routeTitle({ name: 'upload' }, NO_CONTEXT)).toBe('Upload Activities')
  })

  it('titles comparison with labels as "a vs b"', () => {
    const context: RouteTitleContext = { ...NO_CONTEXT, comparisonLabels: ['pace4', 'polarSense'] }
    expect(routeTitle({ name: 'comparison' }, context)).toBe('pace4 vs polarSense')
  })

  it('titles comparison without labels as "Comparison"', () => {
    expect(routeTitle({ name: 'comparison' }, NO_CONTEXT)).toBe('Comparison')
  })

  it('titles the batch route as "All Sessions"', () => {
    expect(routeTitle({ name: 'batch' }, NO_CONTEXT)).toBe('All Sessions')
  })

  it('titles a resolved session route with date, activity and device labels', () => {
    const sessionRoute: Route = {
      name: 'session',
      sessionId: '2026-07-26|run',
      primaryDeviceKey: 'pace4',
      secondaryDeviceKey: 'polarsense',
    }
    const context: RouteTitleContext = {
      ...NO_CONTEXT,
      session: { date: '2026-07-26', activity: 'run', primaryLabel: 'pace4', secondaryLabel: 'polarSense' },
    }
    expect(routeTitle(sessionRoute, context)).toBe('Jul 26 · run — pace4 vs polarSense')
  })

  it('titles an unresolved session route as "Session Unavailable"', () => {
    const sessionRoute: Route = {
      name: 'session',
      sessionId: 'gone',
      primaryDeviceKey: 'a',
      secondaryDeviceKey: 'b',
    }
    expect(routeTitle(sessionRoute, NO_CONTEXT)).toBe('Session Unavailable')
  })

  it('passes a multi-word activity through unchanged', () => {
    const sessionRoute: Route = {
      name: 'session',
      sessionId: '2026-07-26|long_run',
      primaryDeviceKey: 'pace4',
      secondaryDeviceKey: 'polarsense',
    }
    const context: RouteTitleContext = {
      ...NO_CONTEXT,
      session: {
        date: '2026-07-26',
        activity: 'long_run',
        primaryLabel: 'pace4',
        secondaryLabel: 'polarSense',
      },
    }
    expect(routeTitle(sessionRoute, context)).toBe('Jul 26 · long_run — pace4 vs polarSense')
  })
})
