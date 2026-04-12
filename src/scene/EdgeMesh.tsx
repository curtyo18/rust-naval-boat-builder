import type { PieceSide } from '../types'

interface EdgeMeshProps {
  type: string
  side: PieceSide
  color: string
  opacity?: number
  roughness?: number
}

const THICKNESS = 0.08
const WALL_W = 0.96
const WALL_H = 0.95

/**
 * Renders edge pieces with distinct geometry per type.
 * Positioned at local origin — parent <group> handles world placement.
 *
 * - wall: single solid box
 * - window: frame with a rectangular cutout (4 boxes around the opening)
 * - doorway: frame with a door-shaped cutout (3 boxes: top + two sides)
 * - low_wall / low_cannon_wall / low_wall_barrier: short solid box
 */
export default function EdgeMesh({ type, side, color, opacity = 1, roughness = 0.85 }: EdgeMeshProps) {
  const isNS = side === 'north' || side === 'south'
  const transparent = opacity < 1
  const mat = { color, opacity, transparent, roughness }

  // Low walls — simple short box
  if (type.includes('low') || type.includes('barrier')) {
    const h = 0.33
    const size: [number, number, number] = isNS
      ? [WALL_W, h, THICKNESS]
      : [THICKNESS, h, WALL_W]
    return (
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial {...mat} />
      </mesh>
    )
  }

  // Window — frame with rectangular cutout in the center
  if (type === 'window') {
    return <WindowFrame isNS={isNS} mat={mat} />
  }

  // Doorway — frame with door-shaped opening at the bottom
  if (type === 'doorway') {
    return <DoorwayFrame isNS={isNS} mat={mat} />
  }

  // Default wall — solid box
  const size: [number, number, number] = isNS
    ? [WALL_W, WALL_H, THICKNESS]
    : [THICKNESS, WALL_H, WALL_W]
  return (
    <mesh>
      <boxGeometry args={size} />
      <meshStandardMaterial {...mat} />
    </mesh>
  )
}

interface FrameProps {
  isNS: boolean
  mat: { color: string; opacity: number; transparent: boolean; roughness: number }
}

/**
 * Window: 4 boxes forming a frame around a centered rectangular opening.
 * Opening is ~40% wide × ~35% tall, centered vertically.
 */
function WindowFrame({ isNS, mat }: FrameProps) {
  const openW = 0.38   // opening width
  const openH = 0.33   // opening height
  const sillH = 0.35   // height of bottom sill from wall base
  const topH = WALL_H - sillH - openH  // lintel height
  const sideW = (WALL_W - openW) / 2   // each side pillar width

  // Along-wall axis (x for NS, z for EW)
  const parts: { size: [number, number, number]; pos: [number, number, number] }[] = isNS
    ? [
        // Bottom sill
        { size: [WALL_W, sillH, THICKNESS], pos: [0, -(WALL_H - sillH) / 2, 0] },
        // Top lintel
        { size: [WALL_W, topH, THICKNESS], pos: [0, (WALL_H - topH) / 2, 0] },
        // Left pillar
        { size: [sideW, openH, THICKNESS], pos: [-(openW + sideW) / 2, (sillH - (WALL_H - openH) / 2 + openH / 2) - WALL_H / 2 + sillH + openH / 2 - (WALL_H / 2 - sillH - openH / 2), 0] },
        // Right pillar
        { size: [sideW, openH, THICKNESS], pos: [(openW + sideW) / 2, 0, 0] },
      ]
    : [
        { size: [THICKNESS, sillH, WALL_W], pos: [0, -(WALL_H - sillH) / 2, 0] },
        { size: [THICKNESS, topH, WALL_W], pos: [0, (WALL_H - topH) / 2, 0] },
        { size: [THICKNESS, openH, sideW], pos: [0, 0, -(openW + sideW) / 2] },
        { size: [THICKNESS, openH, sideW], pos: [0, 0, (openW + sideW) / 2] },
      ]

  // Fix pillar Y positions: center them vertically at the opening's center
  const openCenterY = sillH + openH / 2 - WALL_H / 2
  if (isNS) {
    parts[2].pos[1] = openCenterY
    parts[3].pos[1] = openCenterY
  } else {
    parts[2].pos[1] = openCenterY
    parts[3].pos[1] = openCenterY
  }

  return (
    <group>
      {parts.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <boxGeometry args={p.size} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Doorway: 3 boxes forming a frame with a door-shaped opening at the bottom.
 * Opening is ~40% wide × ~70% tall, starting from the base.
 */
function DoorwayFrame({ isNS, mat }: FrameProps) {
  const openW = 0.38   // opening width
  const openH = 0.68   // opening height (door)
  const topH = WALL_H - openH  // lintel above door
  const sideW = (WALL_W - openW) / 2

  const topY = (WALL_H - topH) / 2
  const sideY = -(WALL_H - openH) / 2

  const parts: { size: [number, number, number]; pos: [number, number, number] }[] = isNS
    ? [
        // Top lintel
        { size: [WALL_W, topH, THICKNESS], pos: [0, topY, 0] },
        // Left pillar
        { size: [sideW, openH, THICKNESS], pos: [-(openW + sideW) / 2, sideY, 0] },
        // Right pillar
        { size: [sideW, openH, THICKNESS], pos: [(openW + sideW) / 2, sideY, 0] },
      ]
    : [
        { size: [THICKNESS, topH, WALL_W], pos: [0, topY, 0] },
        { size: [THICKNESS, openH, sideW], pos: [0, sideY, -(openW + sideW) / 2] },
        { size: [THICKNESS, openH, sideW], pos: [0, sideY, (openW + sideW) / 2] },
      ]

  return (
    <group>
      {parts.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <boxGeometry args={p.size} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
    </group>
  )
}
