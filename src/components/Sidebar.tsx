// src/components/Sidebar.tsx
import './Sidebar.css'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, PieceCategory } from '../types'
import { useStore } from '../store/useStore'

const config = piecesConfig as PiecesConfig

const CATEGORY_ORDER: PieceCategory[] = ['hull', 'structural', 'floor']
const CATEGORY_LABELS: Record<PieceCategory, string> = {
  hull: 'Hull',
  structural: 'Structural',
  floor: 'Floor',
  deployable: 'Deployable',
}

const FLOOR_LEVELS = [0, 1, 2] as const

export default function Sidebar() {
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const selectPieceType = useStore((s) => s.selectPieceType)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const setVisibleLevels = useStore((s) => s.setVisibleLevels)

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
      </div>
    </aside>
  )
}
