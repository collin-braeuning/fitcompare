import { useState } from 'react'
import { BatchView, useBatchFiles } from './features/batch'
import { ComparisonView } from './features/comparison'
import { FILE_SLOTS, PRIMARY_SLOT, useFitFiles } from './features/fit-file'
import { UploadView } from './features/upload'
import './App.css'

type Screen = 'upload' | 'comparison' | 'batch'

/**
 * App shell and navigation between the upload, comparison and batch screens.
 * Everything else is owned by the feature that renders it.
 */
export default function App() {
  const [screen, setScreen] = useState<Screen>('upload')
  /** Which file's laps and pace are overlaid on the heart rate chart. */
  const [paceSourceId, setPaceSourceId] = useState(PRIMARY_SLOT.id)

  const { slotState, loadedBySlot, loadFile, loadSample, resetAll } = useFitFiles()

  // Owned here, not inside BatchView, so navigating back to the upload screen
  // and returning to "Compare many activities" doesn't unmount the batch
  // hook and re-parse every file.
  const batchFiles = useBatchFiles()

  const loadedFiles = FILE_SLOTS.map((slot) => loadedBySlot[slot.id]).filter(
    (file) => file !== undefined,
  )
  const paceSource = loadedBySlot[paceSourceId]

  const startOver = () => {
    setScreen('upload')
    setPaceSourceId(PRIMARY_SLOT.id)
    resetAll()
    batchFiles.reset()
  }

  // Guarded rather than trusted: `screen` is set from the upload screen, but
  // the files it was set for must still be present to render.
  const canCompare = screen === 'comparison' && loadedFiles.length === FILE_SLOTS.length && paceSource

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
        ) : screen === 'batch' ? (
          <BatchView
            states={batchFiles.states}
            loadedByName={batchFiles.loadedByName}
            progress={batchFiles.progress}
            isLoading={batchFiles.isLoading}
            onLoadSamples={batchFiles.loadSamples}
            onLoadFiles={batchFiles.loadFiles}
            onBack={() => setScreen('upload')}
          />
        ) : (
          <UploadView
            slotState={slotState}
            paceSourceId={paceSourceId}
            onSelectFile={loadFile}
            onSelectSample={loadSample}
            onSetPaceSource={setPaceSourceId}
            onCompare={() => setScreen('comparison')}
            onCompareMany={() => setScreen('batch')}
          />
        )}
      </main>
    </>
  )
}
