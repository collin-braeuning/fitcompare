import './StatBadge.css'

/**
 * How a figure is doing. Structurally identical to the comparison feature's
 * `AgreementLevel`, but declared here so this shared component stays
 * independent of any one feature.
 */
export type StatLevel = 'good' | 'warn' | 'bad'

export interface Stat {
  /** The headline figure, e.g. "Avg Diff: 3.2 bpm". */
  value: string
  /** Supporting detail shown smaller and greyed, e.g. "max 18 bpm". */
  detail?: string
  /** Drives the value's colour. Omit for a neutral figure. */
  level?: StatLevel
}

/**
 * The pill of headline numbers in a graph card's header.
 *
 * Data-driven rather than hand-written markup, so a card showing two stats
 * lays them out (with a divider between) identically to one showing a single
 * stat.
 */
export function StatBadge({ stats }: { stats: Stat[] }) {
  return (
    <div className="stat-badge">
      {stats.map((stat, index) => (
        <div className="stat-badge-item" key={stat.value}>
          {index > 0 && <span className="stat-badge-divider" />}
          <span className={`stat-badge-value ${stat.level ? `stat-${stat.level}` : ''}`}>
            {stat.value}
          </span>
          {stat.detail && <span className="stat-badge-detail">{stat.detail}</span>}
        </div>
      ))}
    </div>
  )
}
