import './StatsPanel.css'
import { useStore } from '../../core/store/useStore'
import { useMode } from '../../core/context/ModeContext'
import { computeBaseMaterials, computeBaseUpkeep, countEntryPieces } from './computeStats'
import { ENTRY_PIECE_LABELS } from './constants'
import { MATERIAL_LABELS } from '../../core/types'
import type { MaterialKey } from '../../core/types'

export default function StatsPanel() {
  const pieces = useStore((s) => s.pieces)
  const mode = useMode()
  if (pieces.length === 0) return null

  const materials = computeBaseMaterials(pieces, mode.pieces)
  const upkeep = computeBaseUpkeep(pieces, mode.pieces)
  const entryCounts = countEntryPieces(pieces, mode.entryPieceTypes ?? [])

  const materialKeys = Object.keys(materials) as MaterialKey[]
  const upkeepKeys = Object.keys(upkeep) as MaterialKey[]
  const entryKeys = Object.keys(entryCounts)

  return (
    <div className="base-stats">
      {materialKeys.length > 0 && (
        <>
          <div className="base-stats__section-header">Materials</div>
          {materialKeys.map((k) => (
            <div key={k} className="base-stats__row">
              <span>{MATERIAL_LABELS[k]}</span>
              <span>{(materials[k] ?? 0).toLocaleString()}</span>
            </div>
          ))}
        </>
      )}
      {upkeepKeys.length > 0 && (
        <>
          <div className="base-stats__section-header">Upkeep / 24h</div>
          {upkeepKeys.map((k) => (
            <div key={k} className="base-stats__row">
              <span>{MATERIAL_LABELS[k]}</span>
              <span>{(upkeep[k] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            </div>
          ))}
        </>
      )}
      {entryKeys.length > 0 && (
        <>
          <div className="base-stats__section-header">Counts</div>
          {entryKeys.map((k) => (
            <div key={k} className="base-stats__row">
              <span>{ENTRY_PIECE_LABELS[k] ?? k}</span>
              <span>{entryCounts[k]}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
