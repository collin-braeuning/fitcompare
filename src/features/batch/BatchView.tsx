import { useMemo, useState, type ChangeEvent } from 'react'
import { BlandAltmanChart, ConcordanceChart } from '../../components/charts'
import { GraphCard } from '../../components/GraphCard'
import { StatBadge } from '../../components/StatBadge'
import type { LoadedFile, SampleFile } from '../fit-file'
import { SAMPLE_FILES } from '../fit-file'
import { cccLabel, cccLevel } from '../comparison/agreementScale'
import { groupActivityFiles } from './activitySessions'
import { BatchSessionTable } from './BatchSessionTable'
import { useBatchAgreement } from './useBatchAgreement'
import type { BatchFileState, BatchProgress } from './useBatchFiles'
import './BatchView.css'

interface BatchViewProps {
  states: Record<string, BatchFileState>
  loadedByName: Record<string, LoadedFile>
  progress: BatchProgress
  isLoading: boolean
  onLoadSamples: (samples: readonly SampleFile[]) => Promise<void>
  onLoadFiles: (files: readonly File[]) => Promise<void>
  onBack: () => void
}

function unparsedReasonLabel(reason: 'name-pattern' | 'duplicate-device'): string {
  return reason === 'name-pattern'
    ? "name doesn't match the expected date_device_activity pattern"
    : 'duplicate file for a device already seen in this session'
}

/**
 * The batch screen: load every `.fit` file in `data/` (or a chosen folder),
 * group them into (date, activity) sessions, and show one row per session's
 * agreement plus pooled charts over every session's points.
 *
 * A row that looks bad here is a prompt to open that pair in the existing
 * 2-file comparison screen — this view is for the overview, not the
 * diagnosis, so it carries no lag correction, no exclude toggles, no export.
 */
export function BatchView({
  states,
  loadedByName,
  progress,
  isLoading,
  onLoadSamples,
  onLoadFiles,
  onBack,
}: BatchViewProps) {
  // What the user has explicitly picked, if anything. Derived (not effect-set)
  // fallbacks below default to the two most common devices once files are
  // loaded, without fighting a choice the user has already made.
  const [primarySelection, setPrimarySelection] = useState('')
  const [secondarySelection, setSecondarySelection] = useState('')

  // Cheap to recompute (a handful of filenames) — used only to pick sensible
  // defaults before `useBatchAgreement` runs the real, memoised grouping.
  const deviceCandidates = useMemo(
    () => groupActivityFiles(Object.keys(loadedByName)).devices,
    [loadedByName],
  )

  const primaryDeviceKey = deviceCandidates.some((d) => d.key === primarySelection)
    ? primarySelection
    : (deviceCandidates[0]?.key ?? '')
  const secondaryDeviceKey = deviceCandidates.some(
    (d) => d.key === secondarySelection && d.key !== primaryDeviceKey,
  )
    ? secondarySelection
    : (deviceCandidates.find((d) => d.key !== primaryDeviceKey)?.key ?? '')

  const { grouping, agreement } = useBatchAgreement(loadedByName, primaryDeviceKey, secondaryDeviceKey)

  const erroredFiles = useMemo(
    () =>
      Object.entries(states).filter((entry): entry is [string, { status: 'error'; message: string }] =>
        entry[1].status === 'error',
      ),
    [states],
  )

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) onLoadFiles(Array.from(files))
    event.target.value = ''
  }

  const spread = agreement?.spread ?? null

  return (
    <div className="batch-view">
      <div className="batch-toolbar">
        <button className="btn btn-secondary" onClick={onBack}>
          Back
        </button>

        <button className="btn btn-primary" onClick={() => onLoadSamples(SAMPLE_FILES)} disabled={isLoading}>
          Load All From data/
        </button>

        <label className="batch-file-input">
          Load a folder or file selection
          <input type="file" accept=".fit,.FIT" multiple onChange={handleFileInput} disabled={isLoading} />
        </label>

        {grouping.devices.length >= 2 && (
          <div className="batch-device-pickers">
            <label>
              Primary
              <select value={primaryDeviceKey} onChange={(e) => setPrimarySelection(e.target.value)}>
                {grouping.devices.map((device) => (
                  <option key={device.key} value={device.key}>
                    {device.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Secondary
              <select value={secondaryDeviceKey} onChange={(e) => setSecondarySelection(e.target.value)}>
                {grouping.devices.map((device) => (
                  <option key={device.key} value={device.key}>
                    {device.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {isLoading && (
        <p className="batch-progress">
          Loading {progress.done}/{progress.total} files
          {progress.errored > 0 && ` (${progress.errored} failed)`}…
        </p>
      )}

      {(grouping.sessions.length > 0 || grouping.unparsed.length > 0 || erroredFiles.length > 0) && (
        <div className="batch-report">
          <p>
            {grouping.sessions.length} session{grouping.sessions.length === 1 ? '' : 's'} found across{' '}
            {grouping.devices.length} device{grouping.devices.length === 1 ? '' : 's'}.
          </p>

          {grouping.unparsed.length > 0 && (
            <ul className="batch-report-list">
              {grouping.unparsed.map((u) => (
                <li key={u.fileName}>
                  <strong>{u.fileName}</strong> — {unparsedReasonLabel(u.reason)}
                </li>
              ))}
            </ul>
          )}

          {erroredFiles.length > 0 && (
            <ul className="batch-report-list">
              {erroredFiles.map(([name, state]) => (
                <li key={name}>
                  <strong>{name}</strong> — {state.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {spread && (
        <div className="row mb-4">
          <div className="col-12">
            <GraphCard
              title="Agreement Across Sessions"
              badge={
                <StatBadge
                  stats={[
                    {
                      value: `CCC: ${spread.medianSessionCcc.toFixed(2)} (${spread.minSessionCcc.toFixed(2)}–${spread.maxSessionCcc.toFixed(2)})`,
                      detail: `median (min–max) of ${spread.sessions} sessions`,
                      level: cccLevel(spread.medianSessionCcc),
                    },
                    {
                      value: `${spread.cccBands.good}/${spread.sessions} substantial or better`,
                      detail: `worst ${spread.minSessionCcc.toFixed(2)} (${cccLabel(spread.minSessionCcc)})`,
                    },
                  ]}
                />
              }
            >
              <p className="batch-aggregate-note">
                Mean bias across sessions: {spread.meanSessionBias.toFixed(1)} bpm (range{' '}
                {spread.minSessionBias.toFixed(1)} to {spread.maxSessionBias.toFixed(1)} bpm). Each session's own
                CCC is only interpretable against its heart-rate range — see the table below.
              </p>
            </GraphCard>
          </div>
        </div>
      )}

      {agreement && (agreement.sessions.length > 0 || agreement.skipped.length > 0) && (
        <div className="row mb-4">
          <div className="col-12">
            <BatchSessionTable agreement={agreement} />
          </div>
        </div>
      )}

      {agreement?.pooled?.blandAltman && (
        <div className="row mb-4">
          <div className="col-12">
            <GraphCard title="Pooled Bland-Altman (every session's points)">
              <BlandAltmanChart
                stats={agreement.pooled.blandAltman}
                primaryName={agreement.primaryName}
                secondaryName={agreement.secondaryName}
                plot={{ weighted: true }}
              />
            </GraphCard>
          </div>
        </div>
      )}

      {agreement?.pooled?.concordance && (
        <div className="row mb-4">
          <div className="col-12">
            <GraphCard title="Pooled Concordance — range-inflated, for the scatter only">
              <ConcordanceChart
                stats={agreement.pooled.concordance}
                primaryName={agreement.primaryName}
                secondaryName={agreement.secondaryName}
                plot={{ weighted: true }}
              />
            </GraphCard>
          </div>
        </div>
      )}
    </div>
  )
}
