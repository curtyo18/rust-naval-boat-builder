import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { canPlace } from '../utils/validation'
import { detectSide, detectTriangleRotation, isTriangleType, detectTriangleOffset } from './pieceGeometry'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, XYZ, PieceSide, PieceRotation } from '../types'
import GhostPiece from './GhostPiece'

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
  offset?: { x: number; z: number }
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
  const isTriangle = selectedPieceType!.includes('triangle')

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

    const rotation = isTriangle
      ? detectTriangleRotation(pos, coordinateIndex, pieces)
      : 0

    const offset = isTriangle
      ? detectTriangleOffset(pos, coordinateIndex, pieces)
      : undefined

    return { pos, rotation, offset }
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
          offset={ghost.offset}
        />
      )}
    </>
  )
}
