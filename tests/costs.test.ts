import { describe, it, expect } from 'vitest'
import { computeTotalCosts, computeBoatStats, computeSpeedInfo, computeRaidCost } from '../src/utils/costs'
import type { PlacedPiece, PiecesConfig } from '../src/core/types'

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

describe('computeSpeedInfo', () => {
  it('small boat achievable with sails only', () => {
    // 1000 mass -> 12750 power needed -> ceil(12750/2500) = 6 sails
    const result = computeSpeedInfo(1000)
    expect(result.requiredPower).toBe(12750)
    expect(result.sailsNeeded).toBe(6)
    expect(result.canAchieveWithSails).toBe(true)
    expect(result.enginesNeeded).toBe(null)
    expect(result.canAchieveMaxSpeed).toBe(true)
  })

  it('medium boat needs sails plus engines', () => {
    // 3000 mass -> 38250 power needed -> 16 sails (too many)
    // with 10 sails (25000) deficit = 13250 -> ceil(13250/10000) = 2 engines
    const result = computeSpeedInfo(3000)
    expect(result.sailsNeeded).toBe(16)
    expect(result.canAchieveWithSails).toBe(false)
    expect(result.enginesNeeded).toBe(2)
    expect(result.canAchieveMaxSpeed).toBe(true)
  })

  it('huge boat cannot reach max speed', () => {
    // 6000 mass -> 76500 power needed
    // 10 sails + 5 engines = 75000 -> not enough
    const result = computeSpeedInfo(6000)
    expect(result.canAchieveWithSails).toBe(false)
    expect(result.enginesNeeded).toBe(6)
    expect(result.canAchieveMaxSpeed).toBe(false)
  })

  it('zero mass needs zero sails', () => {
    const result = computeSpeedInfo(0)
    expect(result.requiredPower).toBe(0)
    expect(result.sailsNeeded).toBe(0)
    expect(result.canAchieveWithSails).toBe(true)
    expect(result.enginesNeeded).toBe(null)
    expect(result.canAchieveMaxSpeed).toBe(true)
  })

  it('boundary: exactly 5800 mass is achievable', () => {
    // 5800 * 12.75 = 73950 -> 10*2500 + 5*10000 = 75000 >= 73950
    const result = computeSpeedInfo(5800)
    expect(result.canAchieveMaxSpeed).toBe(true)
  })

  it('boundary: 5883 mass is not achievable', () => {
    // 5883 * 12.75 = 75008.25 > 75000
    const result = computeSpeedInfo(5883)
    expect(result.canAchieveMaxSpeed).toBe(false)
  })
})

describe('computeRaidCost', () => {
  it('calculates correct counts and sulfur for each explosive', () => {
    // 1000 hp
    // C4: ceil(1000/495) = 3 -> 3 * 2200 = 6600
    // Cannonball: ceil(1000/51) = 20 -> 20 * 15 = 300
    // Torpedo: ceil(1000/36) = 28 -> 28 * 12 = 336
    const result = computeRaidCost(1000)
    expect(result).toEqual([
      { key: 'c4', label: 'C4', count: 3, sulfur: 6600 },
      { key: 'cannonball', label: 'Cannonball', count: 20, sulfur: 300 },
      { key: 'torpedo', label: 'Torpedo', count: 28, sulfur: 336 },
    ])
  })

  it('returns zeros for zero hp', () => {
    const result = computeRaidCost(0)
    expect(result).toEqual([
      { key: 'c4', label: 'C4', count: 0, sulfur: 0 },
      { key: 'cannonball', label: 'Cannonball', count: 0, sulfur: 0 },
      { key: 'torpedo', label: 'Torpedo', count: 0, sulfur: 0 },
    ])
  })

  it('rounds up partial explosive counts', () => {
    // 496 hp -> C4: ceil(496/495) = 2
    const result = computeRaidCost(496)
    expect(result[0]).toEqual({ key: 'c4', label: 'C4', count: 2, sulfur: 4400 })
  })
})
