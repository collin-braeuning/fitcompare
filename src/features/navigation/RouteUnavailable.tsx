/**
 * Shown when a route points at state that no longer exists — a cleared
 * upload slot, a batch that's been reloaded since a session route was
 * pushed. Rendered rather than papered over: `activitySessions.ts`'s own
 * principle is "a broken join should be visible, not quietly hidden," and
 * that applies just as much to a stale route as to a stale filename join.
 */
export function RouteUnavailable({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="text-center">
      <p>{message}</p>
      <button type="button" className="btn btn-secondary" onClick={onBack}>
        Back
      </button>
    </div>
  )
}
