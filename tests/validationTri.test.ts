import { describe, it, expect } from 'vitest'
import { canPlace, isTriInBounds } from '../src/core/utils/validation'
import type { PlacedPiece, PiecesConfig } from '../src/core/types'
import { toTriKey, toTriEdgeKey } from '../src/core/utils/coordinateKey'
import piecesConfig from '../src/data/pieces-config.json'

const config = piecesConfig as PiecesConfig

function makeTriIndex(pieces: PlacedPiece[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const p of pieces) {
    if (p.triCoord) {
      index.set(toTriKey(p.triCoord.hq, p.position.y, p.triCoord.hr, p.triCoord.slot), p.id)
    } else if (p.side) {
      index.set(`${p.position.x},${p.position.y},${p.position.z},${p.side}`, p.id)
    } else {
      index.set(`${p.position.x},${p.position.y},${p.position.z}`, p.id)
    }
  }
  return index
}

describe('isTriInBounds', () => {
  it('accepts hex (0,0) at floor 0', () => {
    expect(isTriInBounds(0, 0, 0)).toBe(true)
  })

  it('accepts hex within radius', () => {
    expect(isTriInBounds(2, -1, 0)).toBe(true)
  })

  it('rejects out-of-range floors', () => {
    expect(isTriInBounds(0, 0, 3)).toBe(false)
    expect(isTriInBounds(0, 0, -1)).toBe(false)
  })

  it('rejects hex too far from origin', () => {
    expect(isTriInBounds(10, 10, 0)).toBe(false)
  })
})

describe('canPlace with triCoord', () => {
  it('allows placing a triangle hull at an empty slot', () => {
    const result = canPlace('triangle_hull', { x: 0, y: 0, z: 0 }, [], new Map(), config, undefined, { hq: 0, hr: 0, slot: 0 })
    expect(result).toBe(true)
  })

  it('rejects placing in an occupied triangle slot', () => {
    const existing: PlacedPiece = {
      id: 'abc',
      type: 'triangle_hull',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      triCoord: { hq: 0, hr: 0, slot: 0 },
    }
    const index = makeTriIndex([existing])
    const result = canPlace('triangle_hull', { x: 0, y: 0, z: 0 }, [existing], index, config, undefined, { hq: 0, hr: 0, slot: 0 })
    expect(result).toBe(false)
  })

  it('respects floor constraint for triangle hull (ground_only)', () => {
    const result = canPlace('triangle_hull', { x: 0, y: 1, z: 0 }, [], new Map(), config, undefined, { hq: 0, hr: 0, slot: 0 })
    expect(result).toBe(false)
  })

  it('allows triangle floor on upper floors with wall support below', () => {
    // Wall on edge 0 of the same triangle at y=0 provides support
    const index = new Map([[toTriEdgeKey(0, 0, 0, 0, 0), 'wall-1']])
    const result = canPlace('floor_triangle', { x: 0, y: 1, z: 0 }, [], index, config, undefined, { hq: 0, hr: 0, slot: 0 })
    expect(result).toBe(true)
  })

  it('rejects triangle floor on upper floors without wall support', () => {
    const result = canPlace('floor_triangle', { x: 0, y: 1, z: 0 }, [], new Map(), config, undefined, { hq: 0, hr: 0, slot: 0 })
    expect(result).toBe(false)
  })

  it('rejects unknown piece type', () => {
    const result = canPlace('nonexistent', { x: 0, y: 0, z: 0 }, [], new Map(), config, undefined, { hq: 0, hr: 0, slot: 0 })
    expect(result).toBe(false)
  })
})
