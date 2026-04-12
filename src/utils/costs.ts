import type { PlacedPiece, PiecesConfig, MaterialCosts, MaterialKey } from '../types'

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
