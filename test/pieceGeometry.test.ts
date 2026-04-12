import { describe, it, expect } from 'vitest'
import { isTriangleType, detectTriangleRotation, detectTriangleOffset } from '../src/scene/pieceGeometry'
import type { PlacedPiece } from '../src/types'

function buildIndex(pieces: PlacedPiece[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const p of pieces) {
    index.set(`${p.position.x},${p.position.y},${p.position.z}`, p.id)
  }
  return index
}

function makePiece(id: string, type: string, x: number, y: number, z: number): PlacedPiece {
  return { id, type, position: { x, y, z }, rotation: 0 }
}

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

describe('detectTriangleRotation', () => {
  it('returns flat north (0) when square neighbor is north', () => {
    const pieces = [makePiece('h1', 'square_hull', 2, 0, 4)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(0)
  })

  it('returns flat south (180) when square neighbor is south', () => {
    const pieces = [makePiece('h1', 'square_hull', 2, 0, 6)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(180)
  })

  it('returns flat east (270) when square neighbor is east', () => {
    const pieces = [makePiece('h1', 'square_hull', 3, 0, 5)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(270)
  })

  it('returns flat west (90) when square neighbor is west', () => {
    const pieces = [makePiece('h1', 'square_hull', 1, 0, 5)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(90)
  })

  it('complements triangle neighbor rotation (neighbor tip south → tip north)', () => {
    const pieces = [makePiece('t1', 'triangle_hull', 2, 0, 4)] // rotation 0 = tip south
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(180) // tip north
  })

  it('complements triangle neighbor rotation (neighbor tip north → tip south)', () => {
    const neighbor: PlacedPiece = { id: 't1', type: 'triangle_hull', position: { x: 3, y: 0, z: 5 }, rotation: 180 }
    const index = buildIndex([neighbor])
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, [neighbor])).toBe(0) // tip south
  })

  it('complements triangle neighbor rotation (neighbor tip east → tip west)', () => {
    const neighbor: PlacedPiece = { id: 't1', type: 'triangle_hull', position: { x: 3, y: 0, z: 5 }, rotation: 90 }
    const index = buildIndex([neighbor])
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, [neighbor])).toBe(270) // tip west
  })

  it('prefers square over triangle neighbor', () => {
    const pieces = [
      makePiece('h1', 'square_hull', 2, 0, 4),
      makePiece('t1', 'triangle_hull', 3, 0, 5),
    ]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(0)
  })

  it('returns 0 when no neighbors', () => {
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, new Map(), [])).toBe(0)
  })

  it('legacy: works without pieces array', () => {
    const index = new Map([['2,0,4', 'h1']])
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index)).toBe(0)
  })
})

describe('detectTriangleOffset', () => {
  it('returns zero offset when no neighbors', () => {
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, new Map(), [])).toEqual({ x: 0, z: 0 })
  })

  it('returns zero offset when neighbor is square', () => {
    const pieces = [makePiece('h1', 'square_hull', 3, 0, 5)]
    const index = buildIndex(pieces)
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, index, pieces)).toEqual({ x: 0, z: 0 })
  })

  it('offsets east (+0.5 x) toward triangle neighbor to the east', () => {
    const pieces = [makePiece('t1', 'triangle_hull', 3, 0, 5)]
    const index = buildIndex(pieces)
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, index, pieces)).toEqual({ x: 0.5, z: 0 })
  })

  it('offsets north (-0.5 z) toward triangle neighbor to the north', () => {
    const pieces = [makePiece('t1', 'triangle_hull', 2, 0, 4)]
    const index = buildIndex(pieces)
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, index, pieces)).toEqual({ x: 0, z: -0.5 })
  })

  it('offsets south (+0.5 z) toward triangle neighbor to the south', () => {
    const pieces = [makePiece('t1', 'triangle_hull', 2, 0, 6)]
    const index = buildIndex(pieces)
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, index, pieces)).toEqual({ x: 0, z: 0.5 })
  })

  it('offsets west (-0.5 x) toward triangle neighbor to the west', () => {
    const pieces = [makePiece('t1', 'triangle_hull', 1, 0, 5)]
    const index = buildIndex(pieces)
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, index, pieces)).toEqual({ x: -0.5, z: 0 })
  })

  it('returns zero offset when mixed neighbors (square takes priority)', () => {
    const pieces = [
      makePiece('h1', 'square_hull', 2, 0, 4),
      makePiece('t1', 'triangle_hull', 3, 0, 5),
    ]
    const index = buildIndex(pieces)
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, index, pieces)).toEqual({ x: 0, z: 0 })
  })
})
