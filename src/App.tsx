import { useState, useCallback, useMemo } from 'react'
import './App.css'
import './components/FileUploadCard.css'
import './components/ActivityComparisonTable.css'
import './components/GraphCard.css'
import EChartsComponent from './components/EChartsComponent'
import BlandAltmanChart from './components/BlandAltmanChart'
import ConcordanceChart from './components/ConcordanceChart'
import { useMultiFitFileLoader } from './hooks/useFitFileLoader'
import { useGraphData, type GraphFileInput } from './hooks/useGraphData'
import { useComparisonStats } from './hooks/useComparisonStats'
import { FILE_SLOTS } from './constants/fileSlots'
import type { FileData } from './types/fitTypes'

// The pairwise comparison view (table, Bland-Altman, CCC) is inherently a
// two-way comparison — Lin's CCC and Bland-Altman agreement aren't defined
// for more than two series. It always compares the first two slots.
const [primarySlot, secondarySlot] = FILE_SLOTS

function App() {
  const [showComparison, setShowComparison] = useState(false)
  const [zoomIndex, setZoomIndex] = useState<{ startIndex: number; endIndex: number } | null>(null)
  const [paceSourceId, setPaceSourceId] = useState<string>(FILE_SLOTS[0].id)

  const { filesById, parseFile, loadSample, resetAll } = useMultiFitFileLoader()

  const file1Loaded = filesById[primarySlot.id] ?? null
  const file2Loaded = filesById[secondarySlot.id] ?? null
  const paceSourceFile = filesById[paceSourceId] ?? null

  const graphFiles = useMemo<GraphFileInput[]>(
    () => FILE_SLOTS.map((slot) => ({ id: slot.id, data: filesById[slot.id] ?? null })),
    [filesById],
  )

  const { combinedGraphData, seriesNameById } = useGraphData(graphFiles, paceSourceId)
  const {
    comparisonStats,
    blandAltmanStats,
    concordanceStats,
    series1Name,
    series2Name,
    getDiffColor,
    getCccColor,
    getCccLabel,
  } = useComparisonStats(primarySlot.id, secondarySlot.id, seriesNameById, combinedGraphData)

  const handleZoomChange = useCallback((range: { startIndex: number; endIndex: number } | null) => {
    setZoomIndex(range)
  }, [])

  const resetZoom = () => {
    setZoomIndex(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <>
      {/* Header */}
      <header className="fitcompare-header">
        <h1>FitCompare</h1>
      </header>

      {/* Main Content */}
      <div className="container main-content">
        {showComparison && file1Loaded && file2Loaded && paceSourceFile ? (
          // Comparison View
          <div className="comparison-view">
            {/* Activity Panels */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="comparison-table-card">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th className="label-column">Metric</th>
                        <th className="data-column">{file1Loaded.fileName}</th>
                        <th className="data-column">{file2Loaded.fileName}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="label-cell">Sport</td>
                        <td className="data-cell">{file1Loaded.activity.sport}</td>
                        <td className="data-cell">{file2Loaded.activity.sport}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Sub Sport</td>
                        <td className="data-cell">{file1Loaded.activity.subSport}</td>
                        <td className="data-cell">{file2Loaded.activity.subSport}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Average Heart Rate (bpm)</td>
                        <td className="data-cell">{file1Loaded.activity.avgHeartRate}</td>
                        <td className="data-cell">{file2Loaded.activity.avgHeartRate}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Max Heart Rate (bpm)</td>
                        <td className="data-cell">{file1Loaded.activity.maxHeartRate}</td>
                        <td className="data-cell">{file2Loaded.activity.maxHeartRate}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Start Time</td>
                        <td className="data-cell">{formatDate(file1Loaded.activity.startTime)}</td>
                        <td className="data-cell">{formatDate(file2Loaded.activity.startTime)}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">End Time</td>
                        <td className="data-cell">{formatDate(file1Loaded.activity.timestamp)}</td>
                        <td className="data-cell">{formatDate(file2Loaded.activity.timestamp)}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Total Records</td>
                        <td className="data-cell">{file1Loaded.activity.records.length}</td>
                        <td className="data-cell">{file2Loaded.activity.records.length}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Avg Pace (min/mi)</td>
                        <td className="data-cell">
                          {computeAvgPace(file1Loaded.activity.records)}
                        </td>
                        <td className="data-cell">
                          {computeAvgPace(file2Loaded.activity.records)}
                        </td>
                      </tr>
                      <tr>
                        <td className="label-cell">Laps</td>
                        <td className="data-cell">{file1Loaded.activity.laps.length}</td>
                        <td className="data-cell">{file2Loaded.activity.laps.length}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Combined Graph */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="graph-card">
                  <div className="graph-header">
                    <h5>Heart Rate Comparison</h5>
                    {comparisonStats && (
                      <div className="comparison-badge">
                        <span className={`comparison-badge-value ${getDiffColor(comparisonStats.avgAbsDiff)}`}>
                          Avg Diff: {comparisonStats.avgAbsDiff.toFixed(1)} bpm
                        </span>
                        <span className="comparison-badge-detail">
                          max {comparisonStats.maxAbsDiff.toFixed(0)} bpm
                        </span>
                        {concordanceStats && (
                          <>
                            <span className="comparison-badge-divider" />
                            <span className={`comparison-badge-value ${getCccColor(concordanceStats.ccc)}`}>
                              CCC: {concordanceStats.ccc.toFixed(2)}
                            </span>
                            <span className="comparison-badge-detail">
                              {getCccLabel(concordanceStats.ccc)}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {zoomIndex && (
                      <button className="btn btn-small btn-reset" onClick={resetZoom}>
                        Reset Zoom
                      </button>
                    )}
                  </div>
                  <EChartsComponent
                    data={combinedGraphData}
                    zoomIndex={zoomIndex}
                    onZoomChange={handleZoomChange}
                    laps={paceSourceFile.activity.laps}
                  />
                </div>
              </div>
            </div>

            {/* Bland-Altman Agreement Plot */}
            {blandAltmanStats && series1Name && series2Name && (
              <div className="row mb-4">
                <div className="col-12">
                  <div className="graph-card">
                    <div className="graph-header">
                      <h5>Bland-Altman Agreement</h5>
                      <div className="comparison-badge">
                        <span className={`comparison-badge-value ${getDiffColor(Math.abs(blandAltmanStats.meanDiff))}`}>
                          Bias: {blandAltmanStats.meanDiff.toFixed(1)} bpm
                        </span>
                        <span className="comparison-badge-detail">
                          95% LoA [{blandAltmanStats.lowerLimit.toFixed(1)}, {blandAltmanStats.upperLimit.toFixed(1)}]
                        </span>
                      </div>
                    </div>
                    <BlandAltmanChart
                      stats={blandAltmanStats}
                      series1Name={series1Name}
                      series2Name={series2Name}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Concordance Plot (Lin's CCC) */}
            {concordanceStats && series1Name && series2Name && (
              <div className="row mb-4">
                <div className="col-12">
                  <div className="graph-card">
                    <div className="graph-header">
                      <h5>Lin's Concordance Correlation Coefficient</h5>
                      <div className="comparison-badge">
                        <span className={`comparison-badge-value ${getCccColor(concordanceStats.ccc)}`}>
                          CCC: {concordanceStats.ccc.toFixed(2)}
                        </span>
                        <span className="comparison-badge-detail">
                          {getCccLabel(concordanceStats.ccc)}
                        </span>
                      </div>
                    </div>
                    <ConcordanceChart
                      stats={concordanceStats}
                      series1Name={series1Name}
                      series2Name={series2Name}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="row">
              <div className="col-12 text-center">
                <button
                  className="btn btn-secondary mt-4"
                  onClick={() => {
                    setShowComparison(false)
                    resetAll()
                    setPaceSourceId(FILE_SLOTS[0].id)
                  }}
                >
                  Upload Different Files
                </button>
              </div>
            </div>
          </div>
        ) : (
          // File Upload Section
          <div className="upload-section">
            <div className="row">
              {FILE_SLOTS.map((slot) => (
                <div className="col-lg-6 mb-4" key={slot.id}>
                  <UploadCard
                    label={slot.label}
                    data={filesById[slot.id] ?? null}
                    onFileChange={(file) => parseFile(slot.id, file)}
                    onSampleChange={(sample) => loadSample(slot.id, sample)}
                    sampleKey={slot.id}
                    isPaceSource={paceSourceId === slot.id}
                    onSetPaceSource={() => setPaceSourceId(slot.id)}
                  />
                </div>
              ))}
            </div>

            {/* Compare Button */}
            <div className="row">
              <div className="col-12 text-center">
                <button
                  className="btn btn-primary btn-lg mt-4"
                  onClick={() => setShowComparison(true)}
                  disabled={FILE_SLOTS.some((slot) => !filesById[slot.id])}
                >
                  Compare Activities
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Inline UploadCard component (defined here to avoid extra file, uses its own CSS)
interface UploadCardProps {
  label: string
  data: FileData | null
  onFileChange: (file: File) => void
  onSampleChange: (sample: { name: string; url: string }) => void
  sampleKey: string
  isPaceSource: boolean
  onSetPaceSource: () => void
}

/** Compute average pace (min/mi) from speed records (km/h). */
function computeAvgPace(records: Array<{ speed: number | null }>): string {
  let totalPace = 0
  let count = 0
  for (const r of records) {
    if (r.speed && r.speed > 0) {
      totalPace += (60 / r.speed) * 1.609344
      count++
    }
  }
  if (count === 0) return '—'
  const avg = totalPace / count
  const mins = Math.floor(avg)
  const secs = Math.round((avg - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const SAMPLES = import.meta.glob('/data/*.{fit,FIT}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const sampleList = Object.entries(SAMPLES)
  .map(([path, url]) => ({
    name: path.split('/').pop()!.replace(/\.[^/.]+$/, ''),
    url,
  }))
  .sort((a, b) => b.name.localeCompare(a.name))

function UploadCard({ label, data, onFileChange, onSampleChange, sampleKey, isPaceSource, onSetPaceSource }: UploadCardProps) {
  const handleSampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = sampleList.find((s) => s.name === e.target.value)
    if (s) onSampleChange(s)
  }

  return (
    <div className="upload-card">
      <div className="upload-icon">&#128193;</div>
      <h4>{label}</h4>
      <label className="pace-source-toggle" htmlFor={`${sampleKey}-pace-source`}>
        <input
          type="checkbox"
          id={`${sampleKey}-pace-source`}
          checked={isPaceSource}
          onChange={onSetPaceSource}
        />
        Use for lap &amp; pace data
      </label>
      {data ? (
        <div className="file-info">
          <p className="file-name">&#10003; {data.fileName}</p>
          <p className="file-sport">{data.activity.sport}</p>
        </div>
      ) : (
        <>
          <label htmlFor={sampleKey} className="form-label">
            Upload {label} FIT File
          </label>
          <input
            type="file"
            className="form-control form-control-lg"
            id={sampleKey}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileChange(file)
            }}
            accept=".fit"
          />
          {sampleList.length > 0 && (
            <>
              <span className="upload-or">or</span>
              <select
                className="form-control sample-select"
                defaultValue=""
                onChange={handleSampleChange}
              >
                <option value="" disabled>Load a sample activity...</option>
                {sampleList.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App
