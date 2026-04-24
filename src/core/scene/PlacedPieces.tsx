import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useMode } from '../context/ModeContext'
import { GHOST_VALID_COLOR, getPiecePosition, isTriangleType, getCellPieceShape, getPieceColor, getWallHeight } from './pieceGeometry'
import EdgeMesh from './EdgeMesh'
import CellMesh from './CellMesh'
import { triSlotWorldPosition, triSlotRotationDeg, triEdgeWorldPosition, triEdgeRotationDeg, triSnapEdgeWorldPosition, triSnapEdgeRotationDeg, squareSnapEdgeWorldPosition, squareSnapEdgeRotationDeg } from '../utils/hexGrid'
import { canPlaceWith, canPlaceTriSnapWith, canPlaceTriSnapEdgeWith, canPlaceSquareSnapWith, canPlaceSquareSnapEdgeWith } from '../utils/validation'
import { toEdgeKeyUpper } from '../utils/coordinateKey'
import type { PlacedPiece } from '../types'

export default function PlacedPieces() {
  const mode = useMode()
  const edgeConfig = mode.pieces
  const bounds = mode.gridBounds
  const effectiveMaxFloors: number | 'infinite' = mode.maxFloors === 'dynamic' ? 'infinite' : mode.maxFloors
  const topSet = new Set(mode.topFloorAllowedTypes)
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

  /** Stacking a second half_wall on top of an existing lower half_wall (same floor, upper slot). */
  function isHalfStack(piece: PlacedPiece): boolean {
    return selectedPieceType === 'half_wall'
      && piece.type === 'half_wall'
      && piece.stackLevel !== 1
      && !!piece.side && !piece.squareSnap && !piece.triSnap && !piece.triCoord
  }

  function canStackOn(piece: PlacedPiece): boolean {
    if (!selectedPieceType || !isEdgePlacement) return false
    const sy = isHalfStack(piece) ? piece.position.y : piece.position.y + 1
    if (piece.squareSnap && piece.side) {
      return canPlaceSquareSnapEdgeWith(selectedPieceType, piece.squareSnap, sy, piece.side, pieces, coordinateIndex, edgeConfig, effectiveMaxFloors, topSet)
    }
    if (piece.triSnap && piece.triEdge !== undefined) {
      return canPlaceTriSnapEdgeWith(selectedPieceType, piece.triSnap, sy, piece.triEdge, pieces, coordinateIndex, edgeConfig, effectiveMaxFloors, topSet)
    }
    if (piece.triCoord && piece.triEdge !== undefined) {
      return canPlaceWith(selectedPieceType, { x: 0, y: sy, z: 0 }, pieces, coordinateIndex, edgeConfig, bounds, effectiveMaxFloors, topSet, undefined, piece.triCoord, piece.triEdge as 0 | 1 | 2)
    }
    if (piece.side) {
      return canPlaceWith(selectedPieceType, { ...piece.position, y: sy }, pieces, coordinateIndex, edgeConfig, bounds, effectiveMaxFloors, topSet, piece.side)
    }
    return false
  }

  function placeOnTop(piece: PlacedPiece) {
    if (!selectedPieceType) return
    const sy = isHalfStack(piece) ? piece.position.y : piece.position.y + 1
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

  /**
   * A half_wall hovered with a square floor piece selected targets the half-height
   * ceiling slot on the same cell (stackLevel=1) — only when there is no upper
   * half_wall already filling the full-height pair.
   */
  function isHalfCeilingTarget(piece: PlacedPiece): boolean {
    if (!isSquareFloor) return false
    if (piece.type !== 'half_wall' || piece.stackLevel === 1) return false
    if (!piece.side || piece.squareSnap || piece.triSnap || piece.triCoord) return false
    return !coordinateIndex.has(toEdgeKeyUpper(piece.position, piece.side))
  }

  /** Can a floor piece be placed on the level above this edge piece? */
  function canFloorAbove(piece: PlacedPiece): boolean {
    if (!selectedPieceType || !isFloorPlacement) return false
    const sy = piece.position.y + 1
    // Grid square edge → square floor above (or half-height ceiling atop a bare half_wall)
    if (piece.side && !piece.squareSnap && !piece.triSnap && !piece.triCoord) {
      if (!isSquareFloor) return false
      if (isHalfCeilingTarget(piece)) {
        return canPlaceWith(selectedPieceType, piece.position, pieces, coordinateIndex, edgeConfig, bounds, effectiveMaxFloors, topSet, undefined, undefined, undefined, 1)
      }
      return canPlaceWith(selectedPieceType, { ...piece.position, y: sy }, pieces, coordinateIndex, edgeConfig, bounds, effectiveMaxFloors, topSet)
    }
    // Snap-placed square edge → square floor above
    if (piece.squareSnap && piece.side) {
      if (!isSquareFloor) return false
      return canPlaceSquareSnapWith(selectedPieceType, { ...piece.squareSnap, y: sy }, pieces, coordinateIndex, edgeConfig, effectiveMaxFloors, topSet)
    }
    // Snap-placed triangle edge → triangle floor above
    if (piece.triSnap && piece.triEdge !== undefined) {
      if (!isTriFloor) return false
      return canPlaceTriSnapWith(selectedPieceType, { ...piece.triSnap, y: sy }, pieces, coordinateIndex, edgeConfig, effectiveMaxFloors, topSet)
    }
    // Hex-grid triangle edge → triangle floor above
    if (piece.triCoord && piece.triEdge !== undefined) {
      if (!isTriFloor) return false
      return canPlaceWith(selectedPieceType, { x: 0, y: sy, z: 0 }, pieces, coordinateIndex, edgeConfig, bounds, effectiveMaxFloors, topSet, undefined, piece.triCoord)
    }
    return false
  }

  function placeFloorAbove(piece: PlacedPiece) {
    if (!selectedPieceType) return
    const sy = piece.position.y + 1
    if (piece.side && !piece.squareSnap && !piece.triSnap && !piece.triCoord) {
      if (isHalfCeilingTarget(piece)) {
        placePiece(selectedPieceType, piece.position, 0, undefined, 1)
      } else {
        placePiece(selectedPieceType, { ...piece.position, y: sy }, 0)
      }
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
        const baseColor = getPieceColor(piece.type, piece.tier)
        const color = isSelected ? '#ff6666' : baseColor
        const worldPos = getPiecePosition(piece.position, piece.type, piece.side, piece.stackLevel)
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
          const wallH = getWallHeight(piece.type)
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
          const gWallH = selectedPieceType ? getWallHeight(selectedPieceType) : 1.0
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
                  tier={piece.tier}
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
                tier={piece.tier}
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
          const wallH = getWallHeight(piece.type)
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
          const gWallH = selectedPieceType ? getWallHeight(selectedPieceType) : 1.0
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
                  tier={piece.tier}
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
          const triYOffset = piece.stackLevel === 1 ? 0.5 : 0
          return (
            <group key={piece.id} position={[piece.triSnap.worldX, piece.position.y + triYOffset, piece.triSnap.worldZ]} onClick={handleClick}>
              <CellMesh
                type={piece.type}
                color={color}
                opacity={transparentPieces ? 0.8 : 1}
                angleDeg={piece.triSnap.angleDeg}
                tier={piece.tier}
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
          const wallH = getWallHeight(piece.type)
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
          const gWallH = selectedPieceType ? getWallHeight(selectedPieceType) : 1.0
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
                  tier={piece.tier}
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
                tier={piece.tier}
              />
            </group>
          )
        }

        // Edge pieces use EdgeMesh for distinct window/doorway shapes
        if (piece.side) {
          const halfStack = isHalfStack(piece)
          const canStack = isEdgePlacement && (halfStack || piece.position.y < 1)
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
            ? halfStack
              ? getPiecePosition(piece.position, selectedPieceType!, piece.side, 1)
              : getPiecePosition({ ...piece.position, y: piece.position.y + 1 }, selectedPieceType!, piece.side)
            : null
          const floorGhost = canFloor && isTarget && !canStack
          const ghostColor = isTarget && (canStack ? canStackOn(piece) : canFloorAbove(piece))
            ? GHOST_VALID_COLOR : '#ff3333'
          const halfCeiling = floorGhost && isHalfCeilingTarget(piece)
          const floorGhostPos = floorGhost && selectedPieceType
            ? halfCeiling
              ? getPiecePosition(piece.position, selectedPieceType, undefined, 1)
              : getPiecePosition({ ...piece.position, y: piece.position.y + 1 }, selectedPieceType)
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
                  tier={piece.tier}
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
              tier={piece.tier}
            />
          </group>
        )
      })}
    </>
  )
}
