import { useCallback, useEffect, useRef, useState } from 'react'
import { canGoBack, currentRoute, goToDepth, pushRoute, INITIAL_NAV_STACK, type NavStack } from './navStack'
import type { Route } from './routes'

export interface Navigation {
  route: Route
  canGoBack: boolean
  navigate: (route: Route) => void
  goBack: () => void
}

const NAV_KEY = 'fitcompareNav'

function depthOf(state: unknown): number | null {
  if (typeof state !== 'object' || state === null) return null
  const depth = (state as Record<string, unknown>)[NAV_KEY]
  if (typeof depth !== 'object' || depth === null) return null
  const value = (depth as Record<string, unknown>).depth
  return typeof value === 'number' ? value : null
}

/**
 * Wires the pure `NavStack` to the browser's History API.
 *
 * One rule holds the whole thing together under StrictMode: **`pushState`
 * only ever happens inside an event handler; effects only ever do idempotent
 * things.** `replaceState` cannot grow the history stack, so a
 * double-invoked mount effect is a no-op the second time; `addEventListener`
 * / `removeEventListener` is symmetric. The traps this avoids are
 * `useEffect(() => pushState(...), [route])` (double-fires on mount,
 * producing a phantom entry) and calling `pushState` inside a
 * `setStack(prev => …)` updater (React may invoke updaters more than once).
 *
 * The 2-argument `pushState`/`replaceState` calls (no URL) are deliberate:
 * `vite.config.ts` sets `base: '/fitcompare/'` and the deploy target is
 * GitHub Pages, which has no SPA fallback, so a cosmetic URL path would
 * hard-404 on refresh. The URL never changes; only `history.state` does.
 */
export function useNavigation(): Navigation {
  const [stack, setStack] = useState<NavStack>(INITIAL_NAV_STACK)

  // Handlers read the stack through a ref so they never close over a stale
  // value and never need to re-subscribe. Both writers keep it in sync.
  const stackRef = useRef(stack)
  const scrollByDepth = useRef(new Map<number, number>())

  // Idempotent on purpose: `replaceState` cannot grow the history stack, so
  // StrictMode's double-invoked mount effect is a no-op the second time.
  useEffect(() => {
    history.scrollRestoration = 'manual'
    history.replaceState({ ...history.state, [NAV_KEY]: { depth: 0 } }, '')
  }, [])

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const previous = stackRef.current
      scrollByDepth.current.set(previous.index, window.scrollY)
      const next = goToDepth(previous, depthOf(event.state) ?? 0)
      stackRef.current = next
      setStack(next)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Restored one frame late: charts size themselves in their own effects, so
  // the page is still short when this effect first runs.
  useEffect(() => {
    const saved = scrollByDepth.current.get(stack.index) ?? 0
    const frame = requestAnimationFrame(() => window.scrollTo(0, saved))
    return () => cancelAnimationFrame(frame)
  }, [stack.index])

  const navigate = useCallback((route: Route) => {
    const previous = stackRef.current
    const next = pushRoute(previous, route)
    if (next === previous) return // already here — no duplicate entry
    scrollByDepth.current.set(previous.index, window.scrollY)
    stackRef.current = next
    setStack(next)
    history.pushState({ ...history.state, [NAV_KEY]: { depth: next.index } }, '')
  }, [])

  // The browser is the single source of truth: back goes through `popstate`,
  // so there is one code path and no double-pop.
  const goBack = useCallback(() => {
    if (canGoBack(stackRef.current)) history.back()
  }, [])

  return { route: currentRoute(stack), canGoBack: canGoBack(stack), navigate, goBack }
}
