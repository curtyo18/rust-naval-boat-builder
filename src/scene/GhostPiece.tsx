import type { XYZ, PieceSide } from '../types'
import { PIECE_COLORS, DEFAULT_COLOR, getPiecePosition, getPieceSize } from './pieceGeometry'

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
  const size = getPieceSize(type, side)

  return (
    <mesh position={worldPos}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} opacity={0.45} transparent roughness={0.85} />
    </mesh>
  )
}
