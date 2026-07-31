import type { ReactNode } from 'react'
import type { BatchAgreement, SessionAgreement } from './batchAgreement'
import { cccLabel, cccLevel, differenceLevel } from '../comparison/agreementScale'
import './BatchSessionTable.css'

interface ColumnDef {
  label: string
  value: (row: SessionAgreement) => ReactNode
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPercent(coverage: number | undefined): string {
  return coverage === undefined ? '—' : `${Math.round(coverage * 100)}%`
}

/**
 * Column definitions as data, in the spirit of `ActivityComparisonTable`'s
 * rows-as-data pattern — transposed here, since a batch has one row per
 * session rather than one column per file.
 */
function buildColumns(primaryName: string, secondaryName: string): ColumnDef[] {
  return [
    { label: 'Date', value: (row) => formatDate(row.date) },
    { label: 'Activity', value: (row) => row.activity },
    {
      label: 'Matched Seconds',
      value: (row) => {
        // `coverage` is always [primary, secondary] — `buildBatchAgreement`
        // intersects in that fixed order for every session.
        const [primaryCoverage, secondaryCoverage] = row.coverage
        return (
          <>
            <div>{row.matchedSeconds.toLocaleString()}</div>
            <div className="batch-table-detail">
              {primaryName} {formatPercent(primaryCoverage?.coverage)} · {secondaryName}{' '}
              {formatPercent(secondaryCoverage?.coverage)}
            </div>
          </>
        )
      },
    },
    {
      label: 'HR Range',
      value: (row) => `${row.hrRange.min}–${row.hrRange.max} bpm`,
    },
    {
      label: 'Bias',
      value: (row) =>
        row.blandAltman && (
          <span className={`batch-cell-${differenceLevel(Math.abs(row.blandAltman.meanDiff))}`}>
            {row.blandAltman.meanDiff.toFixed(1)} bpm
          </span>
        ),
    },
    {
      label: '95% LoA',
      value: (row) =>
        row.blandAltman &&
        `[${row.blandAltman.lowerLimit.toFixed(1)}, ${row.blandAltman.upperLimit.toFixed(1)}]`,
    },
    {
      label: 'Mean |Diff|',
      value: (row) => (
        <span className={`batch-cell-${differenceLevel(row.difference.avgAbsDiff)}`}>
          {row.difference.avgAbsDiff.toFixed(1)} bpm
        </span>
      ),
    },
    {
      label: 'Max |Diff|',
      value: (row) => `${row.difference.maxAbsDiff.toFixed(0)} bpm`,
    },
    {
      label: 'CCC',
      value: (row) =>
        row.concordance && (
          <span
            className={`batch-cell-${cccLevel(row.concordance.ccc)}`}
            title={cccLabel(row.concordance.ccc)}
          >
            {row.concordance.ccc.toFixed(3)}
          </span>
        ),
    },
  ]
}

function skipReasonLabel(reason: 'no-overlap' | 'too-few-points'): string {
  return reason === 'no-overlap'
    ? 'Skipped — no overlapping seconds between the two devices'
    : 'Skipped — too few matched seconds to compute agreement'
}

/**
 * One row per session's Bland-Altman/CCC numbers. A row that looks bad is a
 * prompt to open that pair in the existing 2-file comparison screen — this
 * table is for the overview, not the diagnosis.
 */
export function BatchSessionTable({ agreement }: { agreement: BatchAgreement }) {
  const columns = buildColumns(agreement.primaryName, agreement.secondaryName)

  return (
    <div className="batch-table-card">
      <table className="batch-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agreement.sessions.map((session) => (
            <tr key={session.sessionId}>
              {columns.map((column) => (
                <td key={column.label}>{column.value(session)}</td>
              ))}
            </tr>
          ))}
          {agreement.skipped.map((skipped) => (
            <tr key={skipped.sessionId} className="batch-table-row-skipped">
              <td>{formatDate(skipped.date)}</td>
              <td colSpan={columns.length - 1}>{skipReasonLabel(skipped.reason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
