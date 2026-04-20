import type { PlacedPiece, MaterialKey } from '../../core/types'

export function computeBaseMaterials(_pieces: PlacedPiece[]): Partial<Record<MaterialKey, number>> {
  return {}
}

export function computeBaseUpkeep(_pieces: PlacedPiece[]): Partial<Record<MaterialKey, number>> {
  return {}
}

export function countEntryPieces(pieces: PlacedPiece[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const piece of pieces) {
    counts[piece.type] = (counts[piece.type] ?? 0) + 1
  }
  return counts
}
