import type { PieceSide } from '../types'
import { getTierMaterial } from './pieceGeometry'
import { getTierTexture } from './tierTextures'

const SIDE_ROTATIONS: Record<PieceSide, number> = {
  north: 0,
  east: Math.PI / 2,
  south: Math.PI,
  west: -Math.PI / 2,
}

interface EdgeMeshProps {
  type: string
  side: PieceSide
  color: string
  opacity?: number
  roughness?: number
  tier?: string
}

const THICKNESS = 0.08
const WALL_W = 1
const WALL_H = 1.0

/**
 * Renders edge pieces with distinct geometry per type.
 * Positioned at local origin — parent <group> handles world placement.
 */
export default function EdgeMesh({ type, side, color, opacity = 1, tier }: EdgeMeshProps) {
  const isNS = side === 'north' || side === 'south'
  const transparent = opacity < 1
  const tierMat = getTierMaterial(tier)
  const map = tierMat.useTexture ? getTierTexture(tier) : undefined
  const mat = {
    color,
    opacity,
    transparent,
    roughness: tierMat.roughness,
    metalness: tierMat.metalness,
    ...(map ? { map } : {}),
  }

  // Cannon wall — short wall with center cutout for cannon barrel
  if (type === 'low_cannon_wall') {
    return <CannonWall isNS={isNS} mat={mat} />
  }

  // Low barrier — fence-style with horizontal planks and gaps
  if (type === 'low_wall_barrier') {
    return <FenceBarrier isNS={isNS} mat={mat} />
  }

  // Low walls — simple short box
  if (type.includes('low')) {
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

  // Half walls — mid-height short box (1/2 of full wall)
  if (type === 'half_wall') {
    const h = 0.5
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

  // Boat stairs — 3 ascending steps against the wall edge
  if (type === 'boat_stairs') {
    return <StairsMesh side={side} mat={mat} />
  }

  // Window — frame with rectangular cutout in the center
  if (type === 'window') {
    return <WindowFrame isNS={isNS} mat={mat} />
  }

  // Doorway — frame with door-shaped opening at the bottom
  if (type === 'doorway') {
    return <DoorwayFrame isNS={isNS} mat={mat} />
  }

  // Double door frame — full-height wide rectangular cutout
  if (type === 'double_door_frame') {
    return <DoubleDoorFrame isNS={isNS} mat={mat} />
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
  mat: Record<string, unknown>
}

/**
 * Window: 4 boxes forming a frame around a centered rectangular opening.
 * Opening is ~40% wide × ~35% tall, centered vertically.
 */
function WindowFrame({ isNS, mat }: FrameProps) {
  const openW = 0.55   // opening width
  const openH = 0.45   // opening height
  const sillH = 0.28   // height of bottom sill from wall base
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

/**
 * Double door frame: 4-sided border with a large central opening —
 * the wall-mounted analogue of the square floor frame.
 */
function DoubleDoorFrame({ isNS, mat }: FrameProps) {
  const FRAME_T = 0.12
  const innerH = WALL_H - 2 * FRAME_T
  const topY = (WALL_H - FRAME_T) / 2
  const botY = -(WALL_H - FRAME_T) / 2
  const sideOffset = (WALL_W - FRAME_T) / 2

  const parts: { size: [number, number, number]; pos: [number, number, number] }[] = isNS
    ? [
        { size: [WALL_W, FRAME_T, THICKNESS], pos: [0, topY, 0] },
        { size: [WALL_W, FRAME_T, THICKNESS], pos: [0, botY, 0] },
        { size: [FRAME_T, innerH, THICKNESS], pos: [-sideOffset, 0, 0] },
        { size: [FRAME_T, innerH, THICKNESS], pos: [sideOffset, 0, 0] },
      ]
    : [
        { size: [THICKNESS, FRAME_T, WALL_W], pos: [0, topY, 0] },
        { size: [THICKNESS, FRAME_T, WALL_W], pos: [0, botY, 0] },
        { size: [THICKNESS, innerH, FRAME_T], pos: [0, 0, -sideOffset] },
        { size: [THICKNESS, innerH, FRAME_T], pos: [0, 0, sideOffset] },
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

/**
 * Stairs: 3 steps ascending away from the wall edge.
 * Steps ascend inward from the edge (north stairs ascend toward south).
 */
function StairsMesh({ side, mat }: { side: PieceSide; mat: FrameProps['mat'] }) {
  const steps = 3
  const stepW = 0.9
  const stepH = 0.3
  const stepD = 0.28
  const totalH = stepH * steps

  // Build steps ascending along +Z (away from north edge), then rotate to match side
  const rotation = SIDE_ROTATIONS[side]

  return (
    <group rotation={[0, rotation, 0]}>
      {Array.from({ length: steps }, (_, i) => {
        const y = stepH * i + stepH / 2 - totalH / 2
        const z = stepD * i + stepD / 2
        return (
          <mesh key={i} position={[0, y, z]}>
            <boxGeometry args={[stepW, stepH, stepD]} />
            <meshStandardMaterial {...mat} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * Cannon wall: short wall (0.33) with a rectangular cutout in the center
 * for a cannon barrel to poke through.
 */
function CannonWall({ isNS, mat }: FrameProps) {
  const H = 0.33
  const openW = 0.22
  const sideW = (WALL_W - openW) / 2

  // 3 pieces: bottom strip + two side pillars (cutout open to the top)
  const botH = 0.14
  const pillarH = H - botH
  const botY = -(H - botH) / 2
  const pillarY = (H - pillarH) / 2

  const parts: { size: [number, number, number]; pos: [number, number, number] }[] = isNS
    ? [
        { size: [WALL_W, botH, THICKNESS], pos: [0, botY, 0] },
        { size: [sideW, pillarH, THICKNESS], pos: [-(openW + sideW) / 2, pillarY, 0] },
        { size: [sideW, pillarH, THICKNESS], pos: [(openW + sideW) / 2, pillarY, 0] },
      ]
    : [
        { size: [THICKNESS, botH, WALL_W], pos: [0, botY, 0] },
        { size: [THICKNESS, pillarH, sideW], pos: [0, pillarY, -(openW + sideW) / 2] },
        { size: [THICKNESS, pillarH, sideW], pos: [0, pillarY, (openW + sideW) / 2] },
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

/**
 * Fence barrier: horizontal planks with gaps between them, two end posts.
 */
function FenceBarrier({ isNS, mat }: FrameProps) {
  const H = 0.33
  const postW = 0.06
  const plankH = 0.055
  const plankW = WALL_W - postW * 2
  // 3 planks + 2 gaps + top/bottom margins
  const plankYs = [
    -(H / 2) + plankH / 2 + 0.02,
    0,
    (H / 2) - plankH / 2 - 0.02,
  ]

  const meshes: { size: [number, number, number]; pos: [number, number, number] }[] = []

  // End posts
  const postOffset = (WALL_W - postW) / 2
  if (isNS) {
    meshes.push({ size: [postW, H, THICKNESS], pos: [-postOffset, 0, 0] })
    meshes.push({ size: [postW, H, THICKNESS], pos: [postOffset, 0, 0] })
    for (const py of plankYs) {
      meshes.push({ size: [plankW, plankH, THICKNESS], pos: [0, py, 0] })
    }
  } else {
    meshes.push({ size: [THICKNESS, H, postW], pos: [0, 0, -postOffset] })
    meshes.push({ size: [THICKNESS, H, postW], pos: [0, 0, postOffset] })
    for (const py of plankYs) {
      meshes.push({ size: [THICKNESS, plankH, plankW], pos: [0, py, 0] })
    }
  }

  return (
    <group>
      {meshes.map((m, i) => (
        <mesh key={i} position={m.pos}>
          <boxGeometry args={m.size} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
    </group>
  )
}
