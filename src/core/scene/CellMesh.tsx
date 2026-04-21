import { useMemo } from 'react'
import * as THREE from 'three'
import { getCellPieceShape, getTierMaterial } from './pieceGeometry'
import { HEX_SIZE } from '../utils/hexGrid'
import { getTierTexture } from './tierTextures'
import type { PieceRotation } from '../types'

interface CellMeshProps {
  type: string
  color: string
  opacity?: number
  roughness?: number
  rotation?: PieceRotation
  angleDeg?: number  // for triangle slot rotation (0, 60, 120, 180, 240, 300)
  tier?: string
}

export default function CellMesh({ type, color, opacity = 1, angleDeg, tier }: CellMeshProps) {
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

  // Triangle floor frame — hollow triangle outline (check before triangle solid)
  if (type.startsWith('floor_frame_triangle')) {
    return <TriangleFramePrism height={0.1} mat={mat} angleDeg={angleDeg ?? 210} />
  }

  // Solid triangle prisms: hull, floor, ceiling, foundation (all triangle variants)
  if (type.includes('triangle')) {
    const h = type.includes('foundation') || type.includes('hull') ? 0.15
      : type.includes('ceiling') ? 0.04
      : 0.1
    return <TrianglePrism height={h} mat={mat} angleDeg={angleDeg ?? 210} />
  }

  // Square floor frame (both boat's 'floor_frame_square' and base's 'floor_frame_square_base')
  if (type.startsWith('floor_frame_square')) {
    return <SquareFloorFrame mat={mat} />
  }

  if (type === 'stairs_l') {
    return <StairsL mat={mat} />
  }
  if (type === 'stairs_u') {
    return <StairsU mat={mat} />
  }
  if (type === 'spiral_staircase') {
    return <SpiralStaircase mat={mat} />
  }

  const shape = getCellPieceShape(type)
  return (
    <mesh>
      <boxGeometry args={shape.size} />
      <meshStandardMaterial {...mat} />
    </mesh>
  )
}

interface MatProps {
  color: string
  opacity: number
  transparent: boolean
  roughness: number
  metalness: number
  map?: THREE.Texture
}

// HEX_SIZE imported from hexGrid.ts

/**
 * Equilateral triangle vertices for a given angle (degrees).
 * The tip vertex points in the angleDeg direction from centroid.
 * Edge length = HEX_SIZE (matching hex grid triangle size).
 */
function getEquilateralVertices(angleDeg: number): [number, number][] {
  const angleRad = (Math.PI / 180) * angleDeg
  const circumR = HEX_SIZE / Math.sqrt(3)
  const inR = HEX_SIZE / (2 * Math.sqrt(3))
  const halfEdge = HEX_SIZE / 2

  // Tip vertex
  const tx = circumR * Math.cos(angleRad)
  const tz = circumR * Math.sin(angleRad)

  // Base center (opposite side from tip)
  const bx = -inR * Math.cos(angleRad)
  const bz = -inR * Math.sin(angleRad)

  // Base vertices: perpendicular to tip direction
  const perpRad = angleRad + Math.PI / 2
  const px = halfEdge * Math.cos(perpRad)
  const pz = halfEdge * Math.sin(perpRad)

  return [
    [tx, tz],
    [bx + px, bz + pz],
    [bx - px, bz - pz],
  ]
}

function TrianglePrism({ height, mat, angleDeg }: { height: number; mat: MatProps; angleDeg: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const verts = getEquilateralVertices(angleDeg)
    const [a, b, c] = verts

    const positions: number[] = []
    const uvs: number[] = []

    function pushTri(p1: number[], p2: number[], p3: number[], uv1: number[], uv2: number[], uv3: number[]) {
      positions.push(...p1, ...p2, ...p3)
      uvs.push(...uv1, ...uv2, ...uv3)
    }

    function pushQuad(
      p1: number[], p2: number[], p3: number[], p4: number[],
      uv1: number[], uv2: number[], uv3: number[], uv4: number[],
    ) {
      positions.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4)
      uvs.push(...uv1, ...uv2, ...uv3, ...uv1, ...uv3, ...uv4)
    }

    // Bottom at y=0, top at y=height — matches boxGeometry convention
    const at = [a[0], height, a[1]]
    const bt = [b[0], height, b[1]]
    const ct = [c[0], height, c[1]]
    const ab = [a[0], 0, a[1]]
    const bb = [b[0], 0, b[1]]
    const cb = [c[0], 0, c[1]]

    // UV: planar projection for top/bottom faces (x,z → u,v)
    const uvScale = 1 / HEX_SIZE
    const toUV = (x: number, z: number): number[] => [x * uvScale + 0.5, z * uvScale + 0.5]

    // Top face
    pushTri(at, bt, ct, toUV(a[0], a[1]), toUV(b[0], b[1]), toUV(c[0], c[1]))
    // Bottom face
    pushTri(ab, cb, bb, toUV(a[0], a[1]), toUV(c[0], c[1]), toUV(b[0], b[1]))

    // Side faces — use edge-distance for U, height for V
    pushQuad(at, ab, bb, bt, [0, 1], [0, 0], [1, 0], [1, 1])
    pushQuad(bt, bb, cb, ct, [0, 1], [0, 0], [1, 0], [1, 1])
    pushQuad(ct, cb, ab, at, [0, 1], [0, 0], [1, 0], [1, 1])

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.computeVertexNormals()
    return geo
  }, [height, angleDeg])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
    </mesh>
  )
}

/**
 * Square floor frame — 4 border strips forming a rectangular cutout.
 */
function SquareFloorFrame({ mat }: { mat: MatProps }) {
  const FRAME_T = 0.12
  const H = 0.1
  const inner = 1 - 2 * FRAME_T

  const strips: { size: [number, number, number]; pos: [number, number, number] }[] = [
    { size: [1, H, FRAME_T], pos: [0, 0, -(0.5 - FRAME_T / 2)] },
    { size: [1, H, FRAME_T], pos: [0, 0, 0.5 - FRAME_T / 2] },
    { size: [FRAME_T, H, inner], pos: [-(0.5 - FRAME_T / 2), 0, 0] },
    { size: [FRAME_T, H, inner], pos: [0.5 - FRAME_T / 2, 0, 0] },
  ]

  return (
    <group>
      {strips.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * L Stairs — straight stepped flight rising from y=-0.5 to y=+0.5,
 * with treads stepping in +X. Mesh spans the cell (-0.5..+0.5 on all axes).
 */
function StairsL({ mat }: { mat: MatProps }) {
  const steps = 6
  const stepH = 1 / steps
  const stepD = 1 / steps
  return (
    <group>
      {Array.from({ length: steps }, (_, i) => {
        const y = -0.5 + (i + 0.5) * stepH
        const x = -0.5 + (i + 0.5) * stepD
        return (
          <mesh key={i} position={[x, y, 0]}>
            <boxGeometry args={[stepD, stepH, 1]} />
            <meshStandardMaterial {...mat} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * U Stairs — two flights with a landing, making a 180° turn.
 * First flight rises halfway along -Z side; landing at mid-height; second
 * flight continues to top along +Z side.
 */
function StairsU({ mat }: { mat: MatProps }) {
  const perFlight = 4
  const stepH = 0.5 / perFlight       // 8 steps total → 1.0 rise
  const stepD = 1 / perFlight         // each flight spans full cell in X
  const flightW = 0.45

  const firstFlight = Array.from({ length: perFlight }, (_, i) => {
    const y = -0.5 + (i + 0.5) * stepH
    const x = -0.5 + (i + 0.5) * stepD
    return { pos: [x, y, -0.25] as [number, number, number], size: [stepD, stepH, flightW] as [number, number, number] }
  })
  const landingY = -0.5 + perFlight * stepH + stepH / 2
  const landing = {
    pos: [0.5 - stepD / 2, landingY, 0] as [number, number, number],
    size: [stepD, stepH, flightW * 2 + 0.1] as [number, number, number],
  }
  const secondFlight = Array.from({ length: perFlight }, (_, i) => {
    const y = landingY + (i + 1) * stepH
    const x = 0.5 - (i + 1.5) * stepD
    return { pos: [x, y, 0.25] as [number, number, number], size: [stepD, stepH, flightW] as [number, number, number] }
  })

  return (
    <group>
      {[...firstFlight, landing, ...secondFlight].map((p, i) => (
        <mesh key={i} position={p.pos}>
          <boxGeometry args={p.size} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Spiral staircase — circular steps winding around a central column,
 * rising one full floor (y=-0.5 to y=+0.5).
 */
function SpiralStaircase({ mat }: { mat: MatProps }) {
  const steps = 10
  const stepH = 1 / steps
  const stepRadius = 0.32
  const stepW = 0.42
  const stepD = 0.16
  const centerR = 0.08

  return (
    <group>
      <mesh>
        <cylinderGeometry args={[centerR, centerR, 1, 12]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {Array.from({ length: steps }, (_, i) => {
        const angle = (i / steps) * Math.PI * 2
        const y = -0.5 + (i + 0.5) * stepH
        const x = Math.cos(angle) * stepRadius
        const z = Math.sin(angle) * stepRadius
        return (
          <mesh key={i} position={[x, y, z]} rotation={[0, angle, 0]}>
            <boxGeometry args={[stepW, stepH * 0.85, stepD]} />
            <meshStandardMaterial {...mat} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * Triangle floor frame — outer triangle with inner cutout using ExtrudeGeometry.
 */
function TriangleFramePrism({ height, mat, angleDeg }: { height: number; mat: MatProps; angleDeg: number }) {
  const geometry = useMemo(() => {
    const verts = getEquilateralVertices(angleDeg)
    const [a, b, c] = verts

    // Outer triangle shape (XY plane, Y maps to world Z)
    const shape = new THREE.Shape()
    shape.moveTo(a[0], a[1])
    shape.lineTo(b[0], b[1])
    shape.lineTo(c[0], c[1])
    shape.closePath()

    // Inner triangle scaled toward centroid
    const cx = (a[0] + b[0] + c[0]) / 3
    const cy = (a[1] + b[1] + c[1]) / 3
    const s = 0.55
    const hole = new THREE.Path()
    hole.moveTo(cx + (a[0] - cx) * s, cy + (a[1] - cy) * s)
    hole.lineTo(cx + (b[0] - cx) * s, cy + (b[1] - cy) * s)
    hole.lineTo(cx + (c[0] - cx) * s, cy + (c[1] - cy) * s)
    hole.closePath()
    shape.holes.push(hole)

    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
    // Rotate so extrusion goes along Y (up) instead of Z
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [height, angleDeg])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
    </mesh>
  )
}
