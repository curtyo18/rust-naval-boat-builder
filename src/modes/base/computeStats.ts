import type { PlacedPiece, PiecesConfig, MaterialKey, MaterialCosts } from '../../core/types'

function addMaterials(target: Partial<Record<MaterialKey, number>>, source: MaterialCosts) {
  for (const [m, amt] of Object.entries(source) as [MaterialKey, number][]) {
    if (!amt) continue
    target[m] = (target[m] ?? 0) + amt
  }
}

export function computeBaseMaterials(pieces: PlacedPiece[], config: PiecesConfig): Partial<Record<MaterialKey, number>> {
  const totals: Partial<Record<MaterialKey, number>> = {}
  for (const piece of pieces) {
    if (!piece.tier) continue
    const pieceConfig = config[piece.type]
    const tierData = pieceConfig?.tiers?.[piece.tier]
    if (!tierData) continue
    addMaterials(totals, tierData.cost)
  }
  return totals
}

export function computeBaseUpkeep(pieces: PlacedPiece[], config: PiecesConfig): Partial<Record<MaterialKey, number>> {
  const totals: Partial<Record<MaterialKey, number>> = {}
  for (const piece of pieces) {
    if (!piece.tier) continue
    const pieceConfig = config[piece.type]
    const tierData = pieceConfig?.tiers?.[piece.tier]
    if (!tierData) continue
    addMaterials(totals, tierData.upkeepPerDay)
  }
  return totals
}

export function countEntryPieces(pieces: PlacedPiece[], entryTypes: string[]): Record<string, number> {
  const entrySet = new Set(entryTypes)
  const counts: Record<string, number> = {}
  for (const piece of pieces) {
    if (!entrySet.has(piece.type)) continue
    counts[piece.type] = (counts[piece.type] ?? 0) + 1
  }
  return counts
}
