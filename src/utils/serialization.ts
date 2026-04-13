import type { PlacedPiece } from '../types'

export function encodePieces(pieces: PlacedPiece[]): string {
  return btoa(JSON.stringify(pieces))
}

export function decodePieces(encoded: string): PlacedPiece[] | null {
  if (!encoded) return null
  try {
    const json = atob(encoded)
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return null
    return parsed as PlacedPiece[]
  } catch {
    return null
  }
}
