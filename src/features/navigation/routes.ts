/**
 * Every screen the app can show, as data rather than a live object reference.
 *
 * A `session` route carries IDs (`sessionId`, the two device keys) rather
 * than the `LoadedFile`s themselves — `resolveSessionPair` re-resolves those
 * against live state on every render, so a route can never hold a reference
 * to a file that's since been cleared. It also means routes are trivially
 * comparable by value, which `sameRoute` and `pushRoute`'s no-op check both
 * depend on.
 */
export type Route =
  | { readonly name: 'upload' }
  | { readonly name: 'comparison' }
  | { readonly name: 'batch' }
  | {
      readonly name: 'session'
      readonly sessionId: string
      readonly primaryDeviceKey: string
      readonly secondaryDeviceKey: string
    }

export const UPLOAD_ROUTE: Route = { name: 'upload' }

/** Structural equality — two routes are the same place, not the same object. */
export function sameRoute(a: Route, b: Route): boolean {
  if (a.name !== b.name) return false
  if (a.name === 'session' && b.name === 'session') {
    return (
      a.sessionId === b.sessionId &&
      a.primaryDeviceKey === b.primaryDeviceKey &&
      a.secondaryDeviceKey === b.secondaryDeviceKey
    )
  }
  return true
}
