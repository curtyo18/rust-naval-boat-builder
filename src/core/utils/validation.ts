import type { XYZ, FloorConstraint, PlacedPiece, PiecesConfig, PieceSide, TriCoord, TriSnapTarget, SquareSnapTarget, GridBounds } from '../types'
import { toKey, toKeyUpper, toEdgeKey, toEdgeKeyUpper, toTriKey, toTriEdgeKey, toTriSnapKey, toTriSnapKeyUpper, toTriSnapEdgeKey, toSquareSnapKey, toSquareSnapEdgeKey } from './coordinateKey'

const ALL_SIDES: PieceSide[] = ['north', 'south', 'east', 'west']

const GRID_X = 5
const GRID_Z = 10
const GRID_Y = 3
const TRI_HEX_RADIUS = 8

/** 1/3-height walls allowed on the topmost floor as railings */
const LOW_WALL_TYPES = new Set(['low_wall', 'low_cannon_wall', 'low_wall_barrier'])

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

/**
 * Edge-slot availability for a piece type. Half-walls occupy one of two
 * vertical slots (lower/upper) at an edge; everything else takes a single
 * slot and blocks any stacking.
 */
function isEdgeSlotAvailable(
  type: string,
  pos: XYZ,
  side: PieceSide,
  coordinateIndex: Map<string, string>,
  pieces: PlacedPiece[],
): boolean {
  const lowerId = coordinateIndex.get(toEdgeKey(pos, side))
  const hasUpper = coordinateIndex.has(toEdgeKeyUpper(pos, side))
  if (type === 'half_wall') {
    if (!lowerId && !hasUpper) return true
    if (lowerId && !hasUpper) {
      const lower = pieces.find(p => p.id === lowerId)
      return lower?.type === 'half_wall'
    }
    return false
  }
  return !lowerId && !hasUpper
}

export function hasFoundation(pos: XYZ, coordinateIndex: Map<string, string>): boolean {
  return coordinateIndex.has(toKey(pos))
}

/** Upper-floor cell pieces need wall support below OR an adjacent cell at the same level. */
export function hasWallSupport(pos: XYZ, coordinateIndex: Map<string, string>): boolean {
  if (pos.y <= 0) return true
  const below: XYZ = { x: pos.x, y: pos.y - 1, z: pos.z }
  if (ALL_SIDES.some(side => coordinateIndex.has(toEdgeKey(below, side)))) return true
  // Adjacent floor at same level allows extension (balcony)
  return (
    coordinateIndex.has(toKey({ x: pos.x - 1, y: pos.y, z: pos.z }))
    || coordinateIndex.has(toKey({ x: pos.x + 1, y: pos.y, z: pos.z }))
    || coordinateIndex.has(toKey({ x: pos.x, y: pos.y, z: pos.z - 1 }))
    || coordinateIndex.has(toKey({ x: pos.x, y: pos.y, z: pos.z + 1 }))
  )
}

/** Triangle cell pieces at y>0 need wall support below OR an adjacent triangle at the same level. */
export function hasTriWallSupport(hq: number, y: number, hr: number, slot: number, coordinateIndex: Map<string, string>): boolean {
  if (y <= 0) return true
  for (let edge = 0; edge < 3; edge++) {
    if (coordinateIndex.has(toTriEdgeKey(hq, y - 1, hr, slot, edge))) return true
  }
  // Adjacent triangle at same level allows extension (balcony)
  // Check neighboring slots in the same hex (consecutive slots share an edge)
  if (coordinateIndex.has(toTriKey(hq, y, hr, (slot + 1) % 6))) return true
  if (coordinateIndex.has(toTriKey(hq, y, hr, (slot + 5) % 6))) return true
  // Check neighboring hexes (all 6 directions, all 6 slots)
  const hexNeighbors = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]
  for (const [dq, dr] of hexNeighbors) {
    for (let s = 0; s < 6; s++) {
      if (coordinateIndex.has(toTriKey(hq + dq, y, hr + dr, s))) return true
    }
  }
  return false
}

/** Check if a grid cell overlaps any snapped square (different coordinate space). */
function overlapsSnappedPiece(pos: XYZ, pieces: PlacedPiece[]): boolean {
  const cx = pos.x + 0.5
  const cz = pos.z + 0.5
  for (const piece of pieces) {
    if (piece.position.y !== pos.y || piece.side) continue
    if (piece.squareSnap) {
      const dx = piece.squareSnap.worldX - cx
      const dz = piece.squareSnap.worldZ - cz
      if (dx * dx + dz * dz < 0.45 * 0.45) return true
    }
    if (piece.triSnap && !piece.triEdge) {
      const dx = piece.triSnap.worldX - cx
      const dz = piece.triSnap.worldZ - cz
      if (dx * dx + dz * dz < 0.4 * 0.4) return true
    }
  }
  return false
}

/** Check if a snap position overlaps any grid-placed cell piece. */
function overlapsGridPiece(worldX: number, worldZ: number, y: number, coordinateIndex: Map<string, string>): boolean {
  const gx = Math.floor(worldX)
  const gz = Math.floor(worldZ)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const key = toKey({ x: gx + dx, y, z: gz + dz })
      if (!coordinateIndex.has(key)) continue
      const gcx = gx + dx + 0.5
      const gcz = gz + dz + 0.5
      const ddx = worldX - gcx
      const ddz = worldZ - gcz
      if (ddx * ddx + ddz * ddz < 0.7 * 0.7) return true
    }
  }
  return false
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
      if (position.y >= GRID_Y - 1 && !LOW_WALL_TYPES.has(type)) return false
      const foundationKey = toTriKey(triCoord.hq, position.y, triCoord.hr, triCoord.slot)
      const hasTriFoundation = coordinateIndex.has(foundationKey)
      const hasTriEdgeBelow = position.y > 0
        && coordinateIndex.has(toTriEdgeKey(triCoord.hq, position.y - 1, triCoord.hr, triCoord.slot, triEdge))
      if (!hasTriFoundation && !hasTriEdgeBelow) return false
      const edgeKey = toTriEdgeKey(triCoord.hq, position.y, triCoord.hr, triCoord.slot, triEdge)
      if (coordinateIndex.has(edgeKey)) return false
      return true
    }

    // Cell piece (triangle foundation)
    const key = toTriKey(triCoord.hq, position.y, triCoord.hr, triCoord.slot)
    if (coordinateIndex.has(key)) return false
    if (!hasTriWallSupport(triCoord.hq, position.y, triCoord.hr, triCoord.slot, coordinateIndex)) return false
    return true
  }

  if (!isInBounds(position)) return false
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed(position, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false

  if (pieceConfig.placementType === 'edge') {
    if (!side) return false
    if (position.y >= GRID_Y - 1 && !LOW_WALL_TYPES.has(type)) return false
    if (!isEdgeSlotAvailable(type, position, side, coordinateIndex, pieces)) return false
    // Foundation at same cell OR edge piece below on same side (wall stacking)
    const hasEdgeBelowOnSide = position.y > 0
      && coordinateIndex.has(toEdgeKey({ x: position.x, y: position.y - 1, z: position.z }, side))
    if (!hasFoundation(position, coordinateIndex) && !hasEdgeBelowOnSide) return false
  } else {
    if (isCellOccupied(position, coordinateIndex)) return false
    if (!hasWallSupport(position, coordinateIndex)) return false
    if (overlapsSnappedPiece(position, pieces)) return false
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
  if (overlapsGridPiece(snap.worldX, snap.worldZ, snap.y, coordinateIndex)) return false
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
  if (y >= GRID_Y - 1 && !LOW_WALL_TYPES.has(type)) return false
  // Foundation at same position OR edge piece below on same edge (stacking)
  const foundKey = toTriSnapKey(snap.worldX, y, snap.worldZ)
  const hasSnapFoundation = coordinateIndex.has(foundKey)
  const hasSnapEdgeBelow = y > 0
    && coordinateIndex.has(toTriSnapEdgeKey(snap.worldX, y - 1, snap.worldZ, edge))
  if (!hasSnapFoundation && !hasSnapEdgeBelow) return false
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
  if (overlapsGridPiece(snap.worldX, snap.worldZ, snap.y, coordinateIndex)) return false
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
  if (y >= GRID_Y - 1 && !LOW_WALL_TYPES.has(type)) return false
  // Foundation at same position OR edge piece below on same side (stacking)
  const foundKey = toSquareSnapKey(snap.worldX, y, snap.worldZ)
  const hasSnapFoundation = coordinateIndex.has(foundKey)
  const hasSnapEdgeBelow = y > 0
    && coordinateIndex.has(toSquareSnapEdgeKey(snap.worldX, y - 1, snap.worldZ, side))
  if (!hasSnapFoundation && !hasSnapEdgeBelow) return false
  // Must not already have an edge piece here
  const edgeKey = toSquareSnapEdgeKey(snap.worldX, y, snap.worldZ, side)
  if (coordinateIndex.has(edgeKey)) return false
  return true
}

// ---------------------------------------------------------------------------
// Parameterized variants (Task 1.7): allow callers to pass custom bounds,
// maxFloors, and the set of piece types allowed on the top floor (low walls).
// These coexist with the hardcoded versions above; a later task will switch
// callers over and remove the originals.
// ---------------------------------------------------------------------------

export function isInBoundsWith(pos: XYZ, bounds: GridBounds): boolean {
  if (bounds === 'infinite') return true
  return pos.x >= 0 && pos.x < bounds.x
    && pos.y >= 0 && pos.y < bounds.y
    && pos.z >= 0 && pos.z < bounds.z
}

export function isTriInBoundsWith(hq: number, hr: number, y: number, maxFloors: number | 'infinite'): boolean {
  if (maxFloors !== 'infinite' && (y < 0 || y >= maxFloors)) return false
  if (maxFloors === 'infinite') return true
  const dist = (Math.abs(hq) + Math.abs(hr) + Math.abs(-hq - hr)) / 2
  return dist <= TRI_HEX_RADIUS
}

export function canPlaceWith(
  type: string,
  position: XYZ,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
  bounds: GridBounds,
  maxFloors: number | 'infinite',
  topFloorAllowedTypes: Set<string>,
  side?: PieceSide,
  triCoord?: TriCoord,
  triEdge?: 0 | 1 | 2,
  stackLevel?: 0 | 1,
): boolean {
  // Triangle placement path
  if (triCoord) {
    if (!isTriInBoundsWith(triCoord.hq, triCoord.hr, position.y, maxFloors)) return false
    const pieceConfig = config[type]
    if (!pieceConfig) return false
    if (!isFloorAllowed(position, pieceConfig.floorConstraint)) return false
    if (isMaxCountReached(type, pieces, config)) return false

    if (pieceConfig.placementType === 'edge') {
      // Edge piece on a triangle edge
      if (triEdge === undefined) return false
      if (maxFloors !== 'infinite' && position.y >= maxFloors - 1 && !topFloorAllowedTypes.has(type)) return false
      const foundationKey = toTriKey(triCoord.hq, position.y, triCoord.hr, triCoord.slot)
      const hasTriFoundation = coordinateIndex.has(foundationKey)
      const hasTriEdgeBelow = position.y > 0
        && coordinateIndex.has(toTriEdgeKey(triCoord.hq, position.y - 1, triCoord.hr, triCoord.slot, triEdge))
      if (!hasTriFoundation && !hasTriEdgeBelow) return false
      const edgeKey = toTriEdgeKey(triCoord.hq, position.y, triCoord.hr, triCoord.slot, triEdge)
      if (coordinateIndex.has(edgeKey)) return false
      return true
    }

    // Cell piece (triangle foundation)
    const key = toTriKey(triCoord.hq, position.y, triCoord.hr, triCoord.slot)
    if (coordinateIndex.has(key)) return false
    if (!hasTriWallSupport(triCoord.hq, position.y, triCoord.hr, triCoord.slot, coordinateIndex)) return false
    return true
  }

  if (!isInBoundsWith(position, bounds)) return false
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  // stackLevel=1 cells sit half a floor up on half_walls; skip the floor-constraint check
  // (a half-height ceiling is valid on any floor its supporting half_walls are allowed on).
  if (stackLevel !== 1 && !isFloorAllowed(position, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false

  if (pieceConfig.placementType === 'edge') {
    if (!side) return false
    if (maxFloors !== 'infinite' && position.y >= maxFloors - 1 && !topFloorAllowedTypes.has(type)) return false
    if (!isEdgeSlotAvailable(type, position, side, coordinateIndex, pieces)) return false
    // Foundation at same cell OR edge piece below on same side (wall stacking)
    const hasEdgeBelowOnSide = position.y > 0
      && coordinateIndex.has(toEdgeKey({ x: position.x, y: position.y - 1, z: position.z }, side))
    if (!hasFoundation(position, coordinateIndex) && !hasEdgeBelowOnSide) return false
  } else if (stackLevel === 1) {
    // Half-height ceiling: must sit atop at least one lower half_wall on this cell's edges.
    if (coordinateIndex.has(toKeyUpper(position))) return false
    const hasHalfWallSupport = ALL_SIDES.some((s) => {
      const id = coordinateIndex.get(toEdgeKey(position, s))
      if (!id) return false
      const p = pieces.find((x) => x.id === id)
      return p?.type === 'half_wall'
    })
    if (!hasHalfWallSupport) return false
  } else {
    if (isCellOccupied(position, coordinateIndex)) return false
    if (!hasWallSupport(position, coordinateIndex)) return false
    if (overlapsSnappedPiece(position, pieces)) return false
  }

  return true
}

export function canPlaceTriSnapWith(
  type: string,
  snap: TriSnapTarget & { y: number },
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
  _maxFloors: number | 'infinite',
  _topFloorAllowedTypes: Set<string>,
  stackLevel?: 0 | 1,
): boolean {
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  // stackLevel=1 means sitting atop a half_wall — bypass floor constraint since the piece
  // physically straddles two floor ys.
  if (stackLevel !== 1 && !isFloorAllowed({ x: 0, y: snap.y, z: 0 }, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false
  if (stackLevel === 1) {
    const upperKey = toTriSnapKeyUpper(snap.worldX, snap.y, snap.worldZ)
    if (coordinateIndex.has(upperKey)) return false
    return true
  }
  // Must not already have a triangle at this snap position
  const snapKey = toTriSnapKey(snap.worldX, snap.y, snap.worldZ)
  if (coordinateIndex.has(snapKey)) return false
  if (overlapsGridPiece(snap.worldX, snap.worldZ, snap.y, coordinateIndex)) return false
  return true
}

export function canPlaceTriSnapEdgeWith(
  type: string,
  snap: TriSnapTarget,
  y: number,
  edge: number,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
  maxFloors: number | 'infinite',
  topFloorAllowedTypes: Set<string>,
): boolean {
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed({ x: 0, y, z: 0 }, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false
  if (maxFloors !== 'infinite' && y >= maxFloors - 1 && !topFloorAllowedTypes.has(type)) return false
  // Foundation at same position OR edge piece below on same edge (stacking)
  const foundKey = toTriSnapKey(snap.worldX, y, snap.worldZ)
  const hasSnapFoundation = coordinateIndex.has(foundKey)
  const hasSnapEdgeBelow = y > 0
    && coordinateIndex.has(toTriSnapEdgeKey(snap.worldX, y - 1, snap.worldZ, edge))
  if (!hasSnapFoundation && !hasSnapEdgeBelow) return false
  // Must not already have an edge piece here
  const edgeKey = toTriSnapEdgeKey(snap.worldX, y, snap.worldZ, edge)
  if (coordinateIndex.has(edgeKey)) return false
  return true
}

export function canPlaceSquareSnapWith(
  type: string,
  snap: SquareSnapTarget & { y: number },
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
  _maxFloors: number | 'infinite',
  _topFloorAllowedTypes: Set<string>,
): boolean {
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed({ x: 0, y: snap.y, z: 0 }, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false
  const snapKey = toSquareSnapKey(snap.worldX, snap.y, snap.worldZ)
  if (coordinateIndex.has(snapKey)) return false
  if (overlapsGridPiece(snap.worldX, snap.worldZ, snap.y, coordinateIndex)) return false
  return true
}

export function canPlaceSquareSnapEdgeWith(
  type: string,
  snap: SquareSnapTarget,
  y: number,
  side: PieceSide,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
  config: PiecesConfig,
  maxFloors: number | 'infinite',
  topFloorAllowedTypes: Set<string>,
): boolean {
  const pieceConfig = config[type]
  if (!pieceConfig) return false
  if (!isFloorAllowed({ x: 0, y, z: 0 }, pieceConfig.floorConstraint)) return false
  if (isMaxCountReached(type, pieces, config)) return false
  if (maxFloors !== 'infinite' && y >= maxFloors - 1 && !topFloorAllowedTypes.has(type)) return false
  // Foundation at same position OR edge piece below on same side (stacking)
  const foundKey = toSquareSnapKey(snap.worldX, y, snap.worldZ)
  const hasSnapFoundation = coordinateIndex.has(foundKey)
  const hasSnapEdgeBelow = y > 0
    && coordinateIndex.has(toSquareSnapEdgeKey(snap.worldX, y - 1, snap.worldZ, side))
  if (!hasSnapFoundation && !hasSnapEdgeBelow) return false
  // Must not already have an edge piece here
  const edgeKey = toSquareSnapEdgeKey(snap.worldX, y, snap.worldZ, side)
  if (coordinateIndex.has(edgeKey)) return false
  return true
}
