import { describe, it, expect } from 'vitest'
import { toTriKey, toTriEdgeKey, parseTriKey } from '../src/core/utils/coordinateKey'

describe('toTriKey', () => {
  it('formats triangle coordinate key', () => {
    expect(toTriKey(1, 0, 2, 3)).toBe('t:1,0,2,3')
  })

  it('handles negative hex coordinates', () => {
    expect(toTriKey(-1, 1, -2, 0)).toBe('t:-1,1,-2,0')
  })

  it('handles origin hex', () => {
    expect(toTriKey(0, 0, 0, 0)).toBe('t:0,0,0,0')
  })
})

describe('toTriEdgeKey', () => {
  it('formats triangle edge key', () => {
    expect(toTriEdgeKey(1, 0, 2, 3, 1)).toBe('te:1,0,2,3,1')
  })
})

describe('parseTriKey', () => {
  it('parses a triangle key back to components', () => {
    const result = parseTriKey('t:1,0,2,3')
    expect(result).toEqual({ hq: 1, y: 0, hr: 2, slot: 3 })
  })

  it('returns null for non-triangle keys', () => {
    expect(parseTriKey('1,0,2')).toBeNull()
  })
})
