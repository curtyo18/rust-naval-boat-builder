export interface XYZ {
  x: number
  y: number
  z: number
}

export type PieceRotation = 0 | 90 | 180 | 270

export type PieceSide = 'north' | 'south' | 'east' | 'west'

export type TriSlot = 0 | 1 | 2 | 3 | 4 | 5

export type TriEdgeIndex = 0 | 1 | 2

export interface TriCoord {
  hq: number
  hr: number
  slot: TriSlot
}

export type PlacementType = 'cell' | 'edge'

export interface TriSnapTarget {
  worldX: number
  worldZ: number
  angleDeg: number
}

export interface SquareSnapTarget {
  worldX: number
  worldZ: number
  rotDeg: number
}

export interface PlacedPiece {
  id: string
  type: string
  position: XYZ
  rotation: PieceRotation
  side?: PieceSide // only set for edge pieces (walls, doorways, etc.)
  triCoord?: TriCoord
  triEdge?: TriEdgeIndex
  triSnap?: TriSnapTarget // triangle snapped to a square edge
  squareSnap?: SquareSnapTarget // square snapped to a triangle edge
}

export type FloorConstraint = 'ground_only' | 'upper_only' | null

export interface MaterialCosts {
  wood?: number
  lowGrade?: number
  metalFragments?: number
  tarp?: number
  highQualityMetal?: number
  gears?: number
}

export type PieceCategory = 'hull' | 'structural' | 'floor' | 'deployable'

export interface PieceConfig {
  label: string
  category: PieceCategory
  placementType: PlacementType
  floorConstraint: FloorConstraint
  maxCount: number | null
  cost: MaterialCosts
  hp: number
  mass: number
}

export type PiecesConfig = Record<string, PieceConfig>

export type MaterialKey = keyof MaterialCosts

export const MATERIAL_LABELS: Record<MaterialKey, string> = {
  wood: 'Wood',
  lowGrade: 'Low Grade',
  metalFragments: 'Metal Frags',
  tarp: 'Tarp',
  highQualityMetal: 'High Quality Metal',
  gears: 'Gears',
}
