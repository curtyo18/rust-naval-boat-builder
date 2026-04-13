import { describe, it, expect } from 'vitest'
import { computeTotalCosts, computeBoatStats } from '../src/utils/costs'
import type { PlacedPiece, PiecesConfig } from '../src/types'

const config: PiecesConfig = {
  wall: { label: 'Wall', category: 'structural', placementType: 'edge', floorConstraint: null, maxCount: null, cost: { wood: 300, lowGrade: 15 }, hp: 50, mass: 100 },
  cannon: { label: 'Cannon', category: 'deployable', placementType: 'cell', floorConstraint: null, maxCount: null, cost: { wood: 100, metalFragments: 200 }, hp: 0, mass: 0 },
  sail: { label: 'Sail', category: 'deployable', placementType: 'cell', floorConstraint: null, maxCount: 10, cost: { wood: 150, tarp: 1 }, hp: 0, mass: 0 },
  boat_engine: { label: 'Boat Engine', category: 'deployable', placementType: 'cell', floorConstraint: 'ground_only', maxCount: null, cost: { highQualityMetal: 5, gears: 2, lowGrade: 50 }, hp: 0, mass: 0 },
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

describe('computeBoatStats', () => {
  it('returns zeros for no pieces', () => {
    expect(computeBoatStats([], config)).toEqual({ totalHp: 0, totalMass: 0 })
  })

  it('sums hp and mass for structural pieces', () => {
    const pieces = [makePiece('wall', '1'), makePiece('wall', '2')]
    expect(computeBoatStats(pieces, config)).toEqual({ totalHp: 100, totalMass: 200 })
  })

  it('deployables contribute zero hp and mass', () => {
    const pieces = [makePiece('wall', '1'), makePiece('sail', '2')]
    expect(computeBoatStats(pieces, config)).toEqual({ totalHp: 50, totalMass: 100 })
  })

  it('ignores unknown piece types', () => {
    const pieces = [makePiece('unknown', '1')]
    expect(computeBoatStats(pieces, config)).toEqual({ totalHp: 0, totalMass: 0 })
  })
})
