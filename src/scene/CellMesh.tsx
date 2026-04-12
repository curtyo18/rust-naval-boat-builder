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
}

/**
 * Renders cell pieces with type-appropriate geometry.
 * Positioned at local origin — parent <group> handles world placement.
 *
 * - triangle_hull / floor_triangle / floor_frame_triangle: triangular prism (auto-rotated)
 * - everything else: box using getCellPieceShape dimensions
 */
export default function CellMesh({ type, color, opacity = 1, roughness = 0.85, rotation = 0 }: CellMeshProps) {
  const transparent = opacity < 1
  const mat = { color, opacity, transparent, roughness }

  if (type === 'triangle_hull' || type === 'floor_triangle' || type === 'floor_frame_triangle') {
    const h = type === 'triangle_hull' ? 0.15 : 0.1
    return <TrianglePrism height={h} mat={mat} rotation={rotation} />
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

const DEG_TO_RAD: Record<PieceRotation, number> = {
  0: 0,
  90: Math.PI / 2,
  180: Math.PI,
  270: -Math.PI / 2,
}

/**
 * Triangular prism occupying half a cell.
 * Base geometry: flat edge north (z = -s), point south (z = +s).
 * Rotation rotates the whole shape so the flat edge faces the foundation:
 *   0 = flat north, 90 = flat east, 180 = flat south, 270 = flat west
 */
function TrianglePrism({ height, mat, rotation }: { height: number; mat: MatProps; rotation: PieceRotation }) {
  const s = 0.96 / 2 // half-size
  const hh = height / 2

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()

    const positions: number[] = []

    function addQuad(a: number[], b: number[], c: number[], d: number[]) {
      positions.push(...a, ...b, ...c, ...a, ...c, ...d)
    }

    function addTri(a: number[], b: number[], c: number[]) {
      positions.push(...a, ...b, ...c)
    }

    // Top-down view (before rotation):
    // NW(-s, -s) ---- NE(+s, -s)   ← flat north edge
    //       \          /
    //        \        /
    //          S(0, +s)             ← south point

    const nw_t = [-s, hh, -s]
    const ne_t = [ s, hh, -s]
    const sp_t = [ 0, hh,  s]
    const nw_b = [-s,-hh, -s]
    const ne_b = [ s,-hh, -s]
    const sp_b = [ 0,-hh,  s]

    // Top face
    addTri(nw_t, ne_t, sp_t)
    // Bottom face
    addTri(nw_b, sp_b, ne_b)
    // North face (flat edge)
    addQuad(nw_t, nw_b, ne_b, ne_t)
    // West face
    addQuad(sp_t, sp_b, nw_b, nw_t)
    // East face
    addQuad(ne_t, ne_b, sp_b, sp_t)

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.computeVertexNormals()

    return geo
  }, [s, hh])

  const rotY = DEG_TO_RAD[rotation]

  return (
    <mesh geometry={geometry} rotation={[0, rotY, 0]}>
      <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
    </mesh>
  )
}
