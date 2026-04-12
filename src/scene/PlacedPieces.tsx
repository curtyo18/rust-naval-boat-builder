import { useStore } from '../store/useStore'
import { PIECE_COLORS, DEFAULT_COLOR, getPiecePosition, getPieceSize } from './pieceGeometry'
import EdgeMesh from './EdgeMesh'

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
        const isDeleteMode = selectedPieceType === null

        const handleClick = (e: { stopPropagation: () => void }) => {
          if (isDeleteMode) {
            e.stopPropagation()
            removePiece(piece.id)
          }
        }

        const handleContextMenu = (e: { stopPropagation: () => void }) => {
          e.stopPropagation()
          removePiece(piece.id)
        }

        // Edge pieces use EdgeMesh for distinct window/doorway shapes
        if (piece.side) {
          return (
            <group key={piece.id} position={position} onClick={handleClick} onContextMenu={handleContextMenu}>
              <EdgeMesh
                type={piece.type}
                side={piece.side}
                color={color}
                opacity={isDeleteMode ? 0.8 : 1}
              />
            </group>
          )
        }

        // Cell pieces use simple box geometry
        const size = getPieceSize(piece.type)
        return (
          <mesh key={piece.id} position={position} onClick={handleClick} onContextMenu={handleContextMenu}>
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
