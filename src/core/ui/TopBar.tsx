import './TopBar.css'

interface TopBarProps {
  onResetCamera?: () => void
  onShare?: () => void
  onClear?: () => void
  shareLabel?: string
}

export default function TopBar({ onResetCamera, onShare, onClear, shareLabel = 'Share' }: TopBarProps) {
  return (
    <header className="topbar">
      <span className="topbar__title">Rust Naval Planner</span>
      <div className="topbar__actions">
        <button className="topbar__btn" onClick={onResetCamera}>Reset Camera</button>
        <button className="topbar__btn" onClick={onShare}>{shareLabel}</button>
        <button className="topbar__btn topbar__btn--danger" onClick={onClear}>Clear</button>
      </div>
    </header>
  )
}
