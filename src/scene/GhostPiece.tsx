// src/scene/GhostPiece.tsx
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, PieceCategory, XYZ } from '../types'

const config = piecesConfig as PiecesConfig

const CATEGORY_COLORS: Record<PieceCategory, string> = {
  hull: '#5c4a32',
  structural: '#4a7a4a',
  floor: '#4a6a8a',
  deployable: '#8a4a4a',
}

interface GhostPieceProps {
  position: XYZ
  type: string
  valid: boolean
}

export default function GhostPiece({ position, type, valid }: GhostPieceProps) {
  const category = config[type]?.category ?? 'structural'
  const color = valid ? CATEGORY_COLORS[category] : '#ff3333'

  return (
    <mesh position={[position.x + 0.5, position.y + 0.5, position.z + 0.5]}>
      <boxGeometry args={[0.92, 0.92, 0.92]} />
      <meshStandardMaterial color={color} opacity={0.45} transparent />
    </mesh>
  )
}
