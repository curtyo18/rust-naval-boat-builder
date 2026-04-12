// src/scene/PlacedPieces.tsx
import { useStore } from '../store/useStore'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, PieceCategory } from '../types'

const config = piecesConfig as PiecesConfig

const CATEGORY_COLORS: Record<PieceCategory, string> = {
  hull: '#5c4a32',
  structural: '#4a7a4a',
  floor: '#4a6a8a',
  deployable: '#8a4a4a',
}

export default function PlacedPieces() {
  const pieces = useStore((s) => s.pieces)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const removePiece = useStore((s) => s.removePiece)

  return (
    <>
      {pieces.map((piece) => {
        if (!visibleLevels.has(piece.position.y as 0 | 1 | 2)) return null
        const category = config[piece.type]?.category ?? 'structural'
        const color = CATEGORY_COLORS[category]
        const isDeleteMode = selectedPieceType === null

        return (
          <mesh
            key={piece.id}
            position={[piece.position.x + 0.5, piece.position.y + 0.5, piece.position.z + 0.5]}
            onClick={(e) => {
              if (isDeleteMode) {
                e.stopPropagation()
                removePiece(piece.id)
              }
            }}
          >
            <boxGeometry args={[0.92, 0.92, 0.92]} />
            <meshStandardMaterial
              color={color}
              opacity={isDeleteMode ? 0.8 : 1}
              transparent={isDeleteMode}
            />
          </mesh>
        )
      })}
    </>
  )
}
