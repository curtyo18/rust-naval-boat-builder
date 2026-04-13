import type { XYZ, PieceSide, PieceRotation } from '../types'
import { GHOST_VALID_COLOR, getPiecePosition } from './pieceGeometry'
import EdgeMesh from './EdgeMesh'
import CellMesh from './CellMesh'

interface GhostPieceProps {
  position: XYZ
  type: string
  valid: boolean
  side?: PieceSide
  rotation?: PieceRotation
}

export default function GhostPiece({ position, type, valid, side, rotation = 0 }: GhostPieceProps) {
  const color = valid ? GHOST_VALID_COLOR : '#ff3333'
  const worldPos = getPiecePosition(position, type, side)

  // Edge pieces use EdgeMesh for distinct window/doorway ghost shapes
  if (side) {
    return (
      <group position={worldPos}>
        <EdgeMesh type={type} side={side} color={color} opacity={0.45} roughness={0.85} />
      </group>
    )
  }

  return (
    <group position={worldPos}>
      <CellMesh type={type} color={color} opacity={0.45} roughness={0.85} rotation={rotation} />
    </group>
  )
}
