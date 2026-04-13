import type { XYZ, FloorConstraint, PlacedPiece, PiecesConfig, PieceSide, TriCoord, TriSnapTarget, SquareSnapTarget } from '../types'
import { toKey, toEdgeKey, toTriKey, toTriEdgeKey, toTriSnapKey, toTriSnapEdgeKey, toSquareSnapKey, toSquareSnapEdgeKey } from './coordinateKey'

const GRID_X = 5
const GRID_Z = 11
const GRID_Y = 3
const TRI_HEX_RADIUS = 8

export function isTriInBounds(hq: number, hr: number, y: number): boolean {
  if (y < 0 || y >= GRID_Y) return false
  const dist = (Math.abs(hq) + Math.abs(hr) + Math.abs(-hq - hr)) / 2
  return dist <= TRI_HEX_RADIUS
}

export function isInBounds(pos: XYZ): boolean {
  return pos.x >= 0 && pos.x < GRID_X
    && pos.y >= 0 && pos.y < GRID_Y
    && pos.z >= 0 && pos.z < GRID_Z
}

export function isFloorAllowed(pos: XYZ, constraint: FloorConstraint): boolean {
  if (constraint === null) return true
  if (constraint === 'ground_only') return pos.y === 0
  if (constraint === 'upper_only') return pos.y > 0
  return true
}

export function isCellOccupied(pos: XYZ, coordinateIndex: Map<string, string>): boolean {
  return coordinateIndex.has(toKey(pos))
}

export function isEdgeOccupied(pos: XYZ, side: PieceSide, coordinateIndex: Map<string, string>): boolean {
  return coordinateIndex.has(toEdgeKey(pos, side))
}

export function hasFoundation(pos: XYZ, coordinateIndex: Map<string, string>): boolean {
  return coordinateIndex.has(toKey(pos))
}

export function isMaxCountReached(type: string, pieces: PlacedPiece[], config: PiecesConfig): boolean {
  const maxCount = config[type]?.maxCount
  if (maxCount === null || maxCount === undefined) return false
  return pieces.filter(p => p.type === type).length >= maxCount
}

// Keep old name as alias for backward compat in tests
export const isOccupied = isCellOccupied

export function canPlace(
  type: string,
  position: XYZ,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
  side?: PieceSide,
  triCoord?: TriCoord,
  triEdge?: 0 | 1 | 2,
): boolean {
  // Triangle placement path
  if (triCoord) {
    if (!isTriInBounds(triCoord.hq, triCoord.hr, position.y)) return false
    const pieceConfig = config[type]
    if (!pieceConfig) return false
    if (!isFloorAllowed(position, pieceConfig.floorConstraint)) return false
    if (isMaxCountReached(type, pieces, config)) return false

    if (pieceConfig.placementType === 'edge') {
      // Edge piece on a triangle edge
      if (triEdge === undefined) return false
      const foundationKey = toTriKey(triCoord.hq, position.y, triCoord.hr, triCoord.slot)
      if (!coordinateIndex.has(foundationKey)) return false
      const edgeKey = toTriEdgeKey(triCoord.hq, position.y, triCoord.hr, triCoord.slot, triEdge)
      if (coordinateIndex.has(edgeKey)) return false
      return true
    }

    // Cell piece (triangle foundation)
    const key = toTriKey(triCoord.hq, position.y, triCoord.hr, triCoord.slot)
    if (coordinateIndex.has(key)) return false
    return true
  }

  if (!isInBounds(position)) return false
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed(position, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false

  if (pieceConfig.placementType === 'edge') {
    if (!side) return false
    if (isEdgeOccupied(position, side, coordinateIndex)) return false
    // Edge pieces require a foundation (hull or floor piece) in the cell they attach to
    if (!hasFoundation(position, coordinateIndex)) return false
  } else {
    if (isCellOccupied(position, coordinateIndex)) return false
  }

  return true
}

export function canPlaceTriSnap(
  type: string,
  snap: TriSnapTarget & { y: number },
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
): boolean {
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed({ x: 0, y: snap.y, z: 0 }, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false
  // Must not already have a triangle at this snap position
  const snapKey = toTriSnapKey(snap.worldX, snap.y, snap.worldZ)
  if (coordinateIndex.has(snapKey)) return false
  return true
}

export function canPlaceTriSnapEdge(
  type: string,
  snap: TriSnapTarget,
  y: number,
  edge: number,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
): boolean {
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed({ x: 0, y, z: 0 }, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false
  // Must have a snap-placed triangle foundation at this position
  const foundKey = toTriSnapKey(snap.worldX, y, snap.worldZ)
  if (!coordinateIndex.has(foundKey)) return false
  // Must not already have an edge piece here
  const edgeKey = toTriSnapEdgeKey(snap.worldX, y, snap.worldZ, edge)
  if (coordinateIndex.has(edgeKey)) return false
  return true
}

export function canPlaceSquareSnap(
  type: string,
  snap: SquareSnapTarget & { y: number },
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
): boolean {
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed({ x: 0, y: snap.y, z: 0 }, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false
  const snapKey = toSquareSnapKey(snap.worldX, snap.y, snap.worldZ)
  if (coordinateIndex.has(snapKey)) return false
  return true
}

export function canPlaceSquareSnapEdge(
  type: string,
  snap: SquareSnapTarget,
  y: number,
  side: PieceSide,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
): boolean {
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed({ x: 0, y, z: 0 }, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false
  // Must have a snap-placed square foundation at this position
  const foundKey = toSquareSnapKey(snap.worldX, y, snap.worldZ)
  if (!coordinateIndex.has(foundKey)) return false
  // Must not already have an edge piece here
  const edgeKey = toSquareSnapEdgeKey(snap.worldX, y, snap.worldZ, side)
  if (coordinateIndex.has(edgeKey)) return false
  return true
}
