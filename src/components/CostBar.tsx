// src/components/CostBar.tsx
import './CostBar.css'
import { useStore } from '../store/useStore'
import { computeTotalCosts } from '../utils/costs'
import { MATERIAL_LABELS } from '../types'
import type { MaterialKey, PiecesConfig } from '../types'
import piecesConfig from '../data/pieces-config.json'

const config = piecesConfig as PiecesConfig

const MATERIAL_ORDER: MaterialKey[] = ['wood', 'lowGrade', 'metalFragments', 'tarp', 'highQualityMetal', 'gears']

export default function CostBar() {
  const pieces = useStore((s) => s.pieces)
  const totals = computeTotalCosts(pieces, config)
  const activeMaterials = MATERIAL_ORDER.filter((m) => (totals[m] ?? 0) > 0)

  return (
    <footer className="costbar">
      {activeMaterials.length === 0 ? (
        <span className="costbar__empty">Place pieces to see material costs</span>
      ) : (
        activeMaterials.map((mat) => (
          <span key={mat} className="costbar__item">
            <span className="costbar__label">{MATERIAL_LABELS[mat]}:</span>
            <span className="costbar__value">{(totals[mat] ?? 0).toLocaleString()}</span>
          </span>
        ))
      )}
    </footer>
  )
}
