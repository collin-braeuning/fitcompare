import { FILE_SLOTS, type SampleFile, type SlotState } from '../fit-file'
import { FileUploadCard } from './FileUploadCard'

interface UploadViewProps {
  slotState: (slotId: string) => SlotState
  paceSourceId: string
  onSelectFile: (slotId: string, file: File) => void
  onSelectSample: (slotId: string, sample: SampleFile) => void
  onSetPaceSource: (slotId: string) => void
  onCompare: () => void
  /** Switches to the batch screen — comparing many activities across sessions, not just these two files. */
  onCompareMany: () => void
}

/** The landing screen: one card per upload slot, plus the compare actions. */
export function UploadView({
  slotState,
  paceSourceId,
  onSelectFile,
  onSelectSample,
  onSetPaceSource,
  onCompare,
  onCompareMany,
}: UploadViewProps) {
  const allSlotsLoaded = FILE_SLOTS.every((slot) => slotState(slot.id).status === 'loaded')

  return (
    <div className="upload-section">
      <div className="row">
        {FILE_SLOTS.map((slot) => (
          <div className="col-lg-6 mb-4" key={slot.id}>
            <FileUploadCard
              slot={slot}
              state={slotState(slot.id)}
              isPaceSource={paceSourceId === slot.id}
              onSelectFile={(file) => onSelectFile(slot.id, file)}
              onSelectSample={(sample) => onSelectSample(slot.id, sample)}
              onSetPaceSource={() => onSetPaceSource(slot.id)}
            />
          </div>
        ))}
      </div>

      <div className="row">
        <div className="col-12 text-center">
          <button
            className="btn btn-primary btn-lg mt-4"
            onClick={onCompare}
            disabled={!allSlotsLoaded}
          >
            Compare Activities
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-12 text-center">
          <button className="btn btn-secondary mt-4" onClick={onCompareMany}>
            Compare Many Activities
          </button>
        </div>
      </div>
    </div>
  )
}
