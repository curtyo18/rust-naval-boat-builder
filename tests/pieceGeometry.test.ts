import { describe, it, expect } from 'vitest'
import { isTriangleType } from '../src/core/scene/pieceGeometry'

describe('isTriangleType', () => {
  it('returns true for triangle_hull', () => {
    expect(isTriangleType('triangle_hull')).toBe(true)
  })
  it('returns true for floor_triangle', () => {
    expect(isTriangleType('floor_triangle')).toBe(true)
  })
  it('returns true for floor_frame_triangle', () => {
    expect(isTriangleType('floor_frame_triangle')).toBe(true)
  })
  it('returns false for square_hull', () => {
    expect(isTriangleType('square_hull')).toBe(false)
  })
  it('returns false for wall', () => {
    expect(isTriangleType('wall')).toBe(false)
  })
})
