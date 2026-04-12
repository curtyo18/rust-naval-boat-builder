import type { XYZ, FloorConstraint, PlacedPiece, PiecesConfig, PieceSide, TriCoord } from '../types'
import { toKey, toEdgeKey, toTriKey, toTriEdgeKey } from './coordinateKey'

const GRID_X = 5
const GRID_Z = 11
const GRID_Y = 3
const TRI_HEX_RADIUS = 3

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
