import './CostWidget.css'
import { useStore } from '../store/useStore'
import { computeTotalCosts } from '../utils/costs'
import type { MaterialKey, PiecesConfig } from '../types'
import piecesConfig from '../data/pieces-config.json'

const config = piecesConfig as PiecesConfig

const MATERIAL_ORDER: MaterialKey[] = ['wood', 'lowGrade', 'metalFragments', 'tarp', 'highQualityMetal', 'gears']

const MATERIAL_SHORT_LABELS: Record<MaterialKey, string> = {
  wood: 'Wood',
  lowGrade: 'Low Grade',
  metalFragments: 'Metal Frags',
  tarp: 'Tarp',
  highQualityMetal: 'HQM',
  gears: 'Gears',
}

function MaterialIcon({ material }: { material: MaterialKey }) {
  switch (material) {
    case 'wood':
      return (
        <svg viewBox="0 0 24 24" className="cost-icon cost-icon--wood">
          <ellipse cx="12" cy="12" rx="5" ry="8" fill="#8b5e3c" stroke="#6b3f1c" strokeWidth="1" />
          <ellipse cx="12" cy="12" rx="3" ry="5.5" fill="none" stroke="#a0714e" strokeWidth="0.6" />
          <ellipse cx="12" cy="12" rx="1.2" ry="2.5" fill="none" stroke="#a0714e" strokeWidth="0.4" />
          <circle cx="11" cy="10" r="0.4" fill="#6b3f1c" />
          <circle cx="13" cy="13.5" r="0.3" fill="#6b3f1c" />
        </svg>
      )
    case 'lowGrade':
      return (
        <svg viewBox="0 0 24 24" className="cost-icon cost-icon--lowgrade">
          <rect x="8" y="6" width="8" height="12" rx="1" fill="#c85a30" stroke="#8b3a1a" strokeWidth="0.8" />
          <rect x="10.5" y="4" width="3" height="3" rx="0.5" fill="#d06838" stroke="#8b3a1a" strokeWidth="0.6" />
          <rect x="9.5" y="9" width="5" height="3" rx="0.3" fill="#e07848" />
          <path d="M12 9.5 L13 11.5 L11 11.5 Z" fill="#f5c040" />
        </svg>
      )
    case 'metalFragments':
      return (
        <svg viewBox="0 0 24 24" className="cost-icon cost-icon--metal">
          <polygon points="8,16 10,8 14,6 16,10 18,8 15,18 11,17" fill="#9a9a9a" stroke="#666" strokeWidth="0.6" />
          <polygon points="6,14 8,10 11,12 9,17" fill="#aaa" stroke="#666" strokeWidth="0.6" />
          <line x1="9" y1="9" x2="13" y2="11" stroke="#bbb" strokeWidth="0.4" />
        </svg>
      )
    case 'tarp':
      return (
        <svg viewBox="0 0 24 24" className="cost-icon cost-icon--tarp">
          <path d="M6 8 Q12 5 18 8 Q17 12 18 16 Q12 19 6 16 Q7 12 6 8 Z" fill="#7a9a60" stroke="#4a6a30" strokeWidth="0.8" />
          <line x1="8" y1="9" x2="16" y2="9" stroke="#5a7a40" strokeWidth="0.3" />
          <line x1="7" y1="12" x2="17" y2="12" stroke="#5a7a40" strokeWidth="0.3" />
          <line x1="8" y1="15" x2="16" y2="15" stroke="#5a7a40" strokeWidth="0.3" />
        </svg>
      )
    case 'highQualityMetal':
      return (
        <svg viewBox="0 0 24 24" className="cost-icon cost-icon--hqm">
          <rect x="7" y="9" width="10" height="7" rx="0.5" fill="#4a8ab0" stroke="#2a5a80" strokeWidth="0.8" />
          <rect x="8" y="10" width="8" height="5" rx="0.3" fill="#5a9ac0" />
          <line x1="8.5" y1="11.5" x2="15.5" y2="11.5" stroke="#6aaad0" strokeWidth="0.5" />
          <line x1="8.5" y1="13.5" x2="15.5" y2="13.5" stroke="#6aaad0" strokeWidth="0.5" />
        </svg>
      )
    case 'gears':
      return (
        <svg viewBox="0 0 24 24" className="cost-icon cost-icon--gears">
          <circle cx="12" cy="12" r="4" fill="#888" stroke="#555" strokeWidth="0.8" />
          <circle cx="12" cy="12" r="1.5" fill="#666" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180
            const x1 = 12 + 3.5 * Math.cos(rad)
            const y1 = 12 + 3.5 * Math.sin(rad)
            const x2 = 12 + 5.5 * Math.cos(rad)
            const y2 = 12 + 5.5 * Math.sin(rad)
            return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#888" strokeWidth="2" strokeLinecap="round" />
          })}
        </svg>
      )
  }
}

export default function CostWidget() {
  const pieces = useStore((s) => s.pieces)
  const totals = computeTotalCosts(pieces, config)
  const activeMaterials = MATERIAL_ORDER.filter((m) => (totals[m] ?? 0) > 0)

  if (activeMaterials.length === 0) return null

  return (
    <div className="cost-widget">
      {activeMaterials.map((mat) => (
        <div key={mat} className="cost-widget__item">
          <MaterialIcon material={mat} />
          <span className="cost-widget__amount">{(totals[mat] ?? 0).toLocaleString()}</span>
          <span className="cost-widget__label">{MATERIAL_SHORT_LABELS[mat]}</span>
        </div>
      ))}
    </div>
  )
}
