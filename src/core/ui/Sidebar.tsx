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

export default function Sidebar() {
  const mode = useMode()
  const config = mode.pieces
  const pieces = useStore((s) => s.pieces)
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const selectPieceType = useStore((s) => s.selectPieceType)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const setVisibleLevels = useStore((s) => s.setVisibleLevels)
  const transparentPieces = useStore((s) => s.transparentPieces)
  const setTransparentPieces = useStore((s) => s.setTransparentPieces)
  const showGrid = useStore((s) => s.showGrid)
  const setShowGrid = useStore((s) => s.setShowGrid)
  const activeTier = useStore((s) => s.activeTier)
  const setActiveTier = useStore((s) => s.setActiveTier)

  const floorLevels: number[] = (() => {
    if (mode.maxFloors === 'dynamic') {
      const maxY = pieces.reduce((m, p) => Math.max(m, p.position.y), -1)
      const top = Math.max(0, maxY) + 1
      return Array.from({ length: top + 1 }, (_, i) => i)
    }
    return Array.from({ length: mode.maxFloors }, (_, i) => i)
  })()

  const piecesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    pieces: Object.entries(config).filter(([, v]) => v.category === cat),
  }))

  function handlePieceClick(type: string) {
    selectPieceType(selectedPieceType === type ? null : type)
  }

  function handleFloorToggle(level: number) {
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
      {mode.supportsTiers && (
        <div className="sidebar__group">
          <div className="sidebar__group-label">Tier</div>
          <select
            className="sidebar__tier"
            value={activeTier ?? mode.defaultTier ?? ''}
            onChange={(e) => setActiveTier(e.target.value || null)}
          >
            <option value="wood">Wood</option>
            <option value="stone">Stone</option>
            <option value="metal">Metal</option>
            <option value="hqm">HQM</option>
          </select>
        </div>
      )}
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
          {floorLevels.map((level) => (
            <button
              key={level}
              className={`sidebar__floor-btn ${visibleLevels.has(level) ? 'sidebar__floor-btn--active' : ''}`}
              onClick={() => handleFloorToggle(level)}
            >
              {level}
            </button>
          ))}
        </div>
        {typeof mode.maxFloors === 'number' && visibleLevels.has(mode.maxFloors - 1) && (
          <div className="sidebar__floor-hint">
            Trouble placing? Try hiding floor {mode.maxFloors - 1}.
          </div>
        )}
      </div>
    </aside>
  )
}
