import { create } from 'zustand'
import { toKey, toKeyUpper, toEdgeKey, toEdgeKeyUpper, toTriKey, toTriEdgeKey, toTriSnapKey, toTriSnapKeyUpper, toTriSnapEdgeKey, toSquareSnapKey, toSquareSnapEdgeKey } from '../utils/coordinateKey'
import type { PlacedPiece, XYZ, PieceRotation, PieceSide, TriCoord, TriSnapTarget, SquareSnapTarget } from '../types'

const MAX_HISTORY = 50

function autoShowLevel(y: number, current: Set<number>): Set<number> | undefined {
  if (current.has(y)) return undefined
  return new Set([...current, y])
}

interface AppStore {
  pieces: PlacedPiece[]
  coordinateIndex: Map<string, string>
  visibleLevels: Set<number>
  transparentPieces: boolean
  showGrid: boolean
  selectedPieceType: string | null
  activeTier: string | null
  selectedPieceIds: Set<string>
  cameraResetFn: (() => void) | null

  // History for undo/redo
  _history: PlacedPiece[][]
  _future: PlacedPiece[][]

  placePiece(type: string, position: XYZ, rotation: PieceRotation, side?: PieceSide, stackLevel?: 0 | 1): void
  placeTrianglePiece(type: string, y: number, triCoord: TriCoord): void
  placeTriangleEdgePiece(type: string, y: number, triCoord: TriCoord, triEdge: 0 | 1 | 2): void
  placeTriangleSnapped(type: string, snap: TriSnapTarget & { y: number }, stackLevel?: 0 | 1): void
  placeTriSnapEdgePiece(type: string, snap: TriSnapTarget, y: number, edge: 0 | 1 | 2): void
  placeSquareSnapped(type: string, snap: SquareSnapTarget & { y: number }): void
  placeSquareSnapEdgePiece(type: string, snap: SquareSnapTarget, y: number, side: PieceSide): void
  removePiece(id: string): void
  setVisibleLevels(levels: Set<number>): void
  setTransparentPieces(on: boolean): void
  setShowGrid(on: boolean): void
  selectPieceType(type: string | null): void
  setActiveTier(tier: string | null): void
  toggleSelectPiece(id: string): void
  clearSelection(): void
  deleteSelectedPiece(): void
  upgradeSelectedToTier(tier: string): void
  clearAll(): void
  switchMode(): void
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
        const key = piece.stackLevel === 1
          ? toTriSnapKeyUpper(piece.triSnap.worldX, piece.position.y, piece.triSnap.worldZ)
          : toTriSnapKey(piece.triSnap.worldX, piece.position.y, piece.triSnap.worldZ)
        index.set(key, piece.id)
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
      const key = piece.stackLevel === 1
        ? toEdgeKeyUpper(piece.position, piece.side)
        : toEdgeKey(piece.position, piece.side)
      index.set(key, piece.id)
    } else {
      const key = piece.stackLevel === 1
        ? toKeyUpper(piece.position)
        : toKey(piece.position)
      index.set(key, piece.id)
    }
  }
  return index
}

function pushHistory(history: PlacedPiece[][], current: PlacedPiece[]): PlacedPiece[][] {
  const next = [...history, current]
  if (next.length > MAX_HISTORY) next.shift()
  return next
}

/**
 * Extend a deletion set with cascading removals:
 * - Deleting the lower half of a stacked half_wall pair also removes the orphaned upper half above it.
 * - Deleting a lower half_wall also removes any half-height stacked ceiling that relied on it for
 *   support, if no other lower half_wall on the same cell remains.
 */
function expandDeletionSet(ids: Set<string>, pieces: PlacedPiece[]): Set<string> {
  const result = new Set(ids)
  for (const id of ids) {
    const p = pieces.find(x => x.id === id)
    if (!p || p.type !== 'half_wall' || p.stackLevel === 1 || !p.side) continue
    const upper = pieces.find(x =>
      x.type === 'half_wall'
      && x.stackLevel === 1
      && x.side === p.side
      && x.position.x === p.position.x
      && x.position.y === p.position.y
      && x.position.z === p.position.z
    )
    if (upper) result.add(upper.id)

    // Check whether a stacked ceiling on this cell would lose its last half_wall support.
    const stacked = pieces.find(x =>
      x.stackLevel === 1
      && !x.side
      && x.position.x === p.position.x
      && x.position.y === p.position.y
      && x.position.z === p.position.z
    )
    if (stacked) {
      const otherSupport = pieces.some(x =>
        x.type === 'half_wall'
        && x.stackLevel !== 1
        && !!x.side
        && x.id !== p.id
        && !result.has(x.id)
        && x.position.x === p.position.x
        && x.position.y === p.position.y
        && x.position.z === p.position.z
      )
      if (!otherSupport) result.add(stacked.id)
    }
  }
  return result
}

export const useStore = create<AppStore>((set) => ({
  pieces: [],
  coordinateIndex: new Map(),
  visibleLevels: new Set<number>([0, 1]),
  transparentPieces: true,
  showGrid: false,
  selectedPieceType: null,
  activeTier: null,
  selectedPieceIds: new Set<string>(),
  cameraResetFn: null,
  _history: [],
  _future: [],

  placePiece(type, position, rotation, side, explicitStackLevel) {
    const id = crypto.randomUUID()
    const tier = useStore.getState().activeTier ?? undefined
    set((state) => {
      // Half-walls stack: if lower slot already has a half_wall, this one goes to upper slot.
      // Callers (ceilings on half_walls) can also pass an explicit stackLevel.
      let stackLevel: 0 | 1 | undefined = explicitStackLevel
      if (stackLevel === undefined && type === 'half_wall' && side) {
        const lowerPieceId = state.coordinateIndex.get(toEdgeKey(position, side))
        const lowerPiece = lowerPieceId ? state.pieces.find(p => p.id === lowerPieceId) : null
        if (lowerPiece?.type === 'half_wall') {
          stackLevel = 1
        }
      }
      const piece: PlacedPiece = {
        id,
        type,
        position,
        rotation,
        ...(side ? { side } : {}),
        ...(tier ? { tier } : {}),
        ...(stackLevel !== undefined ? { stackLevel } : {}),
      }
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
    const tier = useStore.getState().activeTier ?? undefined
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y, z: 0 },
      rotation: 0,
      triCoord,
      ...(tier ? { tier } : {}),
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
    const tier = useStore.getState().activeTier ?? undefined
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y, z: 0 },
      rotation: 0,
      triCoord,
      triEdge,
      ...(tier ? { tier } : {}),
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

  placeTriangleSnapped(type, snap, stackLevel) {
    const id = crypto.randomUUID()
    const tier = useStore.getState().activeTier ?? undefined
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y: snap.y, z: 0 },
      rotation: 0,
      triSnap: { worldX: snap.worldX, worldZ: snap.worldZ, angleDeg: snap.angleDeg },
      ...(tier ? { tier } : {}),
      ...(stackLevel !== undefined ? { stackLevel } : {}),
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
    const tier = useStore.getState().activeTier ?? undefined
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y, z: 0 },
      rotation: 0,
      triSnap: snap,
      triEdge: edge,
      ...(tier ? { tier } : {}),
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
    const tier = useStore.getState().activeTier ?? undefined
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y: snap.y, z: 0 },
      rotation: 0,
      squareSnap: { worldX: snap.worldX, worldZ: snap.worldZ, rotDeg: snap.rotDeg },
      ...(tier ? { tier } : {}),
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
    const tier = useStore.getState().activeTier ?? undefined
    const piece: PlacedPiece = {
      id,
      type,
      position: { x: 0, y, z: 0 },
      rotation: 0,
      squareSnap: snap,
      side,
      ...(tier ? { tier } : {}),
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
      const toRemove = expandDeletionSet(new Set([id]), state.pieces)
      const pieces = state.pieces.filter((p) => !toRemove.has(p.id))
      const selectedPieceIds = new Set(state.selectedPieceIds)
      for (const rid of toRemove) selectedPieceIds.delete(rid)
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        selectedPieceIds,
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
    set({ selectedPieceType: type, selectedPieceIds: new Set() })
  },

  setActiveTier(tier) {
    set({ activeTier: tier })
  },

  toggleSelectPiece(id) {
    set((state) => {
      const next = new Set(state.selectedPieceIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedPieceIds: next }
    })
  },

  clearSelection() {
    set({ selectedPieceIds: new Set() })
  },

  deleteSelectedPiece() {
    set((state) => {
      if (state.selectedPieceIds.size === 0) return state
      const toRemove = expandDeletionSet(state.selectedPieceIds, state.pieces)
      const pieces = state.pieces.filter((p) => !toRemove.has(p.id))
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        selectedPieceIds: new Set<string>(),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
      }
    })
  },

  upgradeSelectedToTier(tier) {
    set((state) => {
      if (state.selectedPieceIds.size === 0) return state
      const pieces = state.pieces.map((p) =>
        state.selectedPieceIds.has(p.id) ? { ...p, tier } : p
      )
      return {
        pieces,
        coordinateIndex: buildIndex(pieces),
        _history: pushHistory(state._history, state.pieces),
        _future: [],
      }
    })
  },

  clearAll() {
    set((state) => ({
      pieces: [],
      coordinateIndex: new Map(),
      visibleLevels: new Set<number>([0, 1]),
      _history: pushHistory(state._history, state.pieces),
      _future: [],
    }))
  },

  switchMode() {
    set({
      pieces: [],
      coordinateIndex: new Map(),
      visibleLevels: new Set<number>([0, 1]),
      selectedPieceType: null,
      selectedPieceIds: new Set(),
      activeTier: null,
      _history: [],
      _future: [],
    })
  },

  loadPieces(pieces) {
    const levelsInPieces = new Set<number>(pieces.map((p) => p.position.y))
    const visibleLevels = new Set<number>([0, 1, ...levelsInPieces])
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
      const needed = new Set<number>(previous.map((p) => p.position.y))
      const missing = [...needed].filter((y) => !state.visibleLevels.has(y))
      const visibleLevels = missing.length > 0
        ? new Set<number>([...state.visibleLevels, ...missing])
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
      const needed = new Set<number>(next.map((p) => p.position.y))
      const missing = [...needed].filter((y) => !state.visibleLevels.has(y))
      const visibleLevels = missing.length > 0
        ? new Set<number>([...state.visibleLevels, ...missing])
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
