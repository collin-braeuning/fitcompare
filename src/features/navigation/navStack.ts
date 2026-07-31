import { sameRoute, UPLOAD_ROUTE, type Route } from './routes'

/**
 * Mirrors the browser's own history model — every entry ever pushed, plus an
 * index into it — rather than a stack you pop.
 *
 * A pop-only stack can't survive two ordinary things: a multi-entry back (a
 * long-press or two-finger swipe can fire one `popstate` that lands several
 * entries earlier, desyncing app depth from history depth for good), and the
 * Forward button (pop-only leaves no record of what was popped, so Back then
 * Forward can't recover). Keeping every entry plus an index fixes both:
 * `popstate` never "pops", it *goes to a depth* read off `event.state`, which
 * is authoritative.
 */
export interface NavStack {
  readonly entries: readonly Route[]
  readonly index: number
}

export const INITIAL_NAV_STACK: NavStack = { entries: [UPLOAD_ROUTE], index: 0 }

export function currentRoute(stack: NavStack): Route {
  return stack.entries[stack.index]
}

export function canGoBack(stack: NavStack): boolean {
  return stack.index > 0
}

/**
 * Truncates any forward (redo) entries, then appends `route` as the new
 * current entry. Returns `stack` itself — same reference — when `route` is
 * already current, which is the contract that lets a caller skip `pushState`
 * for a no-op and avoid duplicate history entries from a double-tap.
 */
export function pushRoute(stack: NavStack, route: Route): NavStack {
  if (sameRoute(currentRoute(stack), route)) return stack

  const entries = [...stack.entries.slice(0, stack.index + 1), route]
  return { entries, index: entries.length - 1 }
}

/**
 * Jumps to an absolute depth, clamped to the stack's bounds. Returns `stack`
 * itself when already at that depth.
 */
export function goToDepth(stack: NavStack, depth: number): NavStack {
  const clamped = Math.max(0, Math.min(depth, stack.entries.length - 1))
  if (clamped === stack.index) return stack
  return { entries: stack.entries, index: clamped }
}
