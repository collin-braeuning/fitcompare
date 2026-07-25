import { useState, useRef, useEffect } from 'react'
import './App.css'
import FitParser from 'fit-file-parser'
import { parseFitData, type SimplifiedFitData, type SimplifiedActivity, type SimplifiedLapRecord } from './utils/fitDataParser'
import * as echarts from 'echarts'

const sampleUrls = import.meta.glob('/data/*.{fit,FIT}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const SAMPLES = Object.entries(sampleUrls).map(([path, url]) => ({
  name: path.split('/').pop()!.replace(/\.[^/.]+$/, ''),
    url,
}))

interface FileData {
  fileName: string
  activity: SimplifiedActivity
}

interface GraphDataPoint {
  timestamp: string
  [key: string]: string | number
}

interface EChartsComponentProps {
  data: GraphDataPoint[]
  zoomIndex: { startIndex: number; endIndex: number } | null
  onZoomChange: (range: { startIndex: number; endIndex: number } | null) => void
}

const EChartsComponent: React.FC<EChartsComponentProps> = ({
  data,
  zoomIndex,
  onZoomChange,
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return

    // Initialize chart
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, 'dark')
    }

    const chart = chartInstanceRef.current

    //
    //
    //
    //
    const seriesNameSet = new Set<string>()
    data.forEach((d) => {
      Object.keys(d).forEach((key) => {
        if (key !== 'timestamp') {
          seriesNameSet.add(key)
        }
      })
    })
    const seriesNames: string[] = Array.from(seriesNameSet)

    console.log('ECharts Data Debug:', {
      dataLength: data.length,
      seriesNames,
      firstDataPoint: data[0],
    })

    // Validate data
    if (seriesNames.length === 0 || data.length === 0) {
      console.warn('No data to render:', { seriesNames, dataLength: data.length })
      return
    }

    // Transform data for ECharts
    const timestamps = data.map((d) => new Date(d.timestamp).toLocaleTimeString())
    const seriesData = seriesNames.map((name) => data.map((d) => d[name] || null))

    console.log('Series Data Lengths:', seriesData.map((s) => s.length))

    // Build chart options
    const options: echarts.EChartsOption = {
      backgroundColor: 'rgba(10, 14, 39, 0)',
      textStyle: {
        color: '#bbb',
      },
      grid: {
        top: '12%',
        left: '5%',
        right: '5%',
        bottom: '25%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1a1f3a',
        borderColor: '#ff6b35',
        borderWidth: 2,
        textStyle: {
          color: '#fff',
        },
      },
      legend: {
        data: seriesNames,
        textStyle: {
          color: '#bbb',
        },
        bottom: 50,
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLine: {
          lineStyle: {
            color: '#444',
          },
        },
        axisLabel: {
          color: '#bbb',
          interval: Math.max(0, Math.floor(data.length / 12)),
          rotate: -45,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Heart Rate (bpm)',
        nameTextStyle: {
          color: '#bbb',
          fontSize: 12,
        },
        nameLocation: 'middle',
        nameGap: 40,
        axisLine: {
          lineStyle: {
            color: '#444',
          },
        },
        axisLabel: {
          color: '#bbb',
        },
        splitLine: {
          lineStyle: {
            color: '#333',
          },
        },
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          start: zoomIndex ? (zoomIndex.startIndex / data.length) * 100 : 0,
          end: zoomIndex ? ((zoomIndex.endIndex + 1) / data.length) * 100 : 100,
          textStyle: {
            color: '#bbb',
          },
          bottom: 20,
        },
        {
          type: 'inside',
          start: zoomIndex ? (zoomIndex.startIndex / data.length) * 100 : 0,
          end: zoomIndex ? ((zoomIndex.endIndex + 1) / data.length) * 100 : 100,
        },
      ],
      series: seriesNames.map((name, index) => ({
        name,
        type: 'line',
        data: seriesData[index],
        lineStyle: {
          color: index === 0 ? '#ff6b35' : '#3498db',
          width: 2,
        },
        smooth: false,
        symbol: 'none',
        sampling: 'lttb',
        connectNulls: true,
      })),
    }

    chart.setOption(options)

    // Handle zoom events
    const handleDataZoom = () => {
      const option = chart.getOption() as echarts.EChartsOption
      const dataZoomOption = (option.dataZoom as echarts.DataZoomComponentOption[]) || []

      if (dataZoomOption.length > 0) {
        const start = (dataZoomOption[0].start as number) || 0
        const end = (dataZoomOption[0].end as number) || 100

        const startIndex = Math.floor((start / 100) * data.length)
        const endIndex = Math.floor((end / 100) * data.length) - 1

        if (startIndex === 0 && endIndex === data.length - 1) {
          onZoomChange(null)
        } else {
          onZoomChange({ startIndex, endIndex })
        }
      }
    }

    chart.on('datazoom', handleDataZoom)

    // Handle window resize
    const handleResize = () => {
      chart.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.off('datazoom', handleDataZoom)
    }
  }, [data, zoomIndex, onZoomChange])

  return <div ref={chartRef} className="echarts-container" />
}

function App() {
  const [file1Data, setFile1Data] = useState<FileData | null>(null)
  const [file2Data, setFile2Data] = useState<FileData | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [zoomIndex, setZoomIndex] = useState<{ startIndex: number; endIndex: number } | null>(null)

  const loadActivity = (buffer: ArraryBuffer, name: string, setData: (data: FileData) => void) => {
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'celsius',
      pressureUnit: 'bar',
      elapsedRecordField: true,
      mode: 'cascade',
    })

    fitParser.parse(buffer, (error: Error | null, data: unknown) => {
      if (error) {
        console.error('Error parsing FIT file:', error)
        alert(`Error parsing file: ${error.message}`)
      } else {
        try {
          const simplifiedData: SimplifiedFitData = parseFitData(data)
          if (simplifiedData.activities.length > 0) {
            setData({
              fileName: name.replace(/\.[^/.]+$/, ''),
              activity: simplifiedData.activities[0],
            })
          }
        } catch (parseError) {
          console.error('Error parsing simplified FIT data:', parseError)
          alert('Error processing FIT data')
        }
      }
    })
  }
  
  const parseFile = (file: File, setData: (data: FileData) => void) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      loadActivity(e.target?.result as ArrayBuffer, file.name, setData)
    }
    reader.readAsArraryBuffer(file)
  }

  const loadSample = (sample: { name: string; url: string }, setData: (data: FileData) => void) => {
    fetch(sample.url)
      .then((r) => r.arrayBuffer())
      .then((buf) => loadActivity(buf, sample.name, setData))
      .catch((er) => {
        console.error('Error loading sample: ', err)
        alert('Error laoding sample file')
      })
  }

  const handleFile1Upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      parseFile(file, setFile1Data)
    }
  }

  const handleFile2Upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      parseFile(file, setFile2Data)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getFileName = (name: string) => {
    return name.replace(/\.[^/.]+$/, '')
  }

  const getCombinedGraphData = (): GraphDataPoint[] => {
    if (!file1Data || !file2Data) return []

    const file1Name = getFileName(file1Data.fileName)
    const file2Name = getFileName(file2Data.fileName)
    
    // Create unique series names - if names are identical, append (1) and (2)
    const series1Name = file1Name === file2Name ? `${file1Name} (1)` : file1Name
    const series2Name = file1Name === file2Name ? `${file2Name} (2)` : file2Name
    
    const dataMap = new Map<number, GraphDataPoint>()

    const mergeRecords = (records: SimplifiedLapRecord[], seriesName: string) => {
      records.forEach((record) => {
        const secondKey = Math.round(new Date(record.timestamp).getTime() / 1000)
        let point = dataMap.get(secondKey)
        if (!point) {
          point = { timestamp: new Date(secondKey * 1000).toISOString() }
          dataMap.set(secondKey, point)
        }
        point[seriesName] = record.heartRate || 0
      })
    }
    
    mergeRecords(file1Data.activity.records, series1Name)
    mergeRecords(file2Data.activity.records, series2Name)

    const allData = Array.from(dataMap.entries())
      .sort((a,b) => a[0] - b[0])
      .map(([, point]) => point)
  
      return allData
  }

  const handleZoomChange = (range: { startIndex: number; endIndex: number } | null) => {
    setZoomIndex(range)
  }

  const resetZoom = () => {
    setZoomIndex(null)
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
                    {zoomIndex && (
                      <button className="btn btn-small btn-reset" onClick={resetZoom}>
                        Reset Zoom
                      </button>
                    )}
                  </div>
                  <div className="graph-instructions">
                    {!zoomIndex ? (
                      <p>📍 Drag to select an area on the graph to zoom in | Scroll to zoom | Click reset to see full range</p>
                    ) : (
                      <p>🔍 Zoomed view | Click "Reset Zoom" to see full range</p>
                    )}
                  </div>
                  <EChartsComponent
                    data={getCombinedGraphData()}
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
                <div className="upload-card">
                  <div className="upload-icon">📁</div>
                  <h4>File 1</h4>
                  {file1Data ? (
                    <div className="file-info">
                      <p className="file-name">✓ {file1Data.fileName}</p>
                      <p className="file-sport">{file1Data.activity.sport}</p>
                    </div>
                  ) : (
                    <>
                      <label htmlFor="fileInput1" className="form-label">
                        Upload First FIT File
                      </label>
                      <input
                        type="file"
                        className="form-control form-control-lg"
                        id="fileInput1"
                        onChange={handleFile1Upload}
                        accept=".fit"
                      />
                      {SAMPLES.length > 0 && (
                        <>
                          <span className="upload-or">or</span>
                          <select 
                            className="form-control sample-select"
                            defaultValue=""
                            onChange={(e) => {
                              const s = SAMPLES.find((s) => s.name === e.target.value)
                              if (s) loadSample(s, setFile1Data)
                            }}
                        >
                            <option value="" disabled>Load a sample activity...</option>
                            {SAMPLES.map((s) => (
                              <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="col-lg-6 mb-4">
                <div className="upload-card">
                  <div className="upload-icon">📁</div>
                  <h4>File 2</h4>
                  {file2Data ? (
                    <div className="file-info">
                      <p className="file-name">✓ {file2Data.fileName}</p>
                      <p className="file-sport">{file2Data.activity.sport}</p>
                    </div>
                  ) : (
                    <>
                      <label htmlFor="fileInput2" className="form-label">
                        Upload Second FIT File
                      </label>
                      <input
                        type="file"
                        className="form-control form-control-lg"
                        id="fileInput2"
                        onChange={handleFile2Upload}
                        accept=".fit"
                      />
                      {SAMPLES.length > 0 && (
                        <>
                          <span className="upload-or">or</span>
                          <select 
                            className="form-control sample-select"
                            defaultValue=""
                            onChange={(e) => {
                              const s = SAMPLES.find((s) => s.name === e.target.value)
                              if (s) loadSample(s, setFile2Data)
                            }}
                        >
                            <option value="" disabled>Load a sample activity...</option>
                            {SAMPLES.map((s) => (
                              <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </>
                      )}
                    </>
                  )}
                </div>
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

export default App