import { describe, it, expect } from 'vitest'
import { isTriangleType, detectTriangleRotation, detectTriangleOffset } from '../src/scene/pieceGeometry'
import type { PlacedPiece, PieceRotation } from '../src/types'

function buildIndex(pieces: PlacedPiece[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const p of pieces) {
    index.set(`${p.position.x},${p.position.y},${p.position.z}`, p.id)
  }
  return index
}

function makePiece(id: string, type: string, x: number, y: number, z: number, rotation: PieceRotation = 0): PlacedPiece {
  return { id, type, position: { x, y, z }, rotation }
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
  // Square neighbors: always flat edge toward them
  it('flat toward square to the north', () => {
    const pieces = [makePiece('h1', 'square_hull', 2, 0, 4)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(0)
  })

  it('flat toward square to the south', () => {
    const pieces = [makePiece('h1', 'square_hull', 2, 0, 6)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(180)
  })

  it('flat toward square to the east', () => {
    const pieces = [makePiece('h1', 'square_hull', 3, 0, 5)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(270)
  })

  it('flat toward square to the west', () => {
    const pieces = [makePiece('h1', 'square_hull', 1, 0, 5)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(90)
  })

  // Triangle neighbor showing SLOPE: complement rotation (slope-to-slope)
  it('slope-to-slope: neighbor rot 180 (tip north) to east shows slope on west', () => {
    // Neighbor to east has rot 180 → west side is slope → complement: rot 0
    const pieces = [makePiece('t1', 'triangle_hull', 3, 0, 5, 180)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(0)
  })

  it('slope-to-slope: neighbor rot 0 (tip south) to east shows slope on west', () => {
    // Neighbor to east has rot 0 → west side is slope → complement: rot 180
    const pieces = [makePiece('t1', 'triangle_hull', 3, 0, 5, 0)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(180)
  })

  // Triangle neighbor showing FLAT: flat-to-flat
  it('flat-to-flat: neighbor rot 0 (flat north) to north shows flat on south', () => {
    // Neighbor to north has rot 0 → south side is tip, not flat
    // Actually rot 0 = flat north, tip south. South side = TIP.
    // So this is flat-to-tip → flat toward neighbor
    const pieces = [makePiece('t1', 'triangle_hull', 2, 0, 4, 0)]
    const index = buildIndex(pieces)
    // Neighbor's south = tip → flat toward it = flatRotation['north'] = 0
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(0)
  })

  it('flat-to-flat: neighbor rot 180 to south shows flat on north side (tip)', () => {
    // Neighbor to south has rot 180 (flat south, tip north). North side = TIP.
    // TIP → flat toward it
    const pieces = [makePiece('t1', 'triangle_hull', 2, 0, 6, 180)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(180)
  })

  it('flat-to-flat: neighbor rot 270 (flat east) to east shows flat on west', () => {
    // Neighbor to east has rot 270 → west side is tip → flat toward it
    const pieces = [makePiece('t1', 'triangle_hull', 3, 0, 5, 270)]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 2, y: 0, z: 5 }, index, pieces)).toBe(270)
  })

  // Chain scenario: square → A → B → C
  it('chain: C flat toward B when B shows flat on north', () => {
    // square(2,0,5) → A(2,0,4,rot180) → B(1,0,4,rot0) → C(1,0,3)
    // B rot 0: north=flat. C sees B's north (flat) → flat toward south = 180
    const pieces = [
      makePiece('h1', 'square_hull', 2, 0, 5),
      makePiece('t1', 'triangle_hull', 2, 0, 4, 180),
      makePiece('t2', 'triangle_hull', 1, 0, 4, 0),
    ]
    const index = buildIndex(pieces)
    expect(detectTriangleRotation({ x: 1, y: 0, z: 3 }, index, pieces)).toBe(180)
  })

  it('prefers square over triangle neighbor', () => {
    const pieces = [
      makePiece('h1', 'square_hull', 2, 0, 4),
      makePiece('t1', 'triangle_hull', 3, 0, 5, 180),
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

  it('offsets for slope-to-slope with anchored neighbor', () => {
    // square(4,0,5) anchors A(3,0,5,rot0). A's west = slope.
    // B at (2,0,5) sees A's west slope → offset east toward A
    const pieces = [
      makePiece('h1', 'square_hull', 4, 0, 5),
      makePiece('t1', 'triangle_hull', 3, 0, 5, 0), // north=flat, west=slope
    ]
    const index = buildIndex(pieces)
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, index, pieces)).toEqual({ x: 0.5, z: 0 })
  })

  it('does not offset for flat-to-flat contact', () => {
    // A(3,0,5,rot270) has flat on east side. B at (2,0,5) sees A on east.
    // Wait — A is to the east, we check A's west side. rot270: west=tip → flat toward
    // Let's use rot0: north=flat. Neighbor to north with rot0 → south=tip → no slope
    const pieces = [
      makePiece('h1', 'square_hull', 2, 0, 3),       // anchors A
      makePiece('t1', 'triangle_hull', 2, 0, 4, 0),  // flat north, south=tip
    ]
    const index = buildIndex(pieces)
    // B at (2,0,5) sees A to north. A's south = tip → not slope → no offset
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, index, pieces)).toEqual({ x: 0, z: 0 })
  })

  it('does not offset when anchored (has square neighbor)', () => {
    const pieces = [
      makePiece('h1', 'square_hull', 1, 0, 5),
      makePiece('t1', 'triangle_hull', 3, 0, 5, 0),
    ]
    const index = buildIndex(pieces)
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, index, pieces)).toEqual({ x: 0, z: 0 })
  })

  it('does not offset when neighbor is not anchored', () => {
    // Two free triangles with slopes facing each other — but neighbor not anchored
    const pieces = [makePiece('t1', 'triangle_hull', 3, 0, 5, 0)]
    const index = buildIndex(pieces)
    expect(detectTriangleOffset({ x: 2, y: 0, z: 5 }, index, pieces)).toEqual({ x: 0, z: 0 })
  })

  it('chain: no offset for flat-to-flat in chain', () => {
    // square(2,0,5) → A(2,0,4,rot180) → B(1,0,4,rot0)
    // C at (1,0,3): B's north = flat → no slope → no offset
    const pieces = [
      makePiece('h1', 'square_hull', 2, 0, 5),
      makePiece('t1', 'triangle_hull', 2, 0, 4, 180),
      makePiece('t2', 'triangle_hull', 1, 0, 4, 0),
    ]
    const index = buildIndex(pieces)
    expect(detectTriangleOffset({ x: 1, y: 0, z: 3 }, index, pieces)).toEqual({ x: 0, z: 0 })
  })
})
