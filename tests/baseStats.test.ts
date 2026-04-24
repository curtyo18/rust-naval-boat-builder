import { describe, it, expect } from 'vitest'
import { computeBaseMaterials, computeBaseUpkeep, countEntryPieces } from '../src/modes/base/computeStats'
import type { PlacedPiece, PiecesConfig } from '../src/core/types'

const mockConfig: PiecesConfig = {
  wall: {
    label: 'Wall',
    category: 'wall',
    placementType: 'edge',
    floorConstraint: null,
    maxCount: null,
    cost: {},
    hp: 0,
    mass: 0,
    twigCost: { wood: 50 },
    tiers: {
      stone: { cost: { stone: 300 }, hp: 500, upkeepPerDay: { stone: 30 } },
      wood:  { cost: { wood: 200 },  hp: 250, upkeepPerDay: { wood: 20 } },
    },
  },
  doorway: {
    label: 'Doorway',
    category: 'wall',
    placementType: 'edge',
    floorConstraint: null,
    maxCount: null,
    cost: {},
    hp: 0,
    mass: 0,
    twigCost: { wood: 35 },
    tiers: {
      stone: { cost: { stone: 210 }, hp: 500, upkeepPerDay: { stone: 21 } },
    },
  },
} as PiecesConfig

const pieces: PlacedPiece[] = [
  { id: '1', type: 'wall', position: { x: 0, y: 0, z: 0 }, rotation: 0, tier: 'stone', side: 'north' },
  { id: '2', type: 'wall', position: { x: 1, y: 0, z: 0 }, rotation: 0, tier: 'wood', side: 'north' },
  { id: '3', type: 'doorway', position: { x: 2, y: 0, z: 0 }, rotation: 0, tier: 'stone', side: 'north' },
]

describe('computeBaseMaterials', () => {
  it('sums tier upgrade cost plus twig placement cost for every tier', () => {
    const result = computeBaseMaterials(pieces, mockConfig)
    // stone wall: 50 twig wood + 300 stone
    // wood wall:  50 twig wood + 200 wood  (twig applies even when final tier is wood)
    // stone doorway: 35 twig wood + 210 stone
    expect(result.stone).toBe(300 + 210)
    expect(result.wood).toBe(50 + (50 + 200) + 35)
  })

  it('returns empty for pieces without tiers', () => {
    const noTier: PlacedPiece[] = [{ id: '1', type: 'wall', position: { x: 0, y: 0, z: 0 }, rotation: 0 }]
    const result = computeBaseMaterials(noTier, mockConfig)
    expect(Object.keys(result).length).toBe(0)
  })

  it('adds twig cost even for wood-tier pieces', () => {
    const woodOnly: PlacedPiece[] = [
      { id: '1', type: 'wall', position: { x: 0, y: 0, z: 0 }, rotation: 0, tier: 'wood', side: 'north' },
    ]
    const result = computeBaseMaterials(woodOnly, mockConfig)
    expect(result.wood).toBe(50 + 200)
  })
})

describe('computeBaseUpkeep', () => {
  it('sums per-tier upkeep', () => {
    const result = computeBaseUpkeep(pieces, mockConfig)
    expect(result.stone).toBe(30 + 21)
    expect(result.wood).toBe(20)
  })
})

describe('countEntryPieces', () => {
  it('counts entry types only', () => {
    const result = countEntryPieces(pieces, ['doorway', 'double_door_frame'])
    expect(result.doorway).toBe(1)
    expect(result.double_door_frame).toBeUndefined()
  })
})
