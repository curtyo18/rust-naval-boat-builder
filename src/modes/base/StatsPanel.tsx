import './StatsPanel.css'
import { useStore } from '../../core/store/useStore'

export default function StatsPanel() {
  const pieces = useStore((s) => s.pieces)
  if (pieces.length === 0) return null

  return (
    <div className="base-stats">
      <div className="base-stats__section-header">Materials</div>
      <div className="base-stats__placeholder">(no pieces yet)</div>

      <div className="base-stats__section-header">Upkeep / 24h</div>
      <div className="base-stats__placeholder">(no pieces yet)</div>

      <div className="base-stats__section-header">Entry points</div>
      <div className="base-stats__placeholder">(none)</div>
    </div>
  )
}
