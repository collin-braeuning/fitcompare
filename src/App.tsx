import { useState } from 'react'
import { ComparisonView } from './features/comparison'
import { FILE_SLOTS, PRIMARY_SLOT, useFitFiles } from './features/fit-file'
import { UploadView } from './features/upload'
import './App.css'

/**
 * App shell and the single piece of navigation: upload screen ⇄ comparison
 * screen. Everything else is owned by the feature that renders it.
 */
export default function App() {
  const [showComparison, setShowComparison] = useState(false)
  /** Which file's laps and pace are overlaid on the heart rate chart. */
  const [paceSourceId, setPaceSourceId] = useState(PRIMARY_SLOT.id)

  const { slotState, loadedBySlot, loadFile, loadSample, resetAll } = useFitFiles()

  const loadedFiles = FILE_SLOTS.map((slot) => loadedBySlot[slot.id]).filter(
    (file) => file !== undefined,
  )
  const paceSource = loadedBySlot[paceSourceId]

  const startOver = () => {
    setShowComparison(false)
    setPaceSourceId(PRIMARY_SLOT.id)
    resetAll()
  }

  // Guarded rather than trusted: `showComparison` is set from the upload
  // screen, but the files it was set for must still be present to render.
  const canCompare = showComparison && loadedFiles.length === FILE_SLOTS.length && paceSource

  return (
    <>
      <header className="fitcompare-header">
        <h1>FitCompare</h1>
      </header>

      <main className="container main-content">
        {canCompare ? (
          <ComparisonView
            files={loadedFiles}
            loadedBySlot={loadedBySlot}
            paceSource={paceSource}
            paceSourceId={paceSourceId}
            onStartOver={startOver}
          />
        ) : (
          <UploadView
            slotState={slotState}
            paceSourceId={paceSourceId}
            onSelectFile={loadFile}
            onSelectSample={loadSample}
            onSetPaceSource={setPaceSourceId}
            onCompare={() => setShowComparison(true)}
          />
        )}
      </main>
    </>
  )
}
