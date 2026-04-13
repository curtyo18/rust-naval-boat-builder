import { describe, it, expect } from 'vitest'
import { getRadialPieces } from '../src/components/RadialMenu'

describe('getRadialPieces', () => {
  it('excludes deployable pieces', () => {
    const pieces = getRadialPieces()
    const types = pieces.map((p) => p.type)
    expect(types).not.toContain('anchor')
    expect(types).not.toContain('steering_wheel')
    expect(types).not.toContain('cannon')
    expect(types).not.toContain('sail')
    expect(types).not.toContain('boat_engine')
  })

  it('includes hull, structural, and floor pieces', () => {
    const pieces = getRadialPieces()
    const categories = new Set(pieces.map((p) => p.category))
    expect(categories.has('hull')).toBe(true)
    expect(categories.has('structural')).toBe(true)
    expect(categories.has('floor')).toBe(true)
  })

  it('groups pieces by category in order: hull, structural, floor', () => {
    const pieces = getRadialPieces()
    const categories = pieces.map((p) => p.category)
    const firstStructural = categories.indexOf('structural')
    const lastHull = categories.lastIndexOf('hull')
    const firstFloor = categories.indexOf('floor')
    const lastStructural = categories.lastIndexOf('structural')
    expect(lastHull).toBeLessThan(firstStructural)
    expect(lastStructural).toBeLessThan(firstFloor)
  })
})
