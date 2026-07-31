import { useMemo, useState } from 'react'
import { BlandAltmanChart, ConcordanceChart, HeartRateChart, type ZoomRange } from '../../components/charts'
import { GraphCard } from '../../components/GraphCard'
import { StatBadge } from '../../components/StatBadge'
import { FILE_SLOTS, type LoadedFile } from '../fit-file'
import { ActivityComparisonTable } from './ActivityComparisonTable'
import { cccLabel, cccLevel, differenceLevel } from './agreementScale'
import { useComparisonData } from './useComparisonData'
import './ComparisonView.css'

interface ComparisonViewProps {
  loadedBySlot: Record<string, LoadedFile>
  /** The file whose laps and pace are overlaid on the heart rate chart. */
  paceSource: LoadedFile
  paceSourceId: string
}

/** The results screen: summary table plus the three agreement charts. */
export function ComparisonView({ loadedBySlot, paceSource, paceSourceId }: ComparisonViewProps) {
  // Zoom lives here rather than inside the chart so the card header can offer
  // a reset control; clearing it is what tells the chart to zoom back out.
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null)

  // Same order and slots as the table always compared — one derivation
  // instead of the caller handing over two correlated props that could drift.
  const files = useMemo(
    () => FILE_SLOTS.map((slot) => loadedBySlot[slot.id]).filter((file) => file !== undefined),
    [loadedBySlot],
  )

  const { chartData, summary } = useComparisonData(loadedBySlot, paceSourceId)

  const { difference, blandAltman, concordance } = summary ?? {}

  return (
    <div className="comparison-view">
      <div className="row mb-4">
        <div className="col-12">
          <ActivityComparisonTable files={files} />
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <GraphCard
            title="Heart Rate Comparison"
            badge={
              difference && (
                <StatBadge
                  stats={[
                    {
                      value: `Avg Diff: ${difference.avgAbsDiff.toFixed(1)} bpm`,
                      detail: `max ${difference.maxAbsDiff.toFixed(0)} bpm`,
                      level: differenceLevel(difference.avgAbsDiff),
                    },
                    ...(concordance
                      ? [
                          {
                            value: `CCC: ${concordance.ccc.toFixed(2)}`,
                            detail: cccLabel(concordance.ccc),
                            level: cccLevel(concordance.ccc),
                          },
                        ]
                      : []),
                  ]}
                />
              )
            }
            action={
              zoomRange && (
                <button className="btn btn-small btn-reset" onClick={() => setZoomRange(null)}>
                  Reset Zoom
                </button>
              )
            }
          >
            <HeartRateChart
              data={chartData}
              laps={paceSource.activity.laps}
              zoomRange={zoomRange}
              onZoomChange={setZoomRange}
            />
          </GraphCard>
        </div>
      </div>

      {summary && blandAltman && (
        <div className="row mb-4">
          <div className="col-12">
            <GraphCard
              title="Bland-Altman Agreement"
              badge={
                <StatBadge
                  stats={[
                    {
                      value: `Bias: ${blandAltman.meanDiff.toFixed(1)} bpm`,
                      detail: `95% LoA [${blandAltman.lowerLimit.toFixed(1)}, ${blandAltman.upperLimit.toFixed(1)}]`,
                      level: differenceLevel(Math.abs(blandAltman.meanDiff)),
                    },
                  ]}
                />
              }
            >
              <BlandAltmanChart
                stats={blandAltman}
                primaryName={summary.primaryName}
                secondaryName={summary.secondaryName}
              />
            </GraphCard>
          </div>
        </div>
      )}

      {summary && concordance && (
        <div className="row mb-4">
          <div className="col-12">
            <GraphCard
              title="Lin's Concordance Correlation Coefficient"
              badge={
                <StatBadge
                  stats={[
                    {
                      value: `CCC: ${concordance.ccc.toFixed(2)}`,
                      detail: cccLabel(concordance.ccc),
                      level: cccLevel(concordance.ccc),
                    },
                  ]}
                />
              }
            >
              <ConcordanceChart
                stats={concordance}
                primaryName={summary.primaryName}
                secondaryName={summary.secondaryName}
              />
            </GraphCard>
          </div>
        </div>
      )}
    </div>
  )
}
