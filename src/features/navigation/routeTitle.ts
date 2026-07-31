import type { Route } from './routes'
import { formatShortSessionDate } from '../../lib/formatDate'

export interface SessionTitleParts {
  date: string
  activity: string
  primaryLabel: string
  secondaryLabel: string
}

export interface RouteTitleContext {
  comparisonLabels: readonly [string, string] | null
  session: SessionTitleParts | null
  /** Pinned in tests; otherwise the runtime default. */
  locale?: string
}

/**
 * The nav bar's title for a route. Pure so it can be tested without
 * rendering anything, and so `App` can pass the exact same resolved
 * `sessionPair`/labels here and to the body it titles — title and body can
 * never desync because they're derived from the same values.
 */
export function routeTitle(route: Route, context: RouteTitleContext): string {
  switch (route.name) {
    case 'upload':
      return 'Upload Activities'
    case 'comparison':
      return context.comparisonLabels
        ? `${context.comparisonLabels[0]} vs ${context.comparisonLabels[1]}`
        : 'Comparison'
    case 'batch':
      return 'All Sessions'
    case 'session': {
      const { session } = context
      if (!session) return 'Session Unavailable'
      const date = formatShortSessionDate(session.date, context.locale)
      return `${date} · ${session.activity} — ${session.primaryLabel} vs ${session.secondaryLabel}`
    }
  }
}
