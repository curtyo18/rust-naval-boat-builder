// src/types/index.ts

export interface XYZ {
  x: number
  y: number
  z: number
}

export type PieceRotation = 0 | 90 | 180 | 270

export interface PlacedPiece {
  id: string
  type: string
  position: XYZ
  rotation: PieceRotation
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
  floorConstraint: FloorConstraint
  maxCount: number | null
  cost: MaterialCosts
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
