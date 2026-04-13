import type { PlacedPiece, PiecesConfig, MaterialCosts, MaterialKey } from '../types'

export interface BoatStats {
  totalHp: number
  totalMass: number
}

export function computeBoatStats(pieces: PlacedPiece[], config: PiecesConfig): BoatStats {
  let totalHp = 0
  let totalMass = 0

  for (const piece of pieces) {
    const pieceConfig = config[piece.type]
    if (!pieceConfig) continue
    totalHp += pieceConfig.hp
    totalMass += pieceConfig.mass
  }

  return { totalHp, totalMass }
}

export function computeTotalCosts(pieces: PlacedPiece[], config: PiecesConfig): MaterialCosts {
  const totals: Partial<Record<MaterialKey, number>> = {}

  for (const piece of pieces) {
    const pieceConfig = config[piece.type]
    if (!pieceConfig) continue

    for (const [material, amount] of Object.entries(pieceConfig.cost) as [MaterialKey, number][]) {
      if (!amount) continue
      totals[material] = (totals[material] ?? 0) + amount
    }
  }

  return totals
}
