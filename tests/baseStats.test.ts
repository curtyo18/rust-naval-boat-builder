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
    tiers: {
      stone: { cost: { stone: 500 }, hp: 500, upkeepPerDay: { stone: 20 } },
      wood:  { cost: { wood: 200 },  hp: 250, upkeepPerDay: { wood: 10 } },
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
    tiers: {
      stone: { cost: { stone: 400 }, hp: 400, upkeepPerDay: { stone: 16 } },
    },
  },
} as PiecesConfig

const pieces: PlacedPiece[] = [
  { id: '1', type: 'wall', position: { x: 0, y: 0, z: 0 }, rotation: 0, tier: 'stone', side: 'north' },
  { id: '2', type: 'wall', position: { x: 1, y: 0, z: 0 }, rotation: 0, tier: 'wood', side: 'north' },
  { id: '3', type: 'doorway', position: { x: 2, y: 0, z: 0 }, rotation: 0, tier: 'stone', side: 'north' },
]

describe('computeBaseMaterials', () => {
  it('sums per-tier costs', () => {
    const result = computeBaseMaterials(pieces, mockConfig)
    expect(result.stone).toBe(500 + 400)
    expect(result.wood).toBe(200)
  })

  it('returns empty for pieces without tiers', () => {
    const noTier: PlacedPiece[] = [{ id: '1', type: 'wall', position: { x: 0, y: 0, z: 0 }, rotation: 0 }]
    const result = computeBaseMaterials(noTier, mockConfig)
    expect(Object.keys(result).length).toBe(0)
  })
})

describe('computeBaseUpkeep', () => {
  it('sums per-tier upkeep', () => {
    const result = computeBaseUpkeep(pieces, mockConfig)
    expect(result.stone).toBe(20 + 16)
    expect(result.wood).toBe(10)
  })
})

describe('countEntryPieces', () => {
  it('counts entry types only', () => {
    const result = countEntryPieces(pieces, ['doorway', 'double_doorway', 'ladder_hatch'])
    expect(result.doorway).toBe(1)
    expect(result.double_doorway).toBeUndefined()
  })
})
