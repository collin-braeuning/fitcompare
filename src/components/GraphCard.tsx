import type { ReactNode } from 'react'
import './GraphCard.css'

interface GraphCardProps {
  title: string
  /** Headline statistics shown beside the title — typically a `<StatBadge />`. */
  badge?: ReactNode
  /** Optional control on the right of the header, e.g. a reset button. */
  action?: ReactNode
  children: ReactNode
}

/** The titled panel every chart sits in. */
export function GraphCard({ title, badge, action, children }: GraphCardProps) {
  return (
    <div className="graph-card">
      <div className="graph-header">
        <h5>{title}</h5>
        {badge}
        {action}
      </div>
      {children}
    </div>
  )
}
