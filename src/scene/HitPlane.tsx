import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { canPlace } from '../utils/validation'
import { detectSide } from './pieceGeometry'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, XYZ, PieceSide, PieceRotation } from '../types'
import GhostPiece from './GhostPiece'
import { worldToTriCoord, triSlotWorldPosition, triSlotRotationDeg, triEdgeWorldPosition, triEdgeRotationDeg, detectTriEdge } from '../utils/hexGrid'
import { toTriKey } from '../utils/coordinateKey'
import { PIECE_COLORS, DEFAULT_COLOR } from './pieceGeometry'
import CellMesh from './CellMesh'
import EdgeMesh from './EdgeMesh'
import type { TriCoord, TriEdgeIndex } from '../types'

const config = piecesConfig as PiecesConfig
const GRID_W = 5
const GRID_L = 11

interface HitPlaneProps {
  floorY: 0 | 1 | 2
}

interface GhostState {
  pos: XYZ
  side?: PieceSide
  rotation: PieceRotation
}

export default function HitPlane({ floorY }: HitPlaneProps) {
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const pieces = useStore((s) => s.pieces)
  const coordinateIndex = useStore((s) => s.coordinateIndex)
  const placePiece = useStore((s) => s.placePiece)
  const [ghost, setGhost] = useState<GhostState | null>(null)

  if (!selectedPieceType) return null

  const pieceConfig = config[selectedPieceType]
  if (!pieceConfig) return null
  const isEdgePiece = pieceConfig.placementType === 'edge'

  // Triangle cell pieces are handled by TriHitPlane
  if (selectedPieceType.includes('triangle') && !isEdgePiece) return null

  function toGhostState(point: { x: number; z: number }): GhostState {
    const cellX = Math.max(0, Math.min(GRID_W - 1, Math.floor(point.x)))
    const cellZ = Math.max(0, Math.min(GRID_L - 1, Math.floor(point.z)))
    const pos: XYZ = { x: cellX, y: floorY, z: cellZ }

    if (isEdgePiece) {
      const localX = point.x - cellX
      const localZ = point.z - cellZ
      const side = detectSide(localX, localZ)
      return { pos, side, rotation: 0 }
    }

    return { pos, rotation: 0 }
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    setGhost(toGhostState(e.point))
  }

  function handlePointerLeave() {
    setGhost(null)
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    const state = toGhostState(e.point)
    if (canPlace(selectedPieceType!, state.pos, pieces, coordinateIndex, config, state.side)) {
      placePiece(selectedPieceType!, state.pos, state.rotation, state.side)
    }
  }

  const isValid = ghost
    ? canPlace(selectedPieceType, ghost.pos, pieces, coordinateIndex, config, ghost.side)
    : false

  return (
    <>
      <mesh
        position={[GRID_W / 2, floorY, GRID_L / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[GRID_W, GRID_L]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {ghost && (
        <GhostPiece
          position={ghost.pos}
          type={selectedPieceType}
          valid={isValid}
          side={ghost.side}
          rotation={ghost.rotation}
        />
      )}
    </>
  )
}

interface TriGhostState {
  triCoord: TriCoord
  y: number
  triEdge?: TriEdgeIndex
}

export function TriHitPlane({ floorY }: HitPlaneProps) {
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const pieces = useStore((s) => s.pieces)
  const coordinateIndex = useStore((s) => s.coordinateIndex)
  const placeTrianglePiece = useStore((s) => s.placeTrianglePiece)
  const placeTriangleEdgePiece = useStore((s) => s.placeTriangleEdgePiece)
  const [ghost, setGhost] = useState<TriGhostState | null>(null)

  if (!selectedPieceType) return null

  const pieceConfig = config[selectedPieceType]
  if (!pieceConfig) return null

  const isTriType = selectedPieceType.includes('triangle')
  const isEdgeType = pieceConfig.placementType === 'edge'

  // This hit plane handles: triangle cell pieces, OR edge pieces on triangle foundations
  if (!isTriType && !isEdgeType) return null
  // Triangle edge piece types don't exist — skip
  if (isTriType && isEdgeType) return null

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    const { hq, hr, slot } = worldToTriCoord(e.point.x, e.point.z)
    const triCoord: TriCoord = { hq, hr, slot: slot as TriCoord['slot'] }

    if (isEdgeType) {
      // For edge pieces, only show ghost if a triangle foundation exists at this slot
      const triKey = toTriKey(hq, floorY, hr, slot)
      if (coordinateIndex.has(triKey)) {
        const edge = detectTriEdge(hq, hr, slot, e.point.x, e.point.z)
        setGhost({ triCoord, y: floorY, triEdge: edge })
      } else {
        setGhost(null)
      }
    } else {
      setGhost({ triCoord, y: floorY })
    }
  }

  function handlePointerLeave() {
    setGhost(null)
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    const { hq, hr, slot } = worldToTriCoord(e.point.x, e.point.z)
    const triCoord: TriCoord = { hq, hr, slot: slot as TriCoord['slot'] }

    if (isEdgeType) {
      const edge = detectTriEdge(hq, hr, slot, e.point.x, e.point.z)
      if (canPlace(selectedPieceType!, { x: 0, y: floorY, z: 0 }, pieces, coordinateIndex, config, undefined, triCoord, edge)) {
        placeTriangleEdgePiece(selectedPieceType!, floorY, triCoord, edge)
      }
    } else {
      if (canPlace(selectedPieceType!, { x: 0, y: floorY, z: 0 }, pieces, coordinateIndex, config, undefined, triCoord)) {
        placeTrianglePiece(selectedPieceType!, floorY, triCoord)
      }
    }
  }

  const isValid = ghost
    ? canPlace(selectedPieceType, { x: 0, y: ghost.y, z: 0 }, pieces, coordinateIndex, config, undefined, ghost.triCoord, ghost.triEdge)
    : false

  const planeSize = 12

  return (
    <>
      <mesh
        position={[0, floorY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {ghost && ghost.triEdge === undefined && isTriType && (
        <TriGhostPiece
          type={selectedPieceType}
          triCoord={ghost.triCoord}
          y={ghost.y}
          valid={isValid}
        />
      )}
      {ghost && ghost.triEdge !== undefined && (
        <TriEdgeGhostPiece
          type={selectedPieceType}
          triCoord={ghost.triCoord}
          triEdge={ghost.triEdge}
          y={ghost.y}
          valid={isValid}
        />
      )}
    </>
  )
}

function TriGhostPiece({ type, triCoord, y, valid }: { type: string; triCoord: TriCoord; y: number; valid: boolean }) {
  const baseColor = PIECE_COLORS[type] ?? DEFAULT_COLOR
  const color = valid ? baseColor : '#ff3333'
  const wp = triSlotWorldPosition(triCoord.hq, y, triCoord.hr, triCoord.slot)
  const angleDeg = triSlotRotationDeg(triCoord.slot)

  return (
    <group position={[wp.x, wp.y, wp.z]}>
      <CellMesh type={type} color={color} opacity={0.45} roughness={0.85} angleDeg={angleDeg} />
    </group>
  )
}

function TriEdgeGhostPiece({ type, triCoord, triEdge, y, valid }: {
  type: string; triCoord: TriCoord; triEdge: TriEdgeIndex; y: number; valid: boolean
}) {
  const baseColor = PIECE_COLORS[type] ?? DEFAULT_COLOR
  const color = valid ? baseColor : '#ff3333'
  const { hq, hr, slot } = triCoord
  const wp = triEdgeWorldPosition(hq, y, hr, slot, triEdge)
  const rotDeg = triEdgeRotationDeg(slot, triEdge)
  const rotRad = (rotDeg * Math.PI) / 180

  return (
    <group position={[wp.x, wp.y, wp.z]} rotation={[0, rotRad, 0]}>
      <EdgeMesh type={type} side="north" color={color} opacity={0.45} roughness={0.85} />
    </group>
  )
}
