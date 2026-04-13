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

/** Hex outer radius: distance from hex center to vertex.
 *  With HEX_SIZE = 1.0, triangle edge length = 1.0 (matches square cell width). */
export const HEX_SIZE = 1.0

/**
 * Offset so that hex (0,0) center sits at the right edge of the square grid.
 * Square grid runs x:[0,5] z:[0,11]. We place hex origin at x=5, z=5.5
 * so triangles attach naturally to the east wall of the building.
 */
export const HEX_ORIGIN = { x: 5, z: 5.5 }

/**
 * World-space center of a hex cell at axial coordinates (hq, hr).
 */
export function hexCenter(hq: number, hr: number): { x: number; z: number } {
  return {
    x: HEX_ORIGIN.x + HEX_SIZE * (3 / 2) * hq,
    z: HEX_ORIGIN.z + HEX_SIZE * SQRT3 * (hr + hq / 2),
  }
}

/**
 * Visual rotation in degrees for a triangle slot.
 * The rendered triangle tip points inward toward the hex center.
 * The outer edge (edge 1) faces outward at angle `slot * 60 + 30`.
 * The tip is opposite: `slot * 60 + 210`.
 */
export function triSlotRotationDeg(slot: number): number {
  return slot * 60 + 210
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
  // Subtract origin offset before inverse axial conversion
  const lx = wx - HEX_ORIGIN.x
  const lz = wz - HEX_ORIGIN.z
  const fq = ((2 / 3) * lx) / HEX_SIZE
  const fr = ((-1 / 3) * lx + (SQRT3 / 3) * lz) / HEX_SIZE

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

/** Rotation angle (degrees) for an edge piece on a triangle edge.
 *  Returns the Y-rotation so that a "north" EdgeMesh extends along the edge direction.
 *  The EdgeMesh extends along X at rotation 0; rotating by -α makes it extend along α. */
export function triEdgeRotationDeg(slot: number, edge: number): number {
  // Compute actual edge direction from vertices (use hex (0,0); offsets cancel in the diff)
  const verts = triSlotVertices(0, 0, slot)
  const i0 = edge
  const i1 = (edge + 1) % 3
  const dx = verts[i1].x - verts[i0].x
  const dz = verts[i1].z - verts[i0].z
  const edgeAngleDeg = Math.atan2(dz, dx) * (180 / Math.PI)
  return -edgeAngleDeg
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

/**
 * Compute world-space centroid and tip angle for a triangle snapped to a square cell edge.
 * The triangle's flat edge aligns with the square edge; the tip points outward.
 *
 * Square cell at (sx, sz) occupies world-space [sx, sx+1] × [sz, sz+1].
 * Inradius = 1/(2√3) is the centroid-to-flat-edge distance for edge length 1.
 */
export function squareEdgeSnapPosition(
  sx: number, sz: number, side: 'north' | 'south' | 'east' | 'west'
): { worldX: number; worldZ: number; angleDeg: number } {
  const inR = 1 / (2 * SQRT3)
  switch (side) {
    case 'east':
      return { worldX: sx + 1 + inR, worldZ: sz + 0.5, angleDeg: 0 }
    case 'west':
      return { worldX: sx - inR, worldZ: sz + 0.5, angleDeg: 180 }
    case 'south':
      return { worldX: sx + 0.5, worldZ: sz + 1 + inR, angleDeg: 90 }
    case 'north':
      return { worldX: sx + 0.5, worldZ: sz - inR, angleDeg: 270 }
  }
}

/**
 * Compute the two free-edge neighbor positions for a snapped triangle.
 * Each equilateral triangle has 3 edges; one is the "parent" edge (occupied).
 * The other two can accept new triangles.
 *
 * For a triangle at (cx, cz) with tip at angleDeg α:
 *   Left neighbor:  centroid offset by d at angle (α+60°), angleDeg = α+60°
 *   Right neighbor: centroid offset by d at angle (α-60°), angleDeg = α-60°
 *   where d = 2 * inradius = 1/√3
 */
export function triSnapNeighbors(
  worldX: number, worldZ: number, angleDeg: number
): [{ worldX: number; worldZ: number; angleDeg: number }, { worldX: number; worldZ: number; angleDeg: number }] {
  const d = 1 / SQRT3
  const leftDeg = angleDeg + 60
  const rightDeg = angleDeg - 60
  const leftRad = (leftDeg * Math.PI) / 180
  const rightRad = (rightDeg * Math.PI) / 180
  return [
    { worldX: worldX + d * Math.cos(leftRad), worldZ: worldZ + d * Math.sin(leftRad), angleDeg: leftDeg },
    { worldX: worldX + d * Math.cos(rightRad), worldZ: worldZ + d * Math.sin(rightRad), angleDeg: rightDeg },
  ]
}

/**
 * Compute the 3 vertices of a snap-placed triangle in world space.
 * Vertex order: [tip, base_left, base_right] — same as CellMesh rendering.
 */
export function triSnapVertices(
  worldX: number, worldZ: number, angleDeg: number
): [{ x: number; z: number }, { x: number; z: number }, { x: number; z: number }] {
  const angleRad = (angleDeg * Math.PI) / 180
  const circumR = HEX_SIZE / SQRT3
  const inR = HEX_SIZE / (2 * SQRT3)
  const halfEdge = HEX_SIZE / 2
  const perpRad = angleRad + Math.PI / 2
  const bx = worldX - inR * Math.cos(angleRad)
  const bz = worldZ - inR * Math.sin(angleRad)
  const px = halfEdge * Math.cos(perpRad)
  const pz = halfEdge * Math.sin(perpRad)
  return [
    { x: worldX + circumR * Math.cos(angleRad), z: worldZ + circumR * Math.sin(angleRad) },
    { x: bx + px, z: bz + pz },
    { x: bx - px, z: bz - pz },
  ]
}

/** World position (midpoint) of a snap-placed triangle's edge. */
export function triSnapEdgeWorldPosition(
  worldX: number, worldZ: number, angleDeg: number, y: number, edge: number
): { x: number; y: number; z: number } {
  const verts = triSnapVertices(worldX, worldZ, angleDeg)
  const i0 = edge
  const i1 = (edge + 1) % 3
  return {
    x: (verts[i0].x + verts[i1].x) / 2,
    y,
    z: (verts[i0].z + verts[i1].z) / 2,
  }
}

/** Rotation angle for an edge piece on a snap-placed triangle's edge. */
export function triSnapEdgeRotationDeg(worldX: number, worldZ: number, angleDeg: number, edge: number): number {
  const verts = triSnapVertices(worldX, worldZ, angleDeg)
  const i0 = edge
  const i1 = (edge + 1) % 3
  const dx = verts[i1].x - verts[i0].x
  const dz = verts[i1].z - verts[i0].z
  return -Math.atan2(dz, dx) * (180 / Math.PI)
}

/** Detect which edge (0, 1, 2) a world point is closest to on a snap-placed triangle. */
export function detectTriSnapEdge(
  worldX: number, worldZ: number, angleDeg: number,
  wx: number, wz: number,
): 0 | 1 | 2 {
  const verts = triSnapVertices(worldX, worldZ, angleDeg)
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
