import { useMemo } from 'react'
import * as THREE from 'three'
import { getCellPieceShape } from './pieceGeometry'
import type { PieceRotation } from '../types'

interface CellMeshProps {
  type: string
  color: string
  opacity?: number
  roughness?: number
  rotation?: PieceRotation
  angleDeg?: number  // for triangle slot rotation (0, 60, 120, 180, 240, 300)
}

export default function CellMesh({ type, color, opacity = 1, roughness = 0.85, rotation = 0, angleDeg }: CellMeshProps) {
  const transparent = opacity < 1
  const mat = { color, opacity, transparent, roughness }

  if (type === 'triangle_hull' || type === 'floor_triangle' || type === 'floor_frame_triangle') {
    const h = type === 'triangle_hull' ? 0.15 : 0.1
    return <TrianglePrism height={h} mat={mat} angleDeg={angleDeg ?? rotation * 1} />
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
}

const HEX_SIZE = 1 / Math.sqrt(3)

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
  const hh = height / 2

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const verts = getEquilateralVertices(angleDeg)
    const [a, b, c] = verts

    const positions: number[] = []

    function pushTri(p1: number[], p2: number[], p3: number[]) {
      positions.push(...p1, ...p2, ...p3)
    }

    function pushQuad(p1: number[], p2: number[], p3: number[], p4: number[]) {
      positions.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4)
    }

    const at = [a[0], hh, a[1]]
    const bt = [b[0], hh, b[1]]
    const ct = [c[0], hh, c[1]]
    const ab = [a[0], -hh, a[1]]
    const bb = [b[0], -hh, b[1]]
    const cb = [c[0], -hh, c[1]]

    pushTri(at, bt, ct)
    pushTri(ab, cb, bb)
    pushQuad(at, ab, bb, bt)
    pushQuad(bt, bb, cb, ct)
    pushQuad(ct, cb, ab, at)

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.computeVertexNormals()
    return geo
  }, [hh, angleDeg])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
    </mesh>
  )
}
