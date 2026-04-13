import { useStore } from '../store/useStore'
import { PIECE_COLORS, DEFAULT_COLOR, getPiecePosition, isTriangleType } from './pieceGeometry'
import EdgeMesh from './EdgeMesh'
import CellMesh from './CellMesh'
import { triSlotWorldPosition, triSlotRotationDeg, triEdgeWorldPosition, triEdgeRotationDeg, triSnapEdgeWorldPosition, triSnapEdgeRotationDeg } from '../utils/hexGrid'

export default function PlacedPieces() {
  const pieces = useStore((s) => s.pieces)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const selectedPieceId = useStore((s) => s.selectedPieceId)
  const selectPiece = useStore((s) => s.selectPiece)

  return (
    <>
      {pieces.map((piece) => {
        if (!visibleLevels.has(piece.position.y as 0 | 1 | 2)) return null
        const isSelected = piece.id === selectedPieceId
        const baseColor = PIECE_COLORS[piece.type] ?? DEFAULT_COLOR
        const color = isSelected ? '#ff6666' : baseColor
        const worldPos = getPiecePosition(piece.position, piece.type, piece.side)
        const position: [number, number, number] = worldPos
        const renderRotation = piece.rotation
        const isSelectMode = selectedPieceType === null

        const canSelect = isSelectMode || piece.type === selectedPieceType

        const handleClick = (e: { stopPropagation: () => void }) => {
          if (canSelect) {
            e.stopPropagation()
            selectPiece(isSelected ? null : piece.id)
          }
        }

        // Edge pieces on snap-placed triangles
        if (piece.triSnap && piece.triEdge !== undefined) {
          const { worldX, worldZ, angleDeg } = piece.triSnap
          const wp = triSnapEdgeWorldPosition(worldX, worldZ, angleDeg, piece.position.y, piece.triEdge)
          const rotDeg = triSnapEdgeRotationDeg(worldX, worldZ, angleDeg, piece.triEdge)
          const rotRad = (rotDeg * Math.PI) / 180
          const wallH = piece.type.includes('low') || piece.type.includes('barrier') ? 0.33 : 0.95
          return (
            <group
              key={piece.id}
              position={[wp.x, wp.y + wallH / 2, wp.z]}
              rotation={[0, rotRad, 0]}
              onClick={handleClick}
            >
              <EdgeMesh
                type={piece.type}
                side="north"
                color={color}
                opacity={isSelectMode ? 0.8 : 1}
              />
            </group>
          )
        }

        // Triangles snapped to a square cell edge or another triangle edge
        if (piece.triSnap) {
          return (
            <group key={piece.id} position={[piece.triSnap.worldX, piece.position.y, piece.triSnap.worldZ]} onClick={handleClick}>
              <CellMesh
                type={piece.type}
                color={color}
                opacity={isSelectMode ? 0.8 : 1}
                angleDeg={piece.triSnap.angleDeg}
              />
            </group>
          )
        }

        // Triangle edge pieces (walls/doors/windows on triangle edges)
        if (piece.triCoord && piece.triEdge !== undefined) {
          const { hq, hr, slot } = piece.triCoord
          const wp = triEdgeWorldPosition(hq, piece.position.y, hr, slot, piece.triEdge)
          const rotDeg = triEdgeRotationDeg(slot, piece.triEdge)
          const rotRad = (rotDeg * Math.PI) / 180
          const wallH = piece.type.includes('low') || piece.type.includes('barrier') ? 0.33 : 0.95
          return (
            <group
              key={piece.id}
              position={[wp.x, wp.y + wallH / 2, wp.z]}
              rotation={[0, rotRad, 0]}
              onClick={handleClick}
            >
              <EdgeMesh
                type={piece.type}
                side="north"
                color={color}
                opacity={isSelectMode ? 0.8 : 1}
              />
            </group>
          )
        }

        // Triangle pieces — position from hex grid
        if (piece.triCoord && isTriangleType(piece.type)) {
          const { hq, hr, slot } = piece.triCoord
          const wp = triSlotWorldPosition(hq, piece.position.y, hr, slot)
          const angleDeg = triSlotRotationDeg(slot)
          return (
            <group key={piece.id} position={[wp.x, wp.y, wp.z]} onClick={handleClick}>
              <CellMesh
                type={piece.type}
                color={color}
                opacity={isSelectMode ? 0.8 : 1}
                angleDeg={angleDeg}
              />
            </group>
          )
        }

        // Edge pieces use EdgeMesh for distinct window/doorway shapes
        if (piece.side) {
          return (
            <group key={piece.id} position={position} onClick={handleClick}>
              <EdgeMesh
                type={piece.type}
                side={piece.side}
                color={color}
                opacity={isSelectMode ? 0.8 : 1}
              />
            </group>
          )
        }

        // Cell pieces
        return (
          <group key={piece.id} position={position} onClick={handleClick}>
            <CellMesh
              type={piece.type}
              color={color}
              opacity={isSelectMode ? 0.8 : 1}
              rotation={renderRotation}
            />
          </group>
        )
      })}
    </>
  )
}
