import type { PlacedPiece } from '../types'

export interface SavedState {
  pieces: PlacedPiece[]
  uiScale: number
}

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

export function encodeState(pieces: PlacedPiece[], uiScale: number = 100): string {
  return btoa(JSON.stringify({ pieces, uiScale }))
}

export function decodeState(encoded: string): SavedState | null {
  if (!encoded) return null
  try {
    const json = atob(encoded)
    const parsed = JSON.parse(json)
    // New format: { pieces, uiScale }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.pieces)) {
      return { pieces: parsed.pieces, uiScale: parsed.uiScale ?? 100 }
    }
    // Legacy format: plain array of pieces
    if (Array.isArray(parsed)) {
      return { pieces: parsed as PlacedPiece[], uiScale: 100 }
    }
    return null
  } catch {
    return null
  }
}
