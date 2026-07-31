import type { ChangeEvent } from 'react'
import { SAMPLE_FILES, type FileSlot, type SampleFile, type SlotState } from '../fit-file'
import './FileUploadCard.css'

interface FileUploadCardProps {
  slot: FileSlot
  state: SlotState
  onSelectFile: (file: File) => void
  onSelectSample: (sample: SampleFile) => void
  isPaceSource: boolean
  onSetPaceSource: () => void
  /** Resets this slot back to empty. The only way to change a loaded file today. */
  onClear: () => void
}

/** One upload slot: file picker, sample picker, and whatever it's loaded. */
export function FileUploadCard({
  slot,
  state,
  onSelectFile,
  onSelectSample,
  isPaceSource,
  onSetPaceSource,
  onClear,
}: FileUploadCardProps) {
  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onSelectFile(file)
  }

  const handleSampleInput = (event: ChangeEvent<HTMLSelectElement>) => {
    const sample = SAMPLE_FILES.find((candidate) => candidate.name === event.target.value)
    if (sample) onSelectSample(sample)
  }

  return (
    <div className="upload-card">
      {(state.status === 'loaded' || state.status === 'error') && (
        <button
          type="button"
          className="upload-card-clear"
          onClick={onClear}
          aria-label={`Clear ${slot.label}`}
        >
          &#10005;
        </button>
      )}

      <div className="upload-icon" aria-hidden="true">
        &#128193;
      </div>
      <h4>{slot.label}</h4>

      <label className="pace-source-toggle" htmlFor={`${slot.id}-pace-source`}>
        <input
          type="checkbox"
          id={`${slot.id}-pace-source`}
          checked={isPaceSource}
          onChange={onSetPaceSource}
        />
        Use for lap &amp; pace data
      </label>

      {state.status === 'loading' && <p className="upload-status">Reading {state.fileName}…</p>}

      {state.status === 'loaded' && (
        <div className="file-info">
          <p className="file-name">&#10003; {state.file.fileName}</p>
          <p className="file-sport">{state.file.activity.sport}</p>
        </div>
      )}

      {(state.status === 'empty' || state.status === 'error') && (
        <>
          {state.status === 'error' && (
            <p className="upload-error" role="alert">
              {state.message}
            </p>
          )}

          <label htmlFor={`${slot.id}-file`} className="form-label">
            Upload {slot.label} FIT File
          </label>
          <input
            type="file"
            className="form-control form-control-lg"
            id={`${slot.id}-file`}
            accept=".fit"
            onChange={handleFileInput}
          />

          {SAMPLE_FILES.length > 0 && (
            <>
              <span className="upload-or">or</span>
              <select
                className="form-control sample-select"
                aria-label={`Load a sample activity into ${slot.label}`}
                defaultValue=""
                onChange={handleSampleInput}
              >
                <option value="" disabled>
                  Load a sample activity...
                </option>
                {SAMPLE_FILES.map((sample) => (
                  <option key={sample.name} value={sample.name}>
                    {sample.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </>
      )}
    </div>
  )
}
