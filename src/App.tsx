import { useState, useCallback } from 'react'
import './App.css'
import './components/FileUploadCard.css'
import './components/ActivityComparisonTable.css'
import './components/GraphCard.css'
import EChartsComponent from './components/EChartsComponent'
import { useFitFileLoader } from './hooks/useFitFileLoader'
import { useGraphData } from './hooks/useGraphData'
import { useCorrelation } from './hooks/useCorrelation'
import type { FileData } from './types/fitTypes'

function App() {
  const [file1Data, setFile1Data] = useState<FileData | null>(null)
  const [file2Data, setFile2Data] = useState<FileData | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [zoomIndex, setZoomIndex] = useState<{ startIndex: number; endIndex: number } | null>(null)

  const { data: file1Loaded, parseFile: parseFile1, loadSample: loadSample1, reset: resetFile1 } = useFitFileLoader()
  const { data: file2Loaded, parseFile: parseFile2, loadSample: loadSample2, reset: resetFile2 } = useFitFileLoader()

  // Sync loaded data with local state
  if (file1Loaded && file1Data !== file1Loaded) setFile1Data(file1Loaded)
  if (file2Loaded && file2Data !== file2Loaded) setFile2Data(file2Loaded)

  const { combinedGraphData } = useGraphData(file1Data, file2Data)
  const { correlationData, getCorrelationColor } = useCorrelation(file1Data, file2Data, combinedGraphData)

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
        {showComparison && file1Data && file2Data ? (
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
                        <th className="data-column">{file1Data.fileName}</th>
                        <th className="data-column">{file2Data.fileName}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="label-cell">Sport</td>
                        <td className="data-cell">{file1Data.activity.sport}</td>
                        <td className="data-cell">{file2Data.activity.sport}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Sub Sport</td>
                        <td className="data-cell">{file1Data.activity.subSport}</td>
                        <td className="data-cell">{file2Data.activity.subSport}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Average Heart Rate (bpm)</td>
                        <td className="data-cell">{file1Data.activity.avgHeartRate}</td>
                        <td className="data-cell">{file2Data.activity.avgHeartRate}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Max Heart Rate (bpm)</td>
                        <td className="data-cell">{file1Data.activity.maxHeartRate}</td>
                        <td className="data-cell">{file2Data.activity.maxHeartRate}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Start Time</td>
                        <td className="data-cell">{formatDate(file1Data.activity.startTime)}</td>
                        <td className="data-cell">{formatDate(file2Data.activity.startTime)}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">End Time</td>
                        <td className="data-cell">{formatDate(file1Data.activity.timestamp)}</td>
                        <td className="data-cell">{formatDate(file2Data.activity.timestamp)}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Total Records</td>
                        <td className="data-cell">{file1Data.activity.records.length}</td>
                        <td className="data-cell">{file2Data.activity.records.length}</td>
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
                    {correlationData && (
                      <div className="correlation-badge">
                        <span className={`correlation-badge-value ${getCorrelationColor(correlationData.r)}`}>
                          R = {correlationData.r.toFixed(3)}
                        </span>
                        <span className="correlation-badge-points">
                          ({correlationData.matchingPoints} pts)
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
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="row">
              <div className="col-12 text-center">
                <button
                  className="btn btn-secondary mt-4"
                  onClick={() => {
                    setFile1Data(null)
                    setFile2Data(null)
                    setShowComparison(false)
                    resetZoom()
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
                  data={file1Data}
                  onFileChange={parseFile1}
                  onSampleChange={loadSample1}
                  sampleKey="fileInput1"
                />
              </div>

              <div className="col-lg-6 mb-4">
                <UploadCard
                  label="File 2"
                  data={file2Data}
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
                  disabled={!file1Data || !file2Data}
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
