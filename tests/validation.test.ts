import { describe, it, expect } from 'vitest'
import { toKey, fromKey, toEdgeKey } from '../src/core/utils/coordinateKey'
import { isInBounds, isFloorAllowed, isOccupied, isMaxCountReached, canPlace, hasFoundation, isEdgeOccupied } from '../src/utils/validation'
import type { PlacedPiece, PiecesConfig } from '../src/core/types'

const mockConfig: PiecesConfig = {
  wall: { label: 'Wall', category: 'structural', placementType: 'edge', floorConstraint: null, maxCount: null, cost: { wood: 300 } },
  square_hull: { label: 'Square Hull', category: 'hull', placementType: 'cell', floorConstraint: 'ground_only', maxCount: null, cost: { wood: 300 } },
  floor_square: { label: 'Square Floor', category: 'floor', placementType: 'cell', floorConstraint: 'upper_only', maxCount: null, cost: { wood: 150 } },
  sail: { label: 'Sail', category: 'deployable', placementType: 'cell', floorConstraint: null, maxCount: 10, cost: { wood: 150 } },
}

describe('toKey / fromKey / toEdgeKey', () => {
  it('encodes position as string', () => {
    expect(toKey({ x: 1, y: 2, z: 3 })).toBe('1,2,3')
  })
  it('decodes key back to position', () => {
    expect(fromKey('1,2,3')).toEqual({ x: 1, y: 2, z: 3 })
  })
  it('encodes edge key with side', () => {
    expect(toEdgeKey({ x: 1, y: 0, z: 2 }, 'north')).toBe('1,0,2,north')
  })
})

describe('isInBounds', () => {
  it('accepts valid position', () => {
    expect(isInBounds({ x: 0, y: 0, z: 0 })).toBe(true)
    expect(isInBounds({ x: 4, y: 2, z: 9 })).toBe(true)
  })
  it('rejects x out of range', () => {
    expect(isInBounds({ x: 5, y: 0, z: 0 })).toBe(false)
    expect(isInBounds({ x: -1, y: 0, z: 0 })).toBe(false)
  })
  it('rejects z out of range', () => {
    expect(isInBounds({ x: 0, y: 0, z: 10 })).toBe(false)
  })
  it('rejects y out of range', () => {
    expect(isInBounds({ x: 0, y: 3, z: 0 })).toBe(false)
  })
})

describe('isFloorAllowed', () => {
  it('allows any floor when constraint is null', () => {
    expect(isFloorAllowed({ x: 0, y: 0, z: 0 }, null)).toBe(true)
    expect(isFloorAllowed({ x: 0, y: 2, z: 0 }, null)).toBe(true)
  })
  it('ground_only allows y=0 only', () => {
    expect(isFloorAllowed({ x: 0, y: 0, z: 0 }, 'ground_only')).toBe(true)
    expect(isFloorAllowed({ x: 0, y: 1, z: 0 }, 'ground_only')).toBe(false)
  })
  it('upper_only allows y=1 and y=2 only', () => {
    expect(isFloorAllowed({ x: 0, y: 1, z: 0 }, 'upper_only')).toBe(true)
    expect(isFloorAllowed({ x: 0, y: 2, z: 0 }, 'upper_only')).toBe(true)
    expect(isFloorAllowed({ x: 0, y: 0, z: 0 }, 'upper_only')).toBe(false)
  })
})

describe('isOccupied / isEdgeOccupied / hasFoundation', () => {
  it('returns false for empty index', () => {
    expect(isOccupied({ x: 0, y: 0, z: 0 }, new Map())).toBe(false)
  })
  it('returns true when cell is in index', () => {
    const index = new Map([['0,0,0', 'piece-1']])
    expect(isOccupied({ x: 0, y: 0, z: 0 }, index)).toBe(true)
  })
  it('detects edge occupied', () => {
    const index = new Map([['0,0,0,north', 'wall-1']])
    expect(isEdgeOccupied({ x: 0, y: 0, z: 0 }, 'north', index)).toBe(true)
    expect(isEdgeOccupied({ x: 0, y: 0, z: 0 }, 'south', index)).toBe(false)
  })
  it('checks for foundation', () => {
    const index = new Map([['0,0,0', 'hull-1']])
    expect(hasFoundation({ x: 0, y: 0, z: 0 }, index)).toBe(true)
    expect(hasFoundation({ x: 1, y: 0, z: 0 }, index)).toBe(false)
  })
})

describe('isMaxCountReached', () => {
  it('returns false when maxCount is null', () => {
    const pieces: PlacedPiece[] = [{ id: '1', type: 'wall', position: { x: 0, y: 0, z: 0 }, rotation: 0, side: 'north' }]
    expect(isMaxCountReached('wall', pieces, mockConfig)).toBe(false)
  })
  it('returns false when count is below maxCount', () => {
    const pieces: PlacedPiece[] = Array.from({ length: 9 }, (_, i) => ({
      id: String(i), type: 'sail', position: { x: i, y: 0, z: 0 }, rotation: 0 as const,
    }))
    expect(isMaxCountReached('sail', pieces, mockConfig)).toBe(false)
  })
  it('returns true when count equals maxCount', () => {
    const pieces: PlacedPiece[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i), type: 'sail', position: { x: i, y: 0, z: 0 }, rotation: 0 as const,
    }))
    expect(isMaxCountReached('sail', pieces, mockConfig)).toBe(true)
  })
})

describe('canPlace — cell pieces', () => {
  it('allows hull placement on empty ground cell', () => {
    expect(canPlace('square_hull', { x: 0, y: 0, z: 0 }, [], new Map(), mockConfig)).toBe(true)
  })
  it('rejects cell placement when occupied', () => {
    const index = new Map([['0,0,0', 'existing']])
    expect(canPlace('square_hull', { x: 0, y: 0, z: 0 }, [], index, mockConfig)).toBe(false)
  })
  it('rejects out of bounds', () => {
    expect(canPlace('square_hull', { x: 5, y: 0, z: 0 }, [], new Map(), mockConfig)).toBe(false)
  })
  it('rejects floor constraint violation', () => {
    expect(canPlace('square_hull', { x: 0, y: 1, z: 0 }, [], new Map(), mockConfig)).toBe(false)
  })
  it('rejects max count exceeded', () => {
    const pieces: PlacedPiece[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i), type: 'sail', position: { x: i, y: 0, z: 0 }, rotation: 0 as const,
    }))
    const index = new Map(pieces.map(p => [toKey(p.position), p.id]))
    expect(canPlace('sail', { x: 0, y: 0, z: 5 }, pieces, index, mockConfig)).toBe(false)
  })
})

describe('canPlace — edge pieces', () => {
  it('allows wall placement on a side of an existing foundation', () => {
    const index = new Map([['0,0,0', 'hull-1']]) // foundation exists
    expect(canPlace('wall', { x: 0, y: 0, z: 0 }, [], index, mockConfig, 'north')).toBe(true)
  })
  it('rejects wall without side specified', () => {
    const index = new Map([['0,0,0', 'hull-1']])
    expect(canPlace('wall', { x: 0, y: 0, z: 0 }, [], index, mockConfig)).toBe(false)
  })
  it('rejects wall on cell with no foundation', () => {
    expect(canPlace('wall', { x: 0, y: 0, z: 0 }, [], new Map(), mockConfig, 'north')).toBe(false)
  })
  it('rejects wall when edge is already occupied', () => {
    const index = new Map([
      ['0,0,0', 'hull-1'],
      ['0,0,0,north', 'wall-1'],
    ])
    expect(canPlace('wall', { x: 0, y: 0, z: 0 }, [], index, mockConfig, 'north')).toBe(false)
  })
  it('allows wall on different side of same cell', () => {
    const index = new Map([
      ['0,0,0', 'hull-1'],
      ['0,0,0,north', 'wall-1'],
    ])
    expect(canPlace('wall', { x: 0, y: 0, z: 0 }, [], index, mockConfig, 'south')).toBe(true)
  })
})
