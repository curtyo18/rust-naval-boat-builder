import { useStore } from '../store/useStore'
import { PIECE_COLORS, DEFAULT_COLOR, getPiecePosition, getPieceSize } from './pieceGeometry'

export default function PlacedPieces() {
  const pieces = useStore((s) => s.pieces)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const removePiece = useStore((s) => s.removePiece)

  return (
    <>
      {pieces.map((piece) => {
        if (!visibleLevels.has(piece.position.y as 0 | 1 | 2)) return null
        const color = PIECE_COLORS[piece.type] ?? DEFAULT_COLOR
        const position = getPiecePosition(piece.position, piece.type, piece.side)
        const size = getPieceSize(piece.type, piece.side)
        const isDeleteMode = selectedPieceType === null

        return (
          <mesh
            key={piece.id}
            position={position}
            onClick={(e) => {
              if (isDeleteMode) {
                e.stopPropagation()
                removePiece(piece.id)
              }
            }}
          >
            <boxGeometry args={size} />
            <meshStandardMaterial
              color={color}
              roughness={0.85}
              opacity={isDeleteMode ? 0.8 : 1}
              transparent={isDeleteMode}
            />
          </mesh>
        )
      })}
    </>
  )
}
