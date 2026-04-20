import './TopBar.css'
import type { ModeId } from '../routing/hashRoute'

interface TopBarProps {
  onResetCamera?: () => void
  onShare?: () => void
  onClear?: () => void
  shareLabel?: string
  modeId: ModeId
  onModeChange: (mode: ModeId) => void
}

export default function TopBar({ onResetCamera, onShare, onClear, shareLabel = 'Share', modeId, onModeChange }: TopBarProps) {
  return (
    <header className="topbar">
      <span className="topbar__title">Rust Naval Planner</span>
      <select
        className="topbar__mode"
        value={modeId}
        onChange={(e) => onModeChange(e.target.value as ModeId)}
      >
        <option value="boat">Boat</option>
        <option value="base">Base</option>
      </select>
      <div className="topbar__actions">
        <button className="topbar__btn" onClick={onResetCamera}>Reset Camera</button>
        <button className="topbar__btn" onClick={onShare}>{shareLabel}</button>
        <button className="topbar__btn topbar__btn--danger" onClick={onClear}>Clear</button>
      </div>
    </header>
  )
}
