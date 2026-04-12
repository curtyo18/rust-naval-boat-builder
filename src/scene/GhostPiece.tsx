import type { XYZ, PieceSide } from '../types'
import { PIECE_COLORS, DEFAULT_COLOR, getPiecePosition } from './pieceGeometry'
import EdgeMesh from './EdgeMesh'
import CellMesh from './CellMesh'

interface GhostPieceProps {
  position: XYZ
  type: string
  valid: boolean
  side?: PieceSide
}

export default function GhostPiece({ position, type, valid, side }: GhostPieceProps) {
  const baseColor = PIECE_COLORS[type] ?? DEFAULT_COLOR
  const color = valid ? baseColor : '#ff3333'
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
      <CellMesh type={type} color={color} opacity={0.45} roughness={0.85} />
    </group>
  )
}
