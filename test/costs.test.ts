import { describe, it, expect } from 'vitest'
import { computeTotalCosts } from '../src/utils/costs'
import type { PlacedPiece, PiecesConfig } from '../src/types'

const config: PiecesConfig = {
  wall: { label: 'Wall', category: 'structural', floorConstraint: null, maxCount: null, cost: { wood: 300, lowGrade: 15 } },
  cannon: { label: 'Cannon', category: 'deployable', floorConstraint: null, maxCount: null, cost: { wood: 100, metalFragments: 200 } },
  sail: { label: 'Sail', category: 'deployable', floorConstraint: null, maxCount: 10, cost: { wood: 150, tarp: 1 } },
  boat_engine: { label: 'Boat Engine', category: 'deployable', floorConstraint: 'ground_only', maxCount: null, cost: { highQualityMetal: 5, gears: 2, lowGrade: 50 } },
}

const makePiece = (type: string, id: string): PlacedPiece => ({
  id, type, position: { x: 0, y: 0, z: 0 }, rotation: 0,
})

describe('computeTotalCosts', () => {
  it('returns empty object for no pieces', () => {
    expect(computeTotalCosts([], config)).toEqual({})
  })

  it('returns costs for single piece', () => {
    expect(computeTotalCosts([makePiece('wall', '1')], config)).toEqual({ wood: 300, lowGrade: 15 })
  })

  it('sums same material across multiple pieces', () => {
    const pieces = [makePiece('wall', '1'), makePiece('wall', '2')]
    expect(computeTotalCosts(pieces, config)).toEqual({ wood: 600, lowGrade: 30 })
  })

  it('aggregates different materials across different piece types', () => {
    const pieces = [makePiece('wall', '1'), makePiece('cannon', '2')]
    expect(computeTotalCosts(pieces, config)).toEqual({ wood: 400, lowGrade: 15, metalFragments: 200 })
  })

  it('omits materials with zero total', () => {
    const result = computeTotalCosts([makePiece('boat_engine', '1')], config)
    expect(result).toEqual({ highQualityMetal: 5, gears: 2, lowGrade: 50 })
    expect(result.wood).toBeUndefined()
  })

  it('ignores pieces with unknown type', () => {
    const pieces = [makePiece('unknown_piece', '1')]
    expect(computeTotalCosts(pieces, config)).toEqual({})
  })
})
