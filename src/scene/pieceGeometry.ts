import type { PieceSide, PieceRotation, XYZ, PlacedPiece } from '../types'

// Visual colors per piece type
export const PIECE_COLORS: Record<string, string> = {
  // Hull — warm timber
  square_hull: '#8b6914',
  triangle_hull: '#8b6914',
  // Floors — lighter planks
  floor_square: '#b8944a',
  floor_triangle: '#b8944a',
  floor_frame_square: '#a07830',
  floor_frame_triangle: '#a07830',
  // Structural — weathered wood
  wall: '#9c7a3c',
  doorway: '#8a6b30',
  window: '#8a6b30',
  low_wall: '#9c7a3c',
  low_cannon_wall: '#9c7a3c',
  low_wall_barrier: '#a8883e',
  boat_stairs: '#9c7a3c',
  // Deployables — distinct accents
  anchor: '#7a7a7a',
  steering_wheel: '#b09060',
  cannon: '#5a5a5a',
  sail: '#e8dcc8',
  boat_engine: '#8a8a8a',
}

export const DEFAULT_COLOR = '#9c7a3c'

// Geometry dimensions for each piece category/type
export interface PieceShape {
  size: [number, number, number] // width, height, depth (before rotation)
  offset: [number, number, number] // position offset within the cell
  rotationY: number
}

export function getCellPieceShape(type: string): PieceShape {
  // Hull and floor pieces are flat slabs
  if (type.includes('hull')) {
    return { size: [0.96, 0.15, 0.96], offset: [0.5, 0.075, 0.5], rotationY: 0 }
  }
  if (type.includes('floor')) {
    return { size: [0.96, 0.1, 0.96], offset: [0.5, 0.05, 0.5], rotationY: 0 }
  }
  // Deployables — small items sitting on top of foundation
  if (type === 'anchor') {
    return { size: [0.4, 0.5, 0.4], offset: [0.5, 0.25, 0.5], rotationY: 0 }
  }
  if (type === 'steering_wheel') {
    return { size: [0.3, 0.6, 0.3], offset: [0.5, 0.3, 0.5], rotationY: 0 }
  }
  if (type === 'cannon') {
    return { size: [0.35, 0.35, 0.7], offset: [0.5, 0.175, 0.5], rotationY: 0 }
  }
  if (type === 'sail') {
    return { size: [0.1, 1.8, 0.6], offset: [0.5, 0.9, 0.5], rotationY: 0 }
  }
  if (type === 'boat_engine') {
    return { size: [0.5, 0.4, 0.5], offset: [0.5, 0.2, 0.5], rotationY: 0 }
  }
  // Default cell piece
  return { size: [0.92, 0.15, 0.92], offset: [0.5, 0.075, 0.5], rotationY: 0 }
}

export function getEdgePieceShape(type: string, side: PieceSide): PieceShape {
  const isNS = side === 'north' || side === 'south'
  const isLow = type.includes('low') || type.includes('barrier')

  const wallHeight = isLow ? 0.33 : 0.95
  const wallThickness = 0.08

  // Wall-like pieces
  const size: [number, number, number] = isNS
    ? [0.96, wallHeight, wallThickness]
    : [wallThickness, wallHeight, 0.96]

  const offset = getEdgeOffset(side, wallHeight)

  return { size, offset, rotationY: 0 }
}

function getEdgeOffset(side: PieceSide, height: number): [number, number, number] {
  const halfH = height / 2
  switch (side) {
    case 'north': return [0.5, halfH, 0]
    case 'south': return [0.5, halfH, 1]
    case 'west':  return [0, halfH, 0.5]
    case 'east':  return [1, halfH, 0.5]
  }
}

// Check if a piece type is a triangle variant
export function isTriangleType(type: string): boolean {
  return type.includes('triangle')
}

// What a triangle shows on each side for a given rotation.
// 'flat' = the straight base edge, 'slope' = a diagonal edge, 'tip' = the point vertex.
type TriangleEdge = 'flat' | 'slope' | 'tip'

const EDGE_MAP: Record<PieceRotation, Record<string, TriangleEdge>> = {
  0:   { north: 'flat', south: 'tip', east: 'slope', west: 'slope' },
  90:  { north: 'slope', south: 'slope', east: 'tip', west: 'flat' },
  180: { north: 'tip', south: 'flat', east: 'slope', west: 'slope' },
  270: { north: 'slope', south: 'slope', east: 'flat', west: 'tip' },
}

function getTriangleEdgeType(rotation: PieceRotation, side: string): TriangleEdge {
  return EDGE_MAP[rotation][side]
}

const FLAT_ROTATION: Record<string, 0 | 90 | 180 | 270> = {
  north: 0, east: 270, south: 180, west: 90,
}

const OPPOSITE_ROTATION: Record<number, 0 | 90 | 180 | 270> = {
  0: 180, 180: 0, 90: 270, 270: 90,
}

const OPPOSITE_SIDE: Record<string, string> = {
  north: 'south', south: 'north', east: 'west', west: 'east',
}

const DIRECTIONS = [
  { dx: 0, dz: -1, dir: 'north' },
  { dx: 1, dz: 0, dir: 'east' },
  { dx: 0, dz: 1, dir: 'south' },
  { dx: -1, dz: 0, dir: 'west' },
]

// Detect which direction a triangle should face based on adjacent foundations.
// Behavior depends on what the neighbor presents on the shared boundary:
//   Square/hull neighbor → flat edge toward it
//   Triangle showing SLOPE → complement rotation (slope-to-slope)
//   Triangle showing FLAT or TIP → flat edge toward it
export function detectTriangleRotation(
  pos: XYZ,
  coordinateIndex: Map<string, string>,
  pieces?: PlacedPiece[],
): 0 | 90 | 180 | 270 {
  // First pass: prefer square/hull neighbors (flat edge toward them)
  for (const { dx, dz, dir } of DIRECTIONS) {
    const key = `${pos.x + dx},${pos.y},${pos.z + dz}`
    const neighborId = coordinateIndex.get(key)
    if (neighborId && pieces) {
      const neighbor = pieces.find((p) => p.id === neighborId)
      if (neighbor && !isTriangleType(neighbor.type)) {
        return FLAT_ROTATION[dir]
      }
    } else if (neighborId && !pieces) {
      return FLAT_ROTATION[dir]
    }
  }

  // Second pass: triangle neighbors — check what edge they present toward us
  for (const { dx, dz, dir } of DIRECTIONS) {
    const key = `${pos.x + dx},${pos.y},${pos.z + dz}`
    const neighborId = coordinateIndex.get(key)
    if (neighborId && pieces) {
      const neighbor = pieces.find((p) => p.id === neighborId)
      if (neighbor && isTriangleType(neighbor.type)) {
        const facingSide = OPPOSITE_SIDE[dir]
        const edgeType = getTriangleEdgeType(neighbor.rotation, facingSide)

        if (edgeType === 'slope') {
          // Slope-to-slope: complement their rotation so slopes align
          return OPPOSITE_ROTATION[neighbor.rotation] ?? 0
        }
        // Flat or tip: put our flat edge toward them
        return FLAT_ROTATION[dir]
      }
    }
  }

  return 0
}

// Check if a position has any non-triangle neighbor (making it "anchored" in place).
function hasNonTriangleNeighbor(
  pos: XYZ,
  coordinateIndex: Map<string, string>,
  pieces: PlacedPiece[],
): boolean {
  for (const { dx, dz } of DIRECTIONS) {
    const key = `${pos.x + dx},${pos.y},${pos.z + dz}`
    const neighborId = coordinateIndex.get(key)
    if (neighborId) {
      const neighbor = pieces.find((p) => p.id === neighborId)
      if (neighbor && !isTriangleType(neighbor.type)) {
        return true
      }
    }
  }
  return false
}

// Detect visual offset for a triangle when it has a neighboring triangle.
// Only offsets for slope-to-slope contact with an anchored neighbor.
// Flat-to-flat and flat-to-tip contacts don't need offset.
export function detectTriangleOffset(
  pos: XYZ,
  coordinateIndex: Map<string, string>,
  pieces: PlacedPiece[],
): { x: number; z: number } {
  // If this triangle has a non-triangle neighbor, it's anchored — don't offset
  if (hasNonTriangleNeighbor(pos, coordinateIndex, pieces)) {
    return { x: 0, z: 0 }
  }

  for (const { dx, dz, dir } of DIRECTIONS) {
    const key = `${pos.x + dx},${pos.y},${pos.z + dz}`
    const neighborId = coordinateIndex.get(key)
    if (neighborId) {
      const neighbor = pieces.find((p) => p.id === neighborId)
      if (neighbor && isTriangleType(neighbor.type)) {
        const facingSide = OPPOSITE_SIDE[dir]
        const edgeType = getTriangleEdgeType(neighbor.rotation, facingSide)

        // Only offset for slope-to-slope with an anchored neighbor
        if (edgeType === 'slope' &&
            hasNonTriangleNeighbor(neighbor.position, coordinateIndex, pieces)) {
          return { x: dx * 0.5, z: dz * 0.5 }
        }
      }
    }
  }

  return { x: 0, z: 0 }
}

// Detect which edge of a cell the cursor is closest to
export function detectSide(localX: number, localZ: number): PieceSide {
  const dx = Math.min(localX, 1 - localX)
  const dz = Math.min(localZ, 1 - localZ)

  if (dx < dz) {
    return localX < 0.5 ? 'west' : 'east'
  } else {
    return localZ < 0.5 ? 'north' : 'south'
  }
}

// Get the 3D position for a piece
export function getPiecePosition(
  cellPos: XYZ,
  type: string,
  side?: PieceSide,
): [number, number, number] {
  if (side) {
    const shape = getEdgePieceShape(type, side)
    return [
      cellPos.x + shape.offset[0],
      cellPos.y + shape.offset[1],
      cellPos.z + shape.offset[2],
    ]
  }
  const shape = getCellPieceShape(type)
  return [
    cellPos.x + shape.offset[0],
    cellPos.y + shape.offset[1],
    cellPos.z + shape.offset[2],
  ]
}

// Get the geometry args for a piece
export function getPieceSize(
  type: string,
  side?: PieceSide,
): [number, number, number] {
  if (side) {
    return getEdgePieceShape(type, side).size
  }
  return getCellPieceShape(type).size
}
