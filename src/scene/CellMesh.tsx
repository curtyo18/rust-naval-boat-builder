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
 * - triangle_hull / triangle_floor: triangular prism (right triangle)
 * - boat_stairs: stepped shape (3 steps)
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
 * Right-triangle prism: flat slab occupying half a cell diagonally.
 * Triangle runs from (0,0) to (w,0) to (0,d) when viewed from above.
 */
function TrianglePrism({ height, mat }: { height: number; mat: MatProps }) {
  const w = 0.96
  const d = 0.96
  const hw = w / 2
  const hd = d / 2
  const hh = height / 2

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()

    // Right triangle prism: hypotenuse along the north edge (flat side
    // that connects to adjacent foundations), point facing south/outward.
    // Top-down: (-hw, -hd) -- (hw, -hd) is the flat north edge,
    // (0, hd) is the point facing outward.
    const vertices = new Float32Array([
      // Top face (y = +hh)
      -hw, hh, -hd,   // 0: north-west
       hw, hh, -hd,   // 1: north-east
         0, hh,  hd,  // 2: south point
      // Bottom face (y = -hh)
      -hw, -hh, -hd,  // 3: north-west
       hw, -hh, -hd,  // 4: north-east
         0, -hh,  hd, // 5: south point
    ])

    const indices = [
      // Top face
      0, 1, 2,
      // Bottom face
      3, 5, 4,
      // North side (flat edge: v0-v1 top, v3-v4 bottom)
      0, 3, 4, 0, 4, 1,
      // West side (v0-v2 top, v3-v5 bottom)
      0, 2, 5, 0, 5, 3,
      // East side (v1-v2 top, v4-v5 bottom)
      1, 4, 5, 1, 5, 2,
    ]

    geo.setIndex(indices)
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.computeVertexNormals()

    return geo
  }, [hw, hd, hh])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
    </mesh>
  )
}
