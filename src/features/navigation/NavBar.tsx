import './NavBar.css'

interface NavBarProps {
  title: string
  /** Absent at depth 0 (the landing screen) — undefined, not a disabled button. */
  onBack?: () => void
}

/**
 * The contextual app bar: back button on the left (when there's somewhere to
 * go back to), current location as the title.
 *
 * Presentational only — knows nothing about `Route`, so it renders on every
 * screen (the container decides whether `onBack` is present) rather than
 * conditionally mounting, which would make the layout jump.
 */
export function NavBar({ title, onBack }: NavBarProps) {
  return (
    <nav className="app-nav" aria-label="Screen navigation">
      {onBack && (
        <button type="button" className="app-nav-back" onClick={onBack} aria-label="Back">
          &#8592; Back
        </button>
      )}
      <h2 className="app-nav-title">{title}</h2>
    </nav>
  )
}
