import { describe, it, expect } from 'vitest'
import {
  HEX_SIZE,
  HEX_ORIGIN,
  hexCenter,
  triSlotRotationDeg,
  triSlotVertices,
  triSlotWorldPosition,
  triNeighbors,
  worldToTriCoord,
  triEdgeWorldPosition,
  triEdgeRotationDeg,
  detectTriEdge,
} from '../src/core/utils/hexGrid'

const SQRT3 = Math.sqrt(3)

function dist(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2)
}

// ---------------------------------------------------------------------------
// hexCenter
// ---------------------------------------------------------------------------
describe('hexCenter', () => {
  it('returns HEX_ORIGIN for hex (0,0)', () => {
    const c = hexCenter(0, 0)
    expect(c.x).toBeCloseTo(HEX_ORIGIN.x)
    expect(c.z).toBeCloseTo(HEX_ORIGIN.z)
  })

  it('returns correct world position for hex (1,0)', () => {
    const c = hexCenter(1, 0)
    expect(c.x).toBeCloseTo(HEX_ORIGIN.x + HEX_SIZE * 1.5)
    expect(c.z).toBeCloseTo(HEX_ORIGIN.z + HEX_SIZE * SQRT3 * 0.5)
  })

  it('returns correct world position for hex (0,1)', () => {
    const c = hexCenter(0, 1)
    expect(c.x).toBeCloseTo(HEX_ORIGIN.x)
    expect(c.z).toBeCloseTo(HEX_ORIGIN.z + HEX_SIZE * SQRT3)
  })
})

// ---------------------------------------------------------------------------
// triSlotRotationDeg
// ---------------------------------------------------------------------------
describe('triSlotRotationDeg', () => {
  it('slot 0 → 210 degrees (tip points toward hex center)', () => {
    expect(triSlotRotationDeg(0)).toBe(210)
  })

  it('slot 3 → 390 degrees', () => {
    expect(triSlotRotationDeg(3)).toBe(390)
  })

  it('each slot increments by 60 degrees with 210 offset', () => {
    for (let s = 0; s < 6; s++) {
      expect(triSlotRotationDeg(s)).toBe(s * 60 + 210)
    }
  })
})

// ---------------------------------------------------------------------------
// triSlotVertices
// ---------------------------------------------------------------------------
describe('triSlotVertices', () => {
  it('returns exactly 3 vertices for all slots', () => {
    for (let s = 0; s < 6; s++) {
      const verts = triSlotVertices(0, 0, s)
      expect(verts).toHaveLength(3)
    }
  })

  it('vertex 0 is at hex center for hex (0,0)', () => {
    const center = hexCenter(0, 0)
    for (let s = 0; s < 6; s++) {
      const verts = triSlotVertices(0, 0, s)
      expect(verts[0].x).toBeCloseTo(center.x, 5)
      expect(verts[0].z).toBeCloseTo(center.z, 5)
    }
  })

  it('all 3 edges are equal length (equilateral triangle)', () => {
    for (let s = 0; s < 6; s++) {
      const [v0, v1, v2] = triSlotVertices(0, 0, s)
      const d01 = dist(v0, v1)
      const d12 = dist(v1, v2)
      const d20 = dist(v2, v0)
      expect(d01).toBeCloseTo(d12)
      expect(d12).toBeCloseTo(d20)
    }
  })

  it('vertex 0 is at hex center for a non-origin hex', () => {
    const center = hexCenter(2, -1)
    for (let s = 0; s < 6; s++) {
      const verts = triSlotVertices(2, -1, s)
      expect(verts[0].x).toBeCloseTo(center.x)
      expect(verts[0].z).toBeCloseTo(center.z)
    }
  })
})

// ---------------------------------------------------------------------------
// triSlotWorldPosition
// ---------------------------------------------------------------------------
describe('triSlotWorldPosition', () => {
  it('y coordinate equals the floor level parameter', () => {
    const pos = triSlotWorldPosition(0, 3, 0, 0)
    expect(pos.y).toBe(3)
  })

  it('y = 0 when floor level is 0', () => {
    const pos = triSlotWorldPosition(0, 0, 0, 0)
    expect(pos.y).toBe(0)
  })

  it('returns an object with x, y, z properties', () => {
    const pos = triSlotWorldPosition(1, 0, -1, 2)
    expect(typeof pos.x).toBe('number')
    expect(typeof pos.y).toBe('number')
    expect(typeof pos.z).toBe('number')
  })

  it('position is centroid of the triangle vertices', () => {
    const hq = 0, hr = 0, slot = 0, y = 0
    const verts = triSlotVertices(hq, hr, slot)
    const cx = (verts[0].x + verts[1].x + verts[2].x) / 3
    const cz = (verts[0].z + verts[1].z + verts[2].z) / 3
    const pos = triSlotWorldPosition(hq, y, hr, slot)
    expect(pos.x).toBeCloseTo(cx)
    expect(pos.z).toBeCloseTo(cz)
  })
})

// ---------------------------------------------------------------------------
// triNeighbors
// ---------------------------------------------------------------------------
describe('triNeighbors', () => {
  it('returns exactly 3 neighbors for any slot', () => {
    for (let s = 0; s < 6; s++) {
      expect(triNeighbors(0, 0, s)).toHaveLength(3)
    }
  })

  it('2 internal neighbors share same hex coordinates', () => {
    for (let s = 0; s < 6; s++) {
      const neighbors = triNeighbors(0, 0, s)
      const internal = neighbors.filter(n => n.hq === 0 && n.hr === 0)
      expect(internal).toHaveLength(2)
    }
  })

  it('internal neighbors have correct slot indices (prev and next)', () => {
    for (let s = 0; s < 6; s++) {
      const neighbors = triNeighbors(0, 0, s)
      const internal = neighbors.filter(n => n.hq === 0 && n.hr === 0)
      const slots = internal.map(n => n.slot).sort((a, b) => a - b)
      const prev = (s + 5) % 6
      const next = (s + 1) % 6
      const expected = [prev, next].sort((a, b) => a - b)
      expect(slots).toEqual(expected)
    }
  })

  it('1 external neighbor is in an adjacent hex', () => {
    for (let s = 0; s < 6; s++) {
      const neighbors = triNeighbors(0, 0, s)
      const external = neighbors.filter(n => !(n.hq === 0 && n.hr === 0))
      expect(external).toHaveLength(1)
    }
  })

  it('external neighbor has opposite slot (slot + 3) % 6', () => {
    for (let s = 0; s < 6; s++) {
      const neighbors = triNeighbors(0, 0, s)
      const external = neighbors.find(n => !(n.hq === 0 && n.hr === 0))!
      expect(external.slot).toBe((s + 3) % 6)
    }
  })
})

// ---------------------------------------------------------------------------
// worldToTriCoord
// ---------------------------------------------------------------------------
describe('worldToTriCoord', () => {
  it('round-trip: triSlotWorldPosition → worldToTriCoord for all 6 slots in hex (0,0)', () => {
    for (let s = 0; s < 6; s++) {
      const pos = triSlotWorldPosition(0, 0, 0, s)
      const result = worldToTriCoord(pos.x, pos.z)
      expect(result.hq).toBe(0)
      expect(result.hr).toBe(0)
      expect(result.slot).toBe(s)
    }
  })

  it('round-trip: triSlotWorldPosition → worldToTriCoord for hex (1,-1)', () => {
    for (let s = 0; s < 6; s++) {
      const pos = triSlotWorldPosition(1, 0, -1, s)
      const result = worldToTriCoord(pos.x, pos.z)
      expect(result.hq).toBe(1)
      expect(result.hr).toBe(-1)
      expect(result.slot).toBe(s)
    }
  })

  it('HEX_ORIGIN maps to hex (0,0)', () => {
    const result = worldToTriCoord(HEX_ORIGIN.x, HEX_ORIGIN.z)
    expect(result.hq).toBe(0)
    expect(result.hr).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// triEdgeWorldPosition
// ---------------------------------------------------------------------------
describe('triEdgeWorldPosition', () => {
  it('returns midpoint of the edge', () => {
    const pos = triEdgeWorldPosition(0, 0, 0, 0, 0)
    expect(typeof pos.x).toBe('number')
    expect(typeof pos.z).toBe('number')
    expect(pos.y).toBe(0)
  })

  it('each edge has a different position', () => {
    const e0 = triEdgeWorldPosition(0, 0, 0, 0, 0)
    const e1 = triEdgeWorldPosition(0, 0, 0, 0, 1)
    const e2 = triEdgeWorldPosition(0, 0, 0, 0, 2)
    const dist01 = Math.sqrt((e0.x - e1.x) ** 2 + (e0.z - e1.z) ** 2)
    const dist12 = Math.sqrt((e1.x - e2.x) ** 2 + (e1.z - e2.z) ** 2)
    expect(dist01).toBeGreaterThan(0.01)
    expect(dist12).toBeGreaterThan(0.01)
  })

  it('floor level offsets y', () => {
    const e = triEdgeWorldPosition(0, 2, 0, 0, 0)
    expect(e.y).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// triEdgeRotationDeg
// ---------------------------------------------------------------------------
describe('triEdgeRotationDeg', () => {
  it('returns a rotation for each edge', () => {
    for (let e = 0; e < 3; e++) {
      const rot = triEdgeRotationDeg(0, e)
      expect(typeof rot).toBe('number')
    }
  })
})

// ---------------------------------------------------------------------------
// detectTriEdge
// ---------------------------------------------------------------------------
describe('detectTriEdge', () => {
  it('detects each edge when cursor is near its midpoint', () => {
    for (let e = 0; e < 3; e++) {
      const mid = triEdgeWorldPosition(0, 0, 0, 0, e)
      const result = detectTriEdge(0, 0, 0, mid.x, mid.z)
      expect(result).toBe(e)
    }
  })
})
