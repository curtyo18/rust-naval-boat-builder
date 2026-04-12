// src/scene/HitPlane.tsx
import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { canPlace } from '../utils/validation'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, XYZ } from '../types'
import GhostPiece from './GhostPiece'

const config = piecesConfig as PiecesConfig
const GRID_W = 5
const GRID_L = 11

interface HitPlaneProps {
  floorY: 0 | 1 | 2
}

export default function HitPlane({ floorY }: HitPlaneProps) {
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const pieces = useStore((s) => s.pieces)
  const coordinateIndex = useStore((s) => s.coordinateIndex)
  const placePiece = useStore((s) => s.placePiece)
  const [ghostPos, setGhostPos] = useState<XYZ | null>(null)

  if (!selectedPieceType) return null

  function toGridPos(point: { x: number; z: number }): XYZ {
    const x = Math.max(0, Math.min(GRID_W - 1, Math.floor(point.x)))
    const z = Math.max(0, Math.min(GRID_L - 1, Math.floor(point.z)))
    return { x, y: floorY, z }
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    setGhostPos(toGridPos(e.point))
  }

  function handlePointerLeave() {
    setGhostPos(null)
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    const pos = toGridPos(e.point)
    if (canPlace(selectedPieceType, pos, pieces, coordinateIndex, config)) {
      placePiece(selectedPieceType, pos, 0)
    }
  }

  const isValid = ghostPos ? canPlace(selectedPieceType, ghostPos, pieces, coordinateIndex, config) : false

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
      {ghostPos && <GhostPiece position={ghostPos} type={selectedPieceType} valid={isValid} />}
    </>
  )
}
