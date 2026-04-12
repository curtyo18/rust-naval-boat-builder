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

/**
 * Triangle vertices per rotation (top-down view, flat edge faces the foundation):
 *
 * rot 0:   flat edge NORTH    rot 180: flat edge SOUTH
 *  ____                         \/
 *  \  /                        /  \
 *   \/                        /____\
 *
 * rot 90:  flat edge WEST     rot 270: flat edge EAST
 *  |\                            /|
 *  | \                          / |
 *  | /                          \ |
 *  |/                            \|
 */
function getTriangleVertices(s: number, rotation: PieceRotation): [number, number][] {
  switch (rotation) {
    case 0:   return [[-s, -s], [s, -s], [0, s]]       // flat north, point south
    case 90:  return [[-s, -s], [-s, s], [s, 0]]        // flat west, point east
    case 180: return [[-s, s], [s, s], [0, -s]]         // flat south, point north
    case 270: return [[s, -s], [s, s], [-s, 0]]         // flat east, point west
  }
}

function TrianglePrism({ height, mat, rotation }: { height: number; mat: MatProps; rotation: PieceRotation }) {
  const s = 0.5
  const hh = height / 2

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const verts = getTriangleVertices(s, rotation)
    const [a, b, c] = verts // [x, z] pairs for the 3 triangle corners

    const positions: number[] = []

    function pushTri(p1: number[], p2: number[], p3: number[]) {
      positions.push(...p1, ...p2, ...p3)
    }

    function pushQuad(p1: number[], p2: number[], p3: number[], p4: number[]) {
      positions.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4)
    }

    // Top face (y = +hh)
    const at = [a[0], hh, a[1]]
    const bt = [b[0], hh, b[1]]
    const ct = [c[0], hh, c[1]]

    // Bottom face (y = -hh)
    const ab = [a[0], -hh, a[1]]
    const bb = [b[0], -hh, b[1]]
    const cb = [c[0], -hh, c[1]]

    // Top
    pushTri(at, bt, ct)
    // Bottom (reversed winding)
    pushTri(ab, cb, bb)
    // Side a→b
    pushQuad(at, ab, bb, bt)
    // Side b→c
    pushQuad(bt, bb, cb, ct)
    // Side c→a
    pushQuad(ct, cb, ab, at)

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.computeVertexNormals()

    return geo
  }, [s, hh, rotation])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
    </mesh>
  )
}
