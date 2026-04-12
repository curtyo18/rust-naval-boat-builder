import type { XYZ, PieceSide, PieceRotation } from '../types'
import { PIECE_COLORS, DEFAULT_COLOR, getPiecePosition } from './pieceGeometry'
import EdgeMesh from './EdgeMesh'
import CellMesh from './CellMesh'

interface GhostPieceProps {
  position: XYZ
  type: string
  valid: boolean
  side?: PieceSide
  rotation?: PieceRotation
  offset?: { x: number; z: number }
}

export default function GhostPiece({ position, type, valid, side, rotation = 0, offset }: GhostPieceProps) {
  const baseColor = PIECE_COLORS[type] ?? DEFAULT_COLOR
  const color = valid ? baseColor : '#ff3333'
  const worldPos = getPiecePosition(position, type, side)
  const finalPos: [number, number, number] = offset ? [worldPos[0] + offset.x, worldPos[1], worldPos[2] + offset.z] : worldPos

  // Edge pieces use EdgeMesh for distinct window/doorway ghost shapes
  if (side) {
    return (
      <group position={finalPos}>
        <EdgeMesh type={type} side={side} color={color} opacity={0.45} roughness={0.85} />
      </group>
    )
  }

  return (
    <group position={finalPos}>
      <CellMesh type={type} color={color} opacity={0.45} roughness={0.85} rotation={rotation} />
    </group>
  )
}
