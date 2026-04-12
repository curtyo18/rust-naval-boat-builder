/**
 * Hex Grid Math Module
 *
 * Pure math for a hex-based triangular coordinate system.
 * Each hex contains 6 equilateral triangle slots.
 * No React or Three.js dependencies.
 *
 * Triangle edge length = 1.0 (matches square cell width)
 * HEX_SIZE (outer radius) = 1 / sqrt(3) ≈ 0.577
 */

export const SQRT3 = Math.sqrt(3)

/** Hex outer radius: distance from hex center to vertex */
export const HEX_SIZE = 1 / SQRT3

/**
 * World-space center of a hex cell at axial coordinates (hq, hr).
 */
export function hexCenter(hq: number, hr: number): { x: number; z: number } {
  return {
    x: HEX_SIZE * (3 / 2) * hq,
    z: HEX_SIZE * SQRT3 * (hr + hq / 2),
  }
}

/**
 * Visual rotation in degrees for a triangle slot.
 * slot * 60.
 */
export function triSlotRotationDeg(slot: number): number {
  return slot * 60
}

/**
 * The 3 vertices of a triangle slot.
 * Vertex 0 = hex center
 * Vertex 1 = hex boundary vertex at index `slot`
 * Vertex 2 = hex boundary vertex at index `(slot + 1) % 6`
 *
 * Hex boundary vertex i is at angle 60*i degrees from +X axis, distance HEX_SIZE from center.
 */
export function triSlotVertices(
  hq: number,
  hr: number,
  slot: number
): [{ x: number; z: number }, { x: number; z: number }, { x: number; z: number }] {
  const center = hexCenter(hq, hr)

  const hexVertex = (i: number): { x: number; z: number } => {
    const angleRad = (60 * i * Math.PI) / 180
    return {
      x: center.x + HEX_SIZE * Math.cos(angleRad),
      z: center.z + HEX_SIZE * Math.sin(angleRad),
    }
  }

  return [center, hexVertex(slot), hexVertex((slot + 1) % 6)]
}

/**
 * World-space centroid of a triangle slot.
 * x, z = average of the 3 vertices; y = floor level parameter.
 */
export function triSlotWorldPosition(
  hq: number,
  y: number,
  hr: number,
  slot: number
): { x: number; y: number; z: number } {
  const [v0, v1, v2] = triSlotVertices(hq, hr, slot)
  return {
    x: (v0.x + v1.x + v2.x) / 3,
    y,
    z: (v0.z + v1.z + v2.z) / 3,
  }
}

/**
 * Hex direction vectors for external neighbor lookup.
 * Index corresponds to the slot whose external face points toward that direction.
 */
const HEX_DIRECTIONS = [
  { dq: 1, dr: -1 }, // slot 0 → NE hex
  { dq: 0, dr: -1 }, // slot 1 → N hex
  { dq: -1, dr: 0 }, // slot 2 → NW hex
  { dq: -1, dr: 1 }, // slot 3 → SW hex
  { dq: 0, dr: 1 },  // slot 4 → S hex
  { dq: 1, dr: 0 },  // slot 5 → SE hex
]

/**
 * Returns the 3 neighbors of triangle (hq, hr, slot):
 * - 2 internal: same hex, slots (slot-1)%6 and (slot+1)%6
 * - 1 external: adjacent hex with slot (slot+3)%6
 */
export function triNeighbors(
  hq: number,
  hr: number,
  slot: number
): Array<{ hq: number; hr: number; slot: number }> {
  const prev = (slot + 5) % 6
  const next = (slot + 1) % 6
  const { dq, dr } = HEX_DIRECTIONS[slot]

  return [
    { hq, hr, slot: prev },
    { hq, hr, slot: next },
    { hq: hq + dq, hr: hr + dr, slot: (slot + 3) % 6 },
  ]
}

/**
 * Convert world XZ to nearest triangle coordinate.
 *
 * 1. Inverse axial: fractional hex from world position
 * 2. Cube round to nearest hex
 * 3. Angle from hex center to cursor → slot = floor(angle / 60) % 6
 */
export function worldToTriCoord(wx: number, wz: number): { hq: number; hr: number; slot: number } {
  const fq = ((2 / 3) * wx) / HEX_SIZE
  const fr = ((-1 / 3) * wx + (SQRT3 / 3) * wz) / HEX_SIZE

  const fs = -fq - fr
  let rq = Math.round(fq)
  let rr = Math.round(fr)
  const rs = Math.round(fs)

  const dq = Math.abs(rq - fq)
  const dr = Math.abs(rr - fr)
  const ds = Math.abs(rs - fs)

  if (dq > dr && dq > ds) {
    rq = -rr - rs
  } else if (dr > ds) {
    rr = -rq - rs
  }

  const center = hexCenter(rq, rr)
  const dx = wx - center.x
  const dz = wz - center.z
  let angle = Math.atan2(dz, dx) * (180 / Math.PI)
  if (angle < 0) angle += 360

  const slot = Math.floor(angle / 60) % 6

  return { hq: rq || 0, hr: rr || 0, slot }
}

/**
 * Triangle edge indices:
 *   Edge 0: between vertex 0 (center) and vertex 1 (boundary v[slot])
 *   Edge 1: between vertex 1 (boundary v[slot]) and vertex 2 (boundary v[slot+1])
 *   Edge 2: between vertex 2 (boundary v[slot+1]) and vertex 0 (center)
 *
 * Edge 1 is the "outer" edge (on the hex boundary).
 * Edges 0 and 2 are "inner" edges (radiate from hex center).
 */

/** World position (midpoint) of a triangle edge. */
export function triEdgeWorldPosition(
  hq: number,
  y: number,
  hr: number,
  slot: number,
  edge: number,
): { x: number; y: number; z: number } {
  const verts = triSlotVertices(hq, hr, slot)
  const i0 = edge
  const i1 = (edge + 1) % 3
  return {
    x: (verts[i0].x + verts[i1].x) / 2,
    y,
    z: (verts[i0].z + verts[i1].z) / 2,
  }
}

/** Rotation angle (degrees) for an edge piece on a triangle edge. */
export function triEdgeRotationDeg(slot: number, edge: number): number {
  // Edge direction is determined by which vertices it connects.
  // We compute the angle of the edge vector.
  // For simplicity, use slot base angle + offset per edge.
  const baseAngle = slot * 60
  switch (edge) {
    case 0: return baseAngle           // center → boundary[slot]: radial direction
    case 1: return baseAngle + 150     // boundary[slot] → boundary[slot+1]: outer edge
    case 2: return baseAngle + 60 + 180 // boundary[slot+1] → center: other radial
    default: return 0
  }
}

/**
 * Detect which triangle edge (0, 1, 2) a world point is closest to.
 */
export function detectTriEdge(
  hq: number,
  hr: number,
  slot: number,
  wx: number,
  wz: number,
): 0 | 1 | 2 {
  const verts = triSlotVertices(hq, hr, slot)

  let minDist = Infinity
  let closest: 0 | 1 | 2 = 0

  for (let e = 0; e < 3; e++) {
    const i0 = e
    const i1 = (e + 1) % 3
    const mx = (verts[i0].x + verts[i1].x) / 2
    const mz = (verts[i0].z + verts[i1].z) / 2
    const dist = (wx - mx) ** 2 + (wz - mz) ** 2
    if (dist < minDist) {
      minDist = dist
      closest = e as 0 | 1 | 2
    }
  }

  return closest
}
