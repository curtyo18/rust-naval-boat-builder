// src/core/ui/Sidebar.tsx
import './Sidebar.css'
import type { PieceCategory } from '../types'
import { useStore } from '../store/useStore'
import { useMode } from '../context/ModeContext'

const CATEGORY_ORDER: PieceCategory[] = ['hull', 'structural', 'floor']
const CATEGORY_LABELS: Record<PieceCategory, string> = {
  hull: 'Hull',
  structural: 'Structural',
  floor: 'Floor',
  deployable: 'Deployable',
}

const FLOOR_LEVELS = [0, 1, 2] as const

export default function Sidebar() {
  const config = useMode().pieces
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const selectPieceType = useStore((s) => s.selectPieceType)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const setVisibleLevels = useStore((s) => s.setVisibleLevels)
  const transparentPieces = useStore((s) => s.transparentPieces)
  const setTransparentPieces = useStore((s) => s.setTransparentPieces)
  const showGrid = useStore((s) => s.showGrid)
  const setShowGrid = useStore((s) => s.setShowGrid)

  const piecesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    pieces: Object.entries(config).filter(([, v]) => v.category === cat),
  }))

  function handlePieceClick(type: string) {
    selectPieceType(selectedPieceType === type ? null : type)
  }

  function handleFloorToggle(level: 0 | 1 | 2) {
    const next = new Set(visibleLevels)
    if (next.has(level)) {
      next.delete(level)
    } else {
      next.add(level)
    }
    setVisibleLevels(next)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__pieces">
        {piecesByCategory.map(({ category, pieces }) =>
          pieces.length === 0 ? null : (
            <div key={category} className="sidebar__group">
              <div className="sidebar__group-label">{CATEGORY_LABELS[category]}</div>
              {pieces.map(([type, cfg]) => (
                <button
                  key={type}
                  className={`sidebar__piece ${selectedPieceType === type ? 'sidebar__piece--active' : ''}`}
                  onClick={() => handlePieceClick(type)}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          )
        )}
      </div>

      <div className="sidebar__display">
        <div className="sidebar__group-label">Display</div>
        <label className="sidebar__toggle">
          <input
            type="checkbox"
            checked={transparentPieces}
            onChange={(e) => setTransparentPieces(e.target.checked)}
          />
          Transparency
        </label>
        <label className="sidebar__toggle">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          Grid Lines
        </label>
      </div>

      <div className="sidebar__floors">
        <div className="sidebar__group-label">Floors</div>
        <div className="sidebar__floor-toggles">
          {FLOOR_LEVELS.map((level) => (
            <button
              key={level}
              className={`sidebar__floor-btn ${visibleLevels.has(level) ? 'sidebar__floor-btn--active' : ''}`}
              onClick={() => handleFloorToggle(level)}
            >
              {level}
            </button>
          ))}
        </div>
        {visibleLevels.has(2) && (
          <div className="sidebar__floor-hint">
            Trouble placing? Try hiding floor 2.
          </div>
        )}
      </div>
    </aside>
  )
}
