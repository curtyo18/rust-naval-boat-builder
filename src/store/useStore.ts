import { create } from 'zustand'
import { toKey, toEdgeKey } from '../utils/coordinateKey'
import type { PlacedPiece, XYZ, PieceRotation, PieceSide } from '../types'

interface AppStore {
  pieces: PlacedPiece[]
  coordinateIndex: Map<string, string>
  visibleLevels: Set<0 | 1 | 2>
  selectedPieceType: string | null
  cameraResetFn: (() => void) | null

  placePiece(type: string, position: XYZ, rotation: PieceRotation, side?: PieceSide): void
  removePiece(id: string): void
  setVisibleLevels(levels: Set<0 | 1 | 2>): void
  selectPieceType(type: string | null): void
  clearAll(): void
  loadPieces(pieces: PlacedPiece[]): void
  setCameraResetFn(fn: () => void): void
}

function buildIndex(pieces: PlacedPiece[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const piece of pieces) {
    if (piece.side) {
      index.set(toEdgeKey(piece.position, piece.side), piece.id)
    } else {
      index.set(toKey(piece.position), piece.id)
    }
  }
  return index
}

export const useStore = create<AppStore>((set) => ({
  pieces: [],
  coordinateIndex: new Map(),
  visibleLevels: new Set([0, 1, 2]),
  selectedPieceType: null,
  cameraResetFn: null,

  placePiece(type, position, rotation, side) {
    const id = crypto.randomUUID()
    const piece: PlacedPiece = { id, type, position, rotation, ...(side ? { side } : {}) }
    set((state) => {
      const pieces = [...state.pieces, piece]
      return { pieces, coordinateIndex: buildIndex(pieces) }
    })
  },

  removePiece(id) {
    set((state) => {
      const pieces = state.pieces.filter((p) => p.id !== id)
      return { pieces, coordinateIndex: buildIndex(pieces) }
    })
  },

  setVisibleLevels(levels) {
    set({ visibleLevels: levels })
  },

  selectPieceType(type) {
    set({ selectedPieceType: type })
  },

  clearAll() {
    set({ pieces: [], coordinateIndex: new Map() })
  },

  loadPieces(pieces) {
    set({ pieces, coordinateIndex: buildIndex(pieces) })
  },

  setCameraResetFn(fn) {
    set({ cameraResetFn: fn })
  },
}))
