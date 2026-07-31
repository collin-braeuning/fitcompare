import type { ReactNode } from 'react'
import { useState } from 'react'
import { BatchView, resolveSessionPair, useBatchScreen } from './features/batch'
import { ComparisonView } from './features/comparison'
import { FILE_SLOTS, PRIMARY_SLOT, pairBySlot, useFitFiles } from './features/fit-file'
import { NavBar, RouteUnavailable, routeTitle, useNavigation } from './features/navigation'
import { UploadView } from './features/upload'
import './App.css'

/**
 * App shell: the nav bar plus whichever screen the current route names.
 * Everything else is owned by the feature that renders it.
 */
export default function App() {
  /** Which file's laps and pace are overlaid on the heart rate chart. */
  const [paceSourceId, setPaceSourceId] = useState(PRIMARY_SLOT.id)

  const { slotState, loadedBySlot, loadFile, loadSample, reset } = useFitFiles()

  // Owned here, not inside BatchView, so navigating away from the batch
  // screen and back doesn't unmount the batch hook and re-parse every file.
  // Cost: `useBatchAgreement` (inside it) runs on every render including the
  // upload screen — harmless, since `groupActivityFiles([])` is trivial and
  // `agreement` short-circuits to `null` on empty device keys.
  const batch = useBatchScreen()

  const { route, canGoBack, navigate, goBack } = useNavigation()

  const loadedFiles = FILE_SLOTS.map((slot) => loadedBySlot[slot.id]).filter(
    (file) => file !== undefined,
  )
  const paceSource = loadedBySlot[paceSourceId]
  const canCompare = loadedFiles.length === FILE_SLOTS.length && paceSource !== undefined

  const comparisonLabels: readonly [string, string] | null = canCompare
    ? [loadedFiles[0].fileName, loadedFiles[1].fileName]
    : null

  // Re-resolved against live state on every render — never carried as an
  // object reference in the route itself — so a route can't hold a dead
  // `LoadedFile`. `null` means the session's files are no longer loaded.
  const sessionPair =
    route.name === 'session'
      ? resolveSessionPair(
          batch.grouping,
          batch.loadedByName,
          route.sessionId,
          route.primaryDeviceKey,
          route.secondaryDeviceKey,
        )
      : null

  const sessionBySlot = sessionPair ? pairBySlot(sessionPair.primary, sessionPair.secondary) : null

  const title = routeTitle(route, {
    comparisonLabels,
    session: sessionPair
      ? {
          date: sessionPair.date,
          activity: sessionPair.activity,
          primaryLabel: sessionPair.primaryLabel,
          secondaryLabel: sessionPair.secondaryLabel,
        }
      : null,
  })

  const openSession = (sessionId: string) =>
    navigate({
      name: 'session',
      sessionId,
      primaryDeviceKey: batch.primaryDeviceKey,
      secondaryDeviceKey: batch.secondaryDeviceKey,
    })

  // Assigned rather than returned from an early switch/case so that adding a
  // new `Route` variant without a matching case here is a compile error
  // ("used before being assigned") rather than a silent blank screen.
  let body: ReactNode
  switch (route.name) {
    case 'upload':
      body = (
        <UploadView
          slotState={slotState}
          paceSourceId={paceSourceId}
          onSelectFile={loadFile}
          onSelectSample={loadSample}
          onSetPaceSource={setPaceSourceId}
          onClearSlot={reset}
          onCompare={() => navigate({ name: 'comparison' })}
          onCompareMany={() => navigate({ name: 'batch' })}
        />
      )
      break
    case 'comparison':
      // Guarded rather than trusted: the route only names a destination, but
      // the files it was pushed for must still be present to render it.
      body = canCompare ? (
        <ComparisonView loadedBySlot={loadedBySlot} paceSource={paceSource} paceSourceId={paceSourceId} />
      ) : (
        <RouteUnavailable message="Both files must still be loaded to show this comparison." onBack={goBack} />
      )
      break
    case 'batch':
      body = <BatchView batch={batch} onOpenSession={openSession} />
      break
    case 'session':
      // The drill-down reuses the existing `ComparisonView` unchanged, against
      // a synthetic two-slot record built from the resolved pair — the
      // comparison pipeline (`useComparisonData`, the stats, the charts)
      // never has to know its files came from a batch. Pace source is
      // pinned to `PRIMARY_SLOT`, never `App`'s own `paceSourceId`: that
      // belongs to the upload cards, and reusing it here would let a
      // drill-down silently inherit "slot 2" for no visible reason.
      body =
        sessionPair && sessionBySlot ? (
          <ComparisonView loadedBySlot={sessionBySlot} paceSource={sessionPair.primary} paceSourceId={PRIMARY_SLOT.id} />
        ) : (
          <RouteUnavailable message="That session's files are no longer loaded." onBack={goBack} />
        )
      break
  }

  return (
    <>
      <header className="fitcompare-header">
        <h1>FitCompare</h1>
      </header>

      <NavBar title={title} onBack={canGoBack ? goBack : undefined} />

      <main className="container main-content">{body}</main>
    </>
  )
}
