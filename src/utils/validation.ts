import type { XYZ, FloorConstraint, PlacedPiece, PiecesConfig } from '../types'
import { toKey } from './coordinateKey'

const GRID_X = 5
const GRID_Z = 11
const GRID_Y = 3

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

export function isOccupied(pos: XYZ, coordinateIndex: Map<string, string>): boolean {
  return coordinateIndex.has(toKey(pos))
}

export function isMaxCountReached(type: string, pieces: PlacedPiece[], config: PiecesConfig): boolean {
  const maxCount = config[type]?.maxCount
  if (maxCount === null || maxCount === undefined) return false
  return pieces.filter(p => p.type === type).length >= maxCount
}

export function canPlace(
  type: string,
  position: XYZ,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
): boolean {
  if (!isInBounds(position)) return false
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed(position, pieceConfig.floorConstraint)) return false
  if (isOccupied(position, coordinateIndex)) return false
  if (isMaxCountReached(type, pieces, config)) return false
  return true
}
