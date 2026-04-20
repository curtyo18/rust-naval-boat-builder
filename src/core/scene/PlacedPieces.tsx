import { useState } from 'react'
import { useStore } from '../store/useStore'
import { PIECE_COLORS, DEFAULT_COLOR, GHOST_VALID_COLOR, getPiecePosition, isTriangleType, getCellPieceShape } from './pieceGeometry'
import EdgeMesh from './EdgeMesh'
import CellMesh from './CellMesh'
import { triSlotWorldPosition, triSlotRotationDeg, triEdgeWorldPosition, triEdgeRotationDeg, triSnapEdgeWorldPosition, triSnapEdgeRotationDeg, squareSnapEdgeWorldPosition, squareSnapEdgeRotationDeg } from '../utils/hexGrid'
import { canPlace, canPlaceTriSnap, canPlaceTriSnapEdge, canPlaceSquareSnap, canPlaceSquareSnapEdge } from '../utils/validation'
import piecesConfig from '../../modes/boat/pieces.json'
import type { PiecesConfig, PlacedPiece } from '../types'

const edgeConfig = piecesConfig as PiecesConfig

export default function PlacedPieces() {
  const pieces = useStore((s) => s.pieces)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const transparentPieces = useStore((s) => s.transparentPieces)
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const selectedPieceIds = useStore((s) => s.selectedPieceIds)
  const toggleSelectPiece = useStore((s) => s.toggleSelectPiece)
  const coordinateIndex = useStore((s) => s.coordinateIndex)
  const placePiece = useStore((s) => s.placePiece)
  const placeTriangleEdgePiece = useStore((s) => s.placeTriangleEdgePiece)
  const placeTriSnapEdgePiece = useStore((s) => s.placeTriSnapEdgePiece)
  const placeSquareSnapEdgePiece = useStore((s) => s.placeSquareSnapEdgePiece)
  const placeTrianglePiece = useStore((s) => s.placeTrianglePiece)
  const placeTriangleSnapped = useStore((s) => s.placeTriangleSnapped)
  const placeSquareSnapped = useStore((s) => s.placeSquareSnapped)
  const [stackTargetId, setStackTargetId] = useState<string | null>(null)

  const isEdgePlacement = selectedPieceType != null
    && edgeConfig[selectedPieceType]?.placementType === 'edge'
  const isFloorPlacement = selectedPieceType != null
    && edgeConfig[selectedPieceType]?.placementType === 'cell'
    && edgeConfig[selectedPieceType]?.floorConstraint === 'upper_only'
  const isTriFloor = isFloorPlacement && selectedPieceType!.includes('triangle')
  const isSquareFloor = isFloorPlacement && !selectedPieceType!.includes('triangle')

  function canStackOn(piece: PlacedPiece): boolean {
    if (!selectedPieceType || !isEdgePlacement) return false
    const sy = piece.position.y + 1
    if (piece.squareSnap && piece.side) {
      return canPlaceSquareSnapEdge(selectedPieceType, piece.squareSnap, sy, piece.side, pieces, coordinateIndex, edgeConfig)
    }
    if (piece.triSnap && piece.triEdge !== undefined) {
      return canPlaceTriSnapEdge(selectedPieceType, piece.triSnap, sy, piece.triEdge, pieces, coordinateIndex, edgeConfig)
    }
    if (piece.triCoord && piece.triEdge !== undefined) {
      return canPlace(selectedPieceType, { x: 0, y: sy, z: 0 }, pieces, coordinateIndex, edgeConfig, undefined, piece.triCoord, piece.triEdge as 0 | 1 | 2)
    }
    if (piece.side) {
      return canPlace(selectedPieceType, { ...piece.position, y: sy }, pieces, coordinateIndex, edgeConfig, piece.side)
    }
    return false
  }

  function placeOnTop(piece: PlacedPiece) {
    if (!selectedPieceType) return
    const sy = piece.position.y + 1
    if (piece.squareSnap && piece.side) {
      placeSquareSnapEdgePiece(selectedPieceType, piece.squareSnap, sy, piece.side)
    } else if (piece.triSnap && piece.triEdge !== undefined) {
      placeTriSnapEdgePiece(selectedPieceType, piece.triSnap, sy, piece.triEdge as 0 | 1 | 2)
    } else if (piece.triCoord && piece.triEdge !== undefined) {
      placeTriangleEdgePiece(selectedPieceType, sy, piece.triCoord, piece.triEdge as 0 | 1 | 2)
    } else if (piece.side) {
      placePiece(selectedPieceType, { ...piece.position, y: sy }, 0, piece.side)
    }
  }

  /** Can a floor piece be placed on the level above this edge piece? */
  function canFloorAbove(piece: PlacedPiece): boolean {
    if (!selectedPieceType || !isFloorPlacement) return false
    const sy = piece.position.y + 1
    // Grid square edge → square floor above
    if (piece.side && !piece.squareSnap && !piece.triSnap && !piece.triCoord) {
      if (!isSquareFloor) return false
      return canPlace(selectedPieceType, { ...piece.position, y: sy }, pieces, coordinateIndex, edgeConfig)
    }
    // Snap-placed square edge → square floor above
    if (piece.squareSnap && piece.side) {
      if (!isSquareFloor) return false
      return canPlaceSquareSnap(selectedPieceType, { ...piece.squareSnap, y: sy }, pieces, coordinateIndex, edgeConfig)
    }
    // Snap-placed triangle edge → triangle floor above
    if (piece.triSnap && piece.triEdge !== undefined) {
      if (!isTriFloor) return false
      return canPlaceTriSnap(selectedPieceType, { ...piece.triSnap, y: sy }, pieces, coordinateIndex, edgeConfig)
    }
    // Hex-grid triangle edge → triangle floor above
    if (piece.triCoord && piece.triEdge !== undefined) {
      if (!isTriFloor) return false
      return canPlace(selectedPieceType, { x: 0, y: sy, z: 0 }, pieces, coordinateIndex, edgeConfig, undefined, piece.triCoord)
    }
    return false
  }

  function placeFloorAbove(piece: PlacedPiece) {
    if (!selectedPieceType) return
    const sy = piece.position.y + 1
    if (piece.side && !piece.squareSnap && !piece.triSnap && !piece.triCoord) {
      placePiece(selectedPieceType, { ...piece.position, y: sy }, 0)
    } else if (piece.squareSnap && piece.side) {
      placeSquareSnapped(selectedPieceType, { ...piece.squareSnap, y: sy })
    } else if (piece.triSnap && piece.triEdge !== undefined) {
      placeTriangleSnapped(selectedPieceType, { ...piece.triSnap, y: sy })
    } else if (piece.triCoord && piece.triEdge !== undefined) {
      placeTrianglePiece(selectedPieceType, sy, piece.triCoord)
    }
  }

  return (
    <>
      {pieces.map((piece) => {
        if (!visibleLevels.has(piece.position.y as 0 | 1 | 2)) return null
        const isSelected = selectedPieceIds.has(piece.id)
        const baseColor = PIECE_COLORS[piece.type] ?? DEFAULT_COLOR
        const color = isSelected ? '#ff6666' : baseColor
        const worldPos = getPiecePosition(piece.position, piece.type, piece.side)
        const position: [number, number, number] = worldPos
        const renderRotation = piece.rotation
        const handleClick = (e: { stopPropagation: () => void; shiftKey?: boolean }) => {
          if (e.shiftKey) {
            e.stopPropagation()
            toggleSelectPiece(piece.id)
          }
        }

        // Edge pieces on snap-placed squares
        if (piece.squareSnap && piece.side) {
          const { worldX, worldZ, rotDeg } = piece.squareSnap
          const wp = squareSnapEdgeWorldPosition(worldX, worldZ, rotDeg, piece.position.y, piece.side)
          const edgeRotDeg = squareSnapEdgeRotationDeg(rotDeg, piece.side)
          const rotRad = (edgeRotDeg * Math.PI) / 180
          const wallH = piece.type.includes('low') || piece.type.includes('barrier') ? 0.33 : 1.0
          const canStack = isEdgePlacement && piece.position.y < 1
          const canFloor = isSquareFloor && piece.position.y < 2
          const canInteract = canStack || canFloor
          const isTarget = stackTargetId === piece.id
          const interactHandlers = canInteract ? {
            onPointerMove: (ev: { stopPropagation: () => void }) => ev.stopPropagation(),
            onPointerOver: () => setStackTargetId(piece.id),
            onPointerOut: () => setStackTargetId((p) => p === piece.id ? null : p),
            onClick: (ev: { stopPropagation: () => void; delta?: number }) => {
              if ((ev as any).delta > 5) return
              ev.stopPropagation()
              if (canStack && canStackOn(piece)) placeOnTop(piece)
              else if (canFloor && canFloorAbove(piece)) placeFloorAbove(piece)
            },
          } : {}
          // Edge stacking ghost
          const edgeGhostWp = canStack && isTarget
            ? squareSnapEdgeWorldPosition(worldX, worldZ, rotDeg, piece.position.y + 1, piece.side)
            : null
          const gWallH = selectedPieceType?.includes('low') || selectedPieceType?.includes('barrier') ? 0.33 : 1.0
          // Floor ghost
          const floorGhost = canFloor && isTarget && !canStack
          const ghostColor = isTarget && (canStack ? canStackOn(piece) : canFloorAbove(piece))
            ? GHOST_VALID_COLOR : '#ff3333'
          const cellShape = floorGhost && selectedPieceType ? getCellPieceShape(selectedPieceType) : null
          return (
            <group key={piece.id}>
              <group
                position={[wp.x, wp.y + wallH / 2, wp.z]}
                rotation={[0, rotRad, 0]}
                {...canInteract ? interactHandlers : { onClick: handleClick }}
              >
                <EdgeMesh
                  type={piece.type}
                  side="north"
                  color={color}
                  opacity={transparentPieces ? 0.8 : 1}
                />
              </group>
              {edgeGhostWp && (
                <group position={[edgeGhostWp.x, edgeGhostWp.y + gWallH / 2, edgeGhostWp.z]} rotation={[0, rotRad, 0]}>
                  <EdgeMesh type={selectedPieceType!} side="north" color={ghostColor} opacity={0.45} />
                </group>
              )}
              {floorGhost && cellShape && (
                <group position={[worldX, piece.position.y + 1 + cellShape.offset[1], worldZ]} rotation={[0, (rotDeg * Math.PI) / 180, 0]}>
                  <CellMesh type={selectedPieceType!} color={ghostColor} opacity={0.45} />
                </group>
              )}
            </group>
          )
        }

        // Squares snapped to a triangle edge
        if (piece.squareSnap) {
          const { worldX, worldZ, rotDeg } = piece.squareSnap
          const shape = getCellPieceShape(piece.type)
          const rotRad = (rotDeg * Math.PI) / 180
          return (
            <group
              key={piece.id}
              position={[worldX, piece.position.y + shape.offset[1], worldZ]}
              rotation={[0, rotRad, 0]}
              onClick={handleClick}
            >
              <CellMesh
                type={piece.type}
                color={color}
                opacity={transparentPieces ? 0.8 : 1}
              />
            </group>
          )
        }

        // Edge pieces on snap-placed triangles
        if (piece.triSnap && piece.triEdge !== undefined) {
          const { worldX, worldZ, angleDeg } = piece.triSnap
          const wp = triSnapEdgeWorldPosition(worldX, worldZ, angleDeg, piece.position.y, piece.triEdge)
          const rotDeg = triSnapEdgeRotationDeg(worldX, worldZ, angleDeg, piece.triEdge)
          const rotRad = (rotDeg * Math.PI) / 180
          const wallH = piece.type.includes('low') || piece.type.includes('barrier') ? 0.33 : 1.0
          const canStack = isEdgePlacement && piece.position.y < 1
          const canFloor = isTriFloor && piece.position.y < 2
          const canInteract = canStack || canFloor
          const isTarget = stackTargetId === piece.id
          const interactHandlers = canInteract ? {
            onPointerMove: (ev: { stopPropagation: () => void }) => ev.stopPropagation(),
            onPointerOver: () => setStackTargetId(piece.id),
            onPointerOut: () => setStackTargetId((p) => p === piece.id ? null : p),
            onClick: (ev: { stopPropagation: () => void; delta?: number }) => {
              if ((ev as any).delta > 5) return
              ev.stopPropagation()
              if (canStack && canStackOn(piece)) placeOnTop(piece)
              else if (canFloor && canFloorAbove(piece)) placeFloorAbove(piece)
            },
          } : {}
          const edgeGhostWp = canStack && isTarget
            ? triSnapEdgeWorldPosition(worldX, worldZ, angleDeg, piece.position.y + 1, piece.triEdge)
            : null
          const gWallH = selectedPieceType?.includes('low') || selectedPieceType?.includes('barrier') ? 0.33 : 1.0
          const floorGhost = canFloor && isTarget && !canStack
          const ghostColor = isTarget && (canStack ? canStackOn(piece) : canFloorAbove(piece))
            ? GHOST_VALID_COLOR : '#ff3333'
          return (
            <group key={piece.id}>
              <group
                position={[wp.x, wp.y + wallH / 2, wp.z]}
                rotation={[0, rotRad, 0]}
                {...canInteract ? interactHandlers : { onClick: handleClick }}
              >
                <EdgeMesh
                  type={piece.type}
                  side="north"
                  color={color}
                  opacity={transparentPieces ? 0.8 : 1}
                />
              </group>
              {edgeGhostWp && (
                <group position={[edgeGhostWp.x, edgeGhostWp.y + gWallH / 2, edgeGhostWp.z]} rotation={[0, rotRad, 0]}>
                  <EdgeMesh type={selectedPieceType!} side="north" color={ghostColor} opacity={0.45} />
                </group>
              )}
              {floorGhost && (
                <group position={[worldX, piece.position.y + 1, worldZ]}>
                  <CellMesh type={selectedPieceType!} color={ghostColor} opacity={0.45} angleDeg={angleDeg} />
                </group>
              )}
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
                opacity={transparentPieces ? 0.8 : 1}
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
          const wallH = piece.type.includes('low') || piece.type.includes('barrier') ? 0.33 : 1.0
          const canStack = isEdgePlacement && piece.position.y < 1
          const canFloor = isTriFloor && piece.position.y < 2
          const canInteract = canStack || canFloor
          const isTarget = stackTargetId === piece.id
          const interactHandlers = canInteract ? {
            onPointerMove: (ev: { stopPropagation: () => void }) => ev.stopPropagation(),
            onPointerOver: () => setStackTargetId(piece.id),
            onPointerOut: () => setStackTargetId((p) => p === piece.id ? null : p),
            onClick: (ev: { stopPropagation: () => void; delta?: number }) => {
              if ((ev as any).delta > 5) return
              ev.stopPropagation()
              if (canStack && canStackOn(piece)) placeOnTop(piece)
              else if (canFloor && canFloorAbove(piece)) placeFloorAbove(piece)
            },
          } : {}
          const edgeGhostWp = canStack && isTarget
            ? triEdgeWorldPosition(hq, piece.position.y + 1, hr, slot, piece.triEdge)
            : null
          const gWallH = selectedPieceType?.includes('low') || selectedPieceType?.includes('barrier') ? 0.33 : 1.0
          const floorGhost = canFloor && isTarget && !canStack
          const ghostColor = isTarget && (canStack ? canStackOn(piece) : canFloorAbove(piece))
            ? GHOST_VALID_COLOR : '#ff3333'
          const floorWp = floorGhost ? triSlotWorldPosition(hq, piece.position.y + 1, hr, slot) : null
          const floorAngle = floorGhost ? triSlotRotationDeg(slot) : 0
          return (
            <group key={piece.id}>
              <group
                position={[wp.x, wp.y + wallH / 2, wp.z]}
                rotation={[0, rotRad, 0]}
                {...canInteract ? interactHandlers : { onClick: handleClick }}
              >
                <EdgeMesh
                  type={piece.type}
                  side="north"
                  color={color}
                  opacity={transparentPieces ? 0.8 : 1}
                />
              </group>
              {edgeGhostWp && (
                <group position={[edgeGhostWp.x, edgeGhostWp.y + gWallH / 2, edgeGhostWp.z]} rotation={[0, rotRad, 0]}>
                  <EdgeMesh type={selectedPieceType!} side="north" color={ghostColor} opacity={0.45} />
                </group>
              )}
              {floorWp && (
                <group position={[floorWp.x, floorWp.y, floorWp.z]}>
                  <CellMesh type={selectedPieceType!} color={ghostColor} opacity={0.45} angleDeg={floorAngle} />
                </group>
              )}
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
                opacity={transparentPieces ? 0.8 : 1}
                angleDeg={angleDeg}
              />
            </group>
          )
        }

        // Edge pieces use EdgeMesh for distinct window/doorway shapes
        if (piece.side) {
          const canStack = isEdgePlacement && piece.position.y < 1
          const canFloor = isSquareFloor && piece.position.y < 2
          const canInteract = canStack || canFloor
          const isTarget = stackTargetId === piece.id
          const interactHandlers = canInteract ? {
            onPointerMove: (ev: { stopPropagation: () => void }) => ev.stopPropagation(),
            onPointerOver: () => setStackTargetId(piece.id),
            onPointerOut: () => setStackTargetId((p) => p === piece.id ? null : p),
            onClick: (ev: { stopPropagation: () => void; delta?: number }) => {
              if ((ev as any).delta > 5) return
              ev.stopPropagation()
              if (canStack && canStackOn(piece)) placeOnTop(piece)
              else if (canFloor && canFloorAbove(piece)) placeFloorAbove(piece)
            },
          } : {}
          const edgeGhostPos = canStack && isTarget
            ? getPiecePosition({ ...piece.position, y: piece.position.y + 1 }, selectedPieceType!, piece.side)
            : null
          const floorGhost = canFloor && isTarget && !canStack
          const ghostColor = isTarget && (canStack ? canStackOn(piece) : canFloorAbove(piece))
            ? GHOST_VALID_COLOR : '#ff3333'
          const floorGhostPos = floorGhost && selectedPieceType
            ? getPiecePosition({ ...piece.position, y: piece.position.y + 1 }, selectedPieceType)
            : null
          return (
            <group key={piece.id}>
              <group
                position={position}
                {...canInteract ? interactHandlers : { onClick: handleClick }}
              >
                <EdgeMesh
                  type={piece.type}
                  side={piece.side}
                  color={color}
                  opacity={transparentPieces ? 0.8 : 1}
                />
              </group>
              {edgeGhostPos && (
                <group position={edgeGhostPos}>
                  <EdgeMesh type={selectedPieceType!} side={piece.side} color={ghostColor} opacity={0.45} />
                </group>
              )}
              {floorGhostPos && (
                <group position={floorGhostPos}>
                  <CellMesh type={selectedPieceType!} color={ghostColor} opacity={0.45} />
                </group>
              )}
            </group>
          )
        }

        // Cell pieces
        return (
          <group key={piece.id} position={position} onClick={handleClick}>
            <CellMesh
              type={piece.type}
              color={color}
              opacity={transparentPieces ? 0.8 : 1}
              rotation={renderRotation}
            />
          </group>
        )
      })}
    </>
  )
}
