import { create } from 'zustand'
import { toKey, toEdgeKey, toTriKey, toTriEdgeKey, toTriSnapKey, toTriSnapEdgeKey, toSquareSnapKey, toSquareSnapEdgeKey } from '../utils/coordinateKey'
import type { PlacedPiece, XYZ, PieceRotation, PieceSide, TriCoord, TriSnapTarget, SquareSnapTarget } from '../types'

const MAX_HISTORY = 50

function autoShowLevel(y: number, current: Set<0 | 1 | 2>): Set<0 | 1 | 2> | undefined {
  const level = y as 0 | 1 | 2
  if (current.has(level)) return undefined
  return new Set([...current, level])
}

interface AppStore {
  pieces: PlacedPiece[]
  coordinateIndex: Map<string, string>
  visibleLevels: Set<0 | 1 | 2>
  transparentPieces: boolean
  showGrid: boolean
  selectedPieceType: string | null
  selectedPieceId: string | null
  cameraResetFn: (() => void) | null

  // History for undo/redo
  _history: PlacedPiece[][]
  _future: PlacedPiece[][]

  placePiece(type: string, position: XYZ, rotation: PieceRotation, side?: PieceSide): void
  placeTrianglePiece(type: string, y: number, triCoord: TriCoord): void
  placeTriangleEdgePiece(type: string, y: number, triCoord: TriCoord, triEdge: 0 | 1 | 2): void
  placeTriangleSnapped(type: string, snap: TriSnapTarget & { y: number }): void
  placeTriSnapEdgePiece(type: string, snap: TriSnapTarget, y: number, edge: 0 | 1 | 2): void
  placeSquareSnapped(type: string, snap: SquareSnapTarget & { y: number }): void
  placeSquareSnapEdgePiece(type: string, snap: SquareSnapTarget, y: number, side: PieceSide): void
  removePiece(id: string): void
  setVisibleLevels(levels: Set<0 | 1 | 2>): void
  setTransparentPieces(on: boolean): void
  setShowGrid(on: boolean): void
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
    if (piece.squareSnap) {
      if (piece.side) {
        index.set(
          toSquareSnapEdgeKey(piece.squareSnap.worldX, piece.position.y, piece.squareSnap.worldZ, piece.side),
          piece.id,
        )
      } else {
        index.set(
          toSquareSnapKey(piece.squareSnap.worldX, piece.position.y, piece.squareSnap.worldZ),
          piece.id,
        )
      }
    } else if (piece.triSnap) {
      if (piece.triEdge !== undefined) {
        index.set(
          toTriSnapEdgeKey(piece.triSnap.worldX, piece.position.y, piece.triSnap.worldZ, piece.triEdge),
          piece.id,
        )
      } else {
        index.set(
          toTriSnapKey(piece.triSnap.worldX, piece.position.y, piece.triSnap.worldZ),
          piece.id,
        )
      }
    } else if (piece.triCoord) {
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
  visibleLevels: new Set<0 | 1 | 2>([0, 1]),
  transparentPieces: true,
  showGrid: true,
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
      const showLevel = autoShowLevel(position.y, state.visibleLevels)
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
        ...(showLevel ? { visibleLevels: showLevel } : {}),
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
      const showLevel = autoShowLevel(y, state.visibleLevels)
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
        ...(showLevel ? { visibleLevels: showLevel } : {}),
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
      const showLevel = autoShowLevel(y, state.visibleLevels)
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
        ...(showLevel ? { visibleLevels: showLevel } : {}),
      }
    })
  },

  placeTriangleSnapped(type, snap) {
    const id = crypto.randomUUID()
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y: snap.y, z: 0 },
      rotation: 0,
      triSnap: { worldX: snap.worldX, worldZ: snap.worldZ, angleDeg: snap.angleDeg },
    }
    set((state) => {
      const pieces = [...state.pieces, piece]
      const showLevel = autoShowLevel(snap.y, state.visibleLevels)
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
        ...(showLevel ? { visibleLevels: showLevel } : {}),
      }
    })
  },

  placeTriSnapEdgePiece(type, snap, y, edge) {
    const id = crypto.randomUUID()
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y, z: 0 },
      rotation: 0,
      triSnap: snap,
      triEdge: edge,
    }
    set((state) => {
      const pieces = [...state.pieces, piece]
      const showLevel = autoShowLevel(y, state.visibleLevels)
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
        ...(showLevel ? { visibleLevels: showLevel } : {}),
      }
    })
  },

  placeSquareSnapped(type, snap) {
    const id = crypto.randomUUID()
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y: snap.y, z: 0 },
      rotation: 0,
      squareSnap: { worldX: snap.worldX, worldZ: snap.worldZ, rotDeg: snap.rotDeg },
    }
    set((state) => {
      const pieces = [...state.pieces, piece]
      const showLevel = autoShowLevel(snap.y, state.visibleLevels)
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
        ...(showLevel ? { visibleLevels: showLevel } : {}),
      }
    })
  },

  placeSquareSnapEdgePiece(type, snap, y, side) {
    const id = crypto.randomUUID()
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y, z: 0 },
      rotation: 0,
      squareSnap: snap,
      side,
    }
    set((state) => {
      const pieces = [...state.pieces, piece]
      const showLevel = autoShowLevel(y, state.visibleLevels)
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
        ...(showLevel ? { visibleLevels: showLevel } : {}),
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

  setTransparentPieces(on) {
    set({ transparentPieces: on })
  },

  setShowGrid(on) {
    set({ showGrid: on })
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
      visibleLevels: new Set<0 | 1 | 2>([0, 1]),
      _history: pushHistory(state._history, state.pieces),
      _future: [],
    }))
  },

  loadPieces(pieces) {
    const hasFloor2 = pieces.some((p) => p.position.y === 2)
    const visibleLevels = new Set<0 | 1 | 2>(hasFloor2 ? [0, 1, 2] : [0, 1])
    set({ pieces, coordinateIndex: buildIndex(pieces), visibleLevels, _history: [], _future: [] })
  },

  setCameraResetFn(fn) {
    set({ cameraResetFn: fn })
  },

  undo() {
    set((state) => {
      if (state._history.length === 0) return state
      const history = [...state._history]
      const previous = history.pop()!
      const needsFloor2 = previous.some((p) => p.position.y === 2)
      const visibleLevels = needsFloor2 && !state.visibleLevels.has(2)
        ? new Set<0 | 1 | 2>([...state.visibleLevels, 2])
        : state.visibleLevels
      return {
        pieces: previous,
        coordinateIndex: buildIndex(previous),
        visibleLevels,
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
      const needsFloor2 = next.some((p) => p.position.y === 2)
      const visibleLevels = needsFloor2 && !state.visibleLevels.has(2)
        ? new Set<0 | 1 | 2>([...state.visibleLevels, 2])
        : state.visibleLevels
      return {
        pieces: next,
        coordinateIndex: buildIndex(next),
        visibleLevels,
        _history: [...state._history, state.pieces],
        _future: future,
      }
    })
  },
}))
