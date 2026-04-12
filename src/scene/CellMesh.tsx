import { useMemo } from 'react'
import * as THREE from 'three'
import { getCellPieceShape } from './pieceGeometry'

interface CellMeshProps {
  type: string
  color: string
  opacity?: number
  roughness?: number
}

/**
 * Renders cell pieces with type-appropriate geometry.
 * Positioned at local origin — parent <group> handles world placement.
 *
 * - triangle_hull / floor_triangle / floor_frame_triangle: triangular prism
 * - everything else: box using getCellPieceShape dimensions
 */
export default function CellMesh({ type, color, opacity = 1, roughness = 0.85 }: CellMeshProps) {
  const transparent = opacity < 1
  const mat = { color, opacity, transparent, roughness }

  if (type === 'triangle_hull' || type === 'floor_triangle' || type === 'floor_frame_triangle') {
    const h = type === 'triangle_hull' ? 0.15 : 0.1
    return <TrianglePrism height={h} mat={mat} />
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

/**
 * Triangular prism occupying half a cell.
 * Flat edge along the north side (z = -0.48), point at south center (z = +0.48).
 * Looks like:
 *   ____
 *   \  /
 *    \/
 * Place south of a square hull so the flat edge connects to it.
 */
function TrianglePrism({ height, mat }: { height: number; mat: MatProps }) {
  const s = 0.96 / 2 // half-size
  const hh = height / 2

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()

    // Use non-indexed geometry with explicit normals for reliable rendering
    const positions: number[] = []
    const normals: number[] = []

    function addQuad(
      a: number[], b: number[], c: number[], d: number[], n: number[]
    ) {
      // Two triangles: a-b-c, a-c-d
      positions.push(...a, ...b, ...c, ...a, ...c, ...d)
      for (let i = 0; i < 6; i++) normals.push(...n)
    }

    function addTri(a: number[], b: number[], c: number[], n: number[]) {
      positions.push(...a, ...b, ...c)
      for (let i = 0; i < 3; i++) normals.push(...n)
    }

    // Vertices (top-down view):
    // NW(-s, -s) ---- NE(+s, -s)   ← flat north edge
    //       \          /
    //        \        /
    //         \      /
    //          \    /
    //           \  /
    //          S(0, +s)             ← south point

    const nw_t = [-s, hh, -s]
    const ne_t = [ s, hh, -s]
    const sp_t = [ 0, hh,  s]
    const nw_b = [-s,-hh, -s]
    const ne_b = [ s,-hh, -s]
    const sp_b = [ 0,-hh,  s]

    // Top face (y = +hh)
    addTri(nw_t, ne_t, sp_t, [0, 1, 0])

    // Bottom face (y = -hh)
    addTri(nw_b, sp_b, ne_b, [0, -1, 0])

    // North face (flat edge, z = -s)
    addQuad(nw_t, nw_b, ne_b, ne_t, [0, 0, -1])

    // West face (nw to south point)
    const westN = [-s, 0, -1]  // approximate normal
    addQuad(sp_t, sp_b, nw_b, nw_t, westN)

    // East face (ne to south point)
    const eastN = [s, 0, -1]  // approximate normal
    addQuad(ne_t, ne_b, sp_b, sp_t, eastN)

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.computeVertexNormals() // recompute for correct shading

    return geo
  }, [s, hh])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
    </mesh>
  )
}
