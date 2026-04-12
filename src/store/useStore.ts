import { create } from 'zustand'
import { toKey, toEdgeKey, toTriKey, toTriEdgeKey } from '../utils/coordinateKey'
import type { PlacedPiece, XYZ, PieceRotation, PieceSide, TriCoord } from '../types'

const MAX_HISTORY = 50

interface AppStore {
  pieces: PlacedPiece[]
  coordinateIndex: Map<string, string>
  visibleLevels: Set<0 | 1 | 2>
  selectedPieceType: string | null
  selectedPieceId: string | null
  cameraResetFn: (() => void) | null

  // History for undo/redo
  _history: PlacedPiece[][]
  _future: PlacedPiece[][]

  placePiece(type: string, position: XYZ, rotation: PieceRotation, side?: PieceSide): void
  placeTrianglePiece(type: string, y: number, triCoord: TriCoord): void
  placeTriangleEdgePiece(type: string, y: number, triCoord: TriCoord, triEdge: 0 | 1 | 2): void
  removePiece(id: string): void
  setVisibleLevels(levels: Set<0 | 1 | 2>): void
  selectPieceType(type: string | null): void
  selectPiece(id: string | null): void
  deleteSelectedPiece(): void
  clearAll(): void
  loadPieces(pieces: PlacedPiece[]): void
  setCameraResetFn(fn: () => void): void
  undo(): void
  redo(): void
}

function buildIndex(pieces: PlacedPiece[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const piece of pieces) {
    if (piece.triCoord) {
      if (piece.triEdge !== undefined) {
        index.set(
          toTriEdgeKey(piece.triCoord.hq, piece.position.y, piece.triCoord.hr, piece.triCoord.slot, piece.triEdge),
          piece.id,
        )
      } else {
        index.set(
          toTriKey(piece.triCoord.hq, piece.position.y, piece.triCoord.hr, piece.triCoord.slot),
          piece.id,
        )
      }
    } else if (piece.side) {
      index.set(toEdgeKey(piece.position, piece.side), piece.id)
    } else {
      index.set(toKey(piece.position), piece.id)
    }
  }
  return index
}

function pushHistory(history: PlacedPiece[][], current: PlacedPiece[]): PlacedPiece[][] {
  const next = [...history, current]
  if (next.length > MAX_HISTORY) next.shift()
  return next
}

export const useStore = create<AppStore>((set) => ({
  pieces: [],
  coordinateIndex: new Map(),
  visibleLevels: new Set([0, 1, 2]),
  selectedPieceType: null,
  selectedPieceId: null,
  cameraResetFn: null,
  _history: [],
  _future: [],

  placePiece(type, position, rotation, side) {
    const id = crypto.randomUUID()
    const piece: PlacedPiece = { id, type, position, rotation, ...(side ? { side } : {}) }
    set((state) => {
      const pieces = [...state.pieces, piece]
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
      }
    })
  },

  placeTrianglePiece(type, y, triCoord) {
    const id = crypto.randomUUID()
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y, z: 0 },
      rotation: 0,
      triCoord,
    }
    set((state) => {
      const pieces = [...state.pieces, piece]
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
      }
    })
  },

  placeTriangleEdgePiece(type, y, triCoord, triEdge) {
    const id = crypto.randomUUID()
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y, z: 0 },
      rotation: 0,
      triCoord,
      triEdge,
    }
    set((state) => {
      const pieces = [...state.pieces, piece]
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
      }
    })
  },

  removePiece(id) {
    set((state) => {
      const pieces = state.pieces.filter((p) => p.id !== id)
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        selectedPieceId: null,
        _history: pushHistory(state._history, state.pieces),
        _future: [],
      }
    })
  },

  setVisibleLevels(levels) {
    set({ visibleLevels: levels })
  },

  selectPieceType(type) {
    set({ selectedPieceType: type, selectedPieceId: null })
  },

  selectPiece(id) {
    set({ selectedPieceId: id })
  },

  deleteSelectedPiece() {
    set((state) => {
      if (!state.selectedPieceId) return state
      const pieces = state.pieces.filter((p) => p.id !== state.selectedPieceId)
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        selectedPieceId: null,
        _history: pushHistory(state._history, state.pieces),
        _future: [],
      }
    })
  },

  clearAll() {
    set((state) => ({
      pieces: [],
      coordinateIndex: new Map(),
      _history: pushHistory(state._history, state.pieces),
      _future: [],
    }))
  },

  loadPieces(pieces) {
    set({ pieces, coordinateIndex: buildIndex(pieces), _history: [], _future: [] })
  },

  setCameraResetFn(fn) {
    set({ cameraResetFn: fn })
  },

  undo() {
    set((state) => {
      if (state._history.length === 0) return state
      const history = [...state._history]
      const previous = history.pop()!
      return {
        pieces: previous,
        coordinateIndex: buildIndex(previous),
        _history: history,
        _future: [state.pieces, ...state._future],
      }
    })
  },

  redo() {
    set((state) => {
      if (state._future.length === 0) return state
      const future = [...state._future]
      const next = future.shift()!
      return {
        pieces: next,
        coordinateIndex: buildIndex(next),
        _history: [...state._history, state.pieces],
        _future: future,
      }
    })
  },
}))
