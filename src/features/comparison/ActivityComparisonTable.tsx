import type { ReactNode } from 'react'
import type { LoadedFile } from '../fit-file'
import { averagePace } from '../../lib/pace'
import './ActivityComparisonTable.css'

interface MetricRow {
  label: string
  value: (file: LoadedFile) => ReactNode
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

/**
 * The table's rows as data rather than markup.
 *
 * Adding a metric is one entry here instead of a new `<tr>` with a `<td>` per
 * file — which also means the table stays correct if a third upload slot is
 * ever added.
 */
const METRIC_ROWS: MetricRow[] = [
  { label: 'Sport', value: (f) => f.activity.sport },
  { label: 'Sub Sport', value: (f) => f.activity.subSport },
  { label: 'Average Heart Rate (bpm)', value: (f) => f.activity.avgHeartRate },
  { label: 'Max Heart Rate (bpm)', value: (f) => f.activity.maxHeartRate },
  { label: 'Start Time', value: (f) => formatDate(f.activity.startTime) },
  { label: 'End Time', value: (f) => formatDate(f.activity.timestamp) },
  { label: 'Total Records', value: (f) => f.activity.records.length },
  { label: 'Avg Pace (min/mi)', value: (f) => averagePace(f.activity.records) },
  { label: 'Laps', value: (f) => f.activity.laps.length },
]

/** Side-by-side summary of each activity's headline numbers. */
export function ActivityComparisonTable({ files }: { files: LoadedFile[] }) {
  return (
    <div className="comparison-table-card">
      <table className="comparison-table">
        <thead>
          <tr>
            <th className="label-column">Metric</th>
            {files.map((file) => (
              <th className="data-column" key={file.fileName}>
                {file.fileName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRIC_ROWS.map((row) => (
            <tr key={row.label}>
              <td className="label-cell">{row.label}</td>
              {files.map((file) => (
                <td className="data-cell" key={file.fileName}>
                  {row.value(file)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
