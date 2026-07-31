import { useState, useCallback } from 'react'
import './App.css'
import './components/FileUploadCard.css'
import './components/ActivityComparisonTable.css'
import './components/GraphCard.css'
import EChartsComponent from './components/EChartsComponent'
import BlandAltmanChart from './components/BlandAltmanChart'
import { useFitFileLoader } from './hooks/useFitFileLoader'
import { useGraphData } from './hooks/useGraphData'
import { useComparisonStats } from './hooks/useComparisonStats'
import type { FileData } from './types/fitTypes'

function App() {
  const [showComparison, setShowComparison] = useState(false)
  const [zoomIndex, setZoomIndex] = useState<{ startIndex: number; endIndex: number } | null>(null)

  const { data: file1Loaded, parseFile: parseFile1, loadSample: loadSample1, reset: resetFile1 } = useFitFileLoader()
  const { data: file2Loaded, parseFile: parseFile2, loadSample: loadSample2, reset: resetFile2 } = useFitFileLoader()

  const { combinedGraphData } = useGraphData(file1Loaded, file2Loaded)
  const { comparisonStats, blandAltmanStats, series1Name, series2Name, getDiffColor } = useComparisonStats(file1Loaded, file2Loaded, combinedGraphData)

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
        {showComparison && file1Loaded && file2Loaded ? (
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
                    laps={file1Loaded.activity.laps}
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

            {/* Buttons */}
            <div className="row">
              <div className="col-12 text-center">
                <button
                  className="btn btn-secondary mt-4"
                  onClick={() => {
                    setShowComparison(false)
                    resetFile1()
                    resetFile2()
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
              <div className="col-lg-6 mb-4">
                <UploadCard
                  label="File 1"
                  data={file1Loaded}
                  onFileChange={parseFile1}
                  onSampleChange={loadSample1}
                  sampleKey="fileInput1"
                />
              </div>

              <div className="col-lg-6 mb-4">
                <UploadCard
                  label="File 2"
                  data={file2Loaded}
                  onFileChange={parseFile2}
                  onSampleChange={loadSample2}
                  sampleKey="fileInput2"
                />
              </div>
            </div>

            {/* Compare Button */}
            <div className="row">
              <div className="col-12 text-center">
                <button
                  className="btn btn-primary btn-lg mt-4"
                  onClick={() => setShowComparison(true)}
                  disabled={!file1Loaded || !file2Loaded}
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

function UploadCard({ label, data, onFileChange, onSampleChange, sampleKey }: UploadCardProps) {
  const handleSampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = sampleList.find((s) => s.name === e.target.value)
    if (s) onSampleChange(s)
  }

  return (
    <div className="upload-card">
      <div className="upload-icon">&#128193;</div>
      <h4>{label}</h4>
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
