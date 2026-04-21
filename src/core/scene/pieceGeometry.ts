import type { PieceSide, XYZ } from '../types'

// Visual colors per piece type — warm wood palette
export const PIECE_COLORS: Record<string, string> = {
  // Hull — rich warm timber
  square_hull: '#a67c52',
  triangle_hull: '#a67c52',
  // Floors — lighter planking
  floor_square: '#c9a96e',
  floor_triangle: '#c9a96e',
  floor_frame_square: '#b08850',
  floor_frame_triangle: '#b08850',
  // Structural — medium wood
  wall: '#b59164',
  doorway: '#b59164',
  window: '#b59164',
  low_wall: '#b59164',
  half_wall: '#b59164',
  low_cannon_wall: '#b59164',
  low_wall_barrier: '#c0996a',
  boat_stairs: '#b59164',
  // Deployables — distinct accents
  anchor: '#8a8a8a',
  steering_wheel: '#c4a070',
  cannon: '#6a6a6a',
  sail: '#f0e6d4',
  boat_engine: '#909090',
}

export const DEFAULT_COLOR = '#b59164'
export const GHOST_VALID_COLOR = '#4a9eff'

// Tier-based visual treatment for structural pieces (wood/stone/metal/hqm)
export const TIER_COLORS: Record<string, string> = {
  wood:  '#a67c52',
  stone: '#8c8c88',
  // Weathered rusty steel — warm brown/orange with enough grey to read as metal
  metal: '#8a6a4c',
  // Dark gunmetal / graphite
  hqm:   '#5a5f67',
}

export interface TierMaterial {
  roughness: number
  metalness: number
  useTexture: boolean
}

export const TIER_MATERIALS: Record<string, TierMaterial> = {
  wood:  { roughness: 0.8,  metalness: 0.05, useTexture: true },
  stone: { roughness: 0.95, metalness: 0.05, useTexture: true },
  // Metalness kept modest because the scene has no environment map — too-high values
  // would reflect the warm default sky and read as pink/red on the piece.
  metal: { roughness: 0.55, metalness: 0.25, useTexture: true },
  hqm:   { roughness: 0.3,  metalness: 0.45, useTexture: true },
}

/** Tier takes priority over per-type color for structural pieces. */
export function getPieceColor(type: string, tier?: string): string {
  if (tier && TIER_COLORS[tier]) return TIER_COLORS[tier]
  return PIECE_COLORS[type] ?? DEFAULT_COLOR
}

export function getTierMaterial(tier?: string): TierMaterial {
  if (tier && TIER_MATERIALS[tier]) return TIER_MATERIALS[tier]
  return TIER_MATERIALS.wood
}

// Geometry dimensions for each piece category/type
export interface PieceShape {
  size: [number, number, number] // width, height, depth (before rotation)
  offset: [number, number, number] // position offset within the cell
  rotationY: number
}

export function getCellPieceShape(type: string): PieceShape {
  // Hull and floor pieces are flat slabs
  if (type.includes('hull')) {
    return { size: [1, 0.15, 1], offset: [0.5, 0.075, 0.5], rotationY: 0 }
  }
  // Ceilings are much thinner than foundations
  if (type.includes('ceiling')) {
    return { size: [1, 0.04, 1], offset: [0.5, 0.02, 0.5], rotationY: 0 }
  }
  if (type.includes('floor')) {
    return { size: [1, 0.1, 1], offset: [0.5, 0.05, 0.5], rotationY: 0 }
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
  // Stairs span a full cell, rising one floor height
  if (type === 'stairs_l' || type === 'stairs_u' || type === 'spiral_staircase') {
    return { size: [1, 1, 1], offset: [0.5, 0.5, 0.5], rotationY: 0 }
  }
  // Default cell piece
  return { size: [1, 0.15, 1], offset: [0.5, 0.075, 0.5], rotationY: 0 }
}

export function getEdgePieceShape(type: string, side: PieceSide): PieceShape {
  const isNS = side === 'north' || side === 'south'
  const isHalf = type.includes('half')
  const isLow = type.includes('low') || type.includes('barrier')

  const wallHeight = isHalf ? 0.5 : isLow ? 0.33 : 1.0
  const wallThickness = 0.08

  // Wall-like pieces
  const size: [number, number, number] = isNS
    ? [1, wallHeight, wallThickness]
    : [wallThickness, wallHeight, 1]

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
  stackLevel?: 0 | 1,
): [number, number, number] {
  if (side) {
    const shape = getEdgePieceShape(type, side)
    // Upper-slot half_wall sits on top of the lower one — shift Y by a half-wall height
    const yOffset = stackLevel === 1 ? shape.offset[1] + 0.5 : shape.offset[1]
    return [
      cellPos.x + shape.offset[0],
      cellPos.y + yOffset,
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
