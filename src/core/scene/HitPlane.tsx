import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { useMode } from '../context/ModeContext'
import { canPlaceWith, canPlaceTriSnapWith, canPlaceTriSnapEdgeWith, canPlaceSquareSnapWith, canPlaceSquareSnapEdgeWith } from '../utils/validation'
import { detectSide, getCellPieceShape } from './pieceGeometry'
import type { XYZ, PieceSide, PieceRotation, PlacedPiece } from '../types'
import GhostPiece from './GhostPiece'
import { worldToTriCoord, triSlotWorldPosition, triSlotRotationDeg, triEdgeWorldPosition, triEdgeRotationDeg, detectTriEdge, squareEdgeSnapPosition, triSnapNeighbors, triSnapEdgeWorldPosition, triSnapEdgeRotationDeg, detectTriSnapEdge, triEdgeSquareSnapPosition, triSnapEdgeSquareSnapPosition, squareSnapEdgeWorldPosition, squareSnapEdgeRotationDeg, detectSquareSnapSide, HEX_ORIGIN } from '../utils/hexGrid'
import { toKey, toEdgeKey, toTriKey, toTriEdgeKey, toTriSnapKey, toSquareSnapKey } from '../utils/coordinateKey'
import { GHOST_VALID_COLOR } from './pieceGeometry'
import CellMesh from './CellMesh'
import EdgeMesh from './EdgeMesh'
import type { TriCoord, TriEdgeIndex, TriSnapTarget, SquareSnapTarget } from '../types'

interface HitPlaneProps {
  floorY: 0 | 1 | 2
}

interface GhostState {
  pos: XYZ
  side?: PieceSide
  rotation: PieceRotation
}

export default function HitPlane({ floorY }: HitPlaneProps) {
  const mode = useMode()
  const config = mode.pieces
  const bounds = mode.gridBounds
  const gridW = bounds === 'infinite' ? 60 : bounds.x
  const gridL = bounds === 'infinite' ? 60 : bounds.z
  const effectiveMaxFloors: number | 'infinite' = mode.maxFloors === 'dynamic' ? 'infinite' : mode.maxFloors
  const topSet = new Set(mode.topFloorAllowedTypes)
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const pieces = useStore((s) => s.pieces)
  const coordinateIndex = useStore((s) => s.coordinateIndex)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const placePiece = useStore((s) => s.placePiece)
  const [ghost, setGhost] = useState<GhostState | null>(null)

  if (!selectedPieceType) return null

  const pieceConfig = config[selectedPieceType]
  if (!pieceConfig) return null
  const isEdgePiece = pieceConfig.placementType === 'edge'

  // Triangle cell pieces are handled by TriHitPlane
  if (selectedPieceType.includes('triangle') && !isEdgePiece) return null

  function toGhostState(point: { x: number; z: number }): GhostState {
    const cellX = Math.max(0, Math.min(gridW - 1, Math.floor(point.x)))
    const cellZ = Math.max(0, Math.min(gridL - 1, Math.floor(point.z)))

    if (isEdgePiece) {
      const localX = point.x - cellX
      const localZ = point.z - cellZ
      const side = detectSide(localX, localZ)
      // Scan visible floors top-to-bottom: target highest floor with support
      // (foundation cell piece, or edge piece below on same side for stacking)
      for (const f of [2, 1, 0] as const) {
        if (!visibleLevels.has(f)) continue
        const hasFoundation = coordinateIndex.has(toKey({ x: cellX, y: f, z: cellZ }))
        const hasEdgeBelow = f > 0
          && coordinateIndex.has(toEdgeKey({ x: cellX, y: f - 1, z: cellZ }, side))
        if (hasFoundation || hasEdgeBelow) {
          return { pos: { x: cellX, y: f, z: cellZ }, side, rotation: 0 }
        }
      }
      return { pos: { x: cellX, y: floorY, z: cellZ }, side, rotation: 0 }
    }

    // Cell pieces: scan visible floors bottom-to-top for first unoccupied cell
    const constraint = pieceConfig.floorConstraint
    for (const f of [0, 1, 2] as const) {
      if (!visibleLevels.has(f)) continue
      if (constraint === 'ground_only' && f !== 0) continue
      if (constraint === 'upper_only' && f === 0) continue
      if (!coordinateIndex.has(toKey({ x: cellX, y: f, z: cellZ }))) {
        return { pos: { x: cellX, y: f, z: cellZ }, rotation: 0 }
      }
    }
    return { pos: { x: cellX, y: floorY, z: cellZ }, rotation: 0 }
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    setGhost(toGhostState(e.point))
  }

  function handlePointerLeave() {
    setGhost(null)
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (e.delta > 5) return
    e.stopPropagation()
    const state = toGhostState(e.point)
    if (canPlaceWith(selectedPieceType!, state.pos, pieces, coordinateIndex, config, bounds, effectiveMaxFloors, topSet, state.side)) {
      placePiece(selectedPieceType!, state.pos, state.rotation, state.side)
    }
  }

  const isValid = ghost
    ? canPlaceWith(selectedPieceType, ghost.pos, pieces, coordinateIndex, config, bounds, effectiveMaxFloors, topSet, ghost.side)
    : false

  return (
    <>
      <mesh
        position={[gridW / 2, floorY, gridL / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[gridW, gridL]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {ghost && (
        <GhostPiece
          position={ghost.pos}
          type={selectedPieceType}
          valid={isValid}
          side={ghost.side}
          rotation={ghost.rotation}
        />
      )}
    </>
  )
}

interface SnapResult {
  worldX: number
  worldZ: number
  angleDeg: number
  y: number
}

interface SnapEdgeResult {
  parentSnap: TriSnapTarget
  edge: TriEdgeIndex
  y: number
}

interface SquareSnapResult {
  worldX: number
  worldZ: number
  rotDeg: number
  y: number
}

interface SquareSnapEdgeResult {
  parentSnap: SquareSnapTarget
  side: PieceSide
  y: number
}

interface TriGhostState {
  triCoord: TriCoord
  y: number
  triEdge?: TriEdgeIndex
  snap?: SnapResult
  snapEdge?: SnapEdgeResult
  squareSnap?: SquareSnapResult
  squareSnapEdge?: SquareSnapEdgeResult
}

const SNAP_THRESHOLD = 0.5

/** Find the nearest placed-square edge within threshold of cursor position. */
function findSquareEdgeSnap(
  wx: number, wz: number, y: number,
  coordinateIndex: Map<string, string>,
): SnapResult | null {
  const sides: PieceSide[] = ['north', 'south', 'east', 'west']
  let best: { side: PieceSide; cx: number; cz: number; dist: number } | null = null

  const x0 = Math.floor(wx)
  const z0 = Math.floor(wz)

  for (let cx = x0 - 1; cx <= x0 + 1; cx++) {
    for (let cz = z0 - 1; cz <= z0 + 1; cz++) {
      const key = toKey({ x: cx, y, z: cz })
      if (!coordinateIndex.has(key)) continue

      for (const side of sides) {
        let dist: number
        let onEdge: boolean
        switch (side) {
          case 'east':
            dist = Math.abs(wx - (cx + 1))
            onEdge = wz >= cz - 0.1 && wz <= cz + 1.1
            break
          case 'west':
            dist = Math.abs(wx - cx)
            onEdge = wz >= cz - 0.1 && wz <= cz + 1.1
            break
          case 'south':
            dist = Math.abs(wz - (cz + 1))
            onEdge = wx >= cx - 0.1 && wx <= cx + 1.1
            break
          case 'north':
            dist = Math.abs(wz - cz)
            onEdge = wx >= cx - 0.1 && wx <= cx + 1.1
            break
        }
        if (!onEdge || dist >= SNAP_THRESHOLD) continue
        if (!best || dist < best.dist) {
          best = { side, cx, cz, dist }
        }
      }
    }
  }

  if (!best) return null
  const sp = squareEdgeSnapPosition(best.cx, best.cz, best.side)
  return { ...sp, y }
}

/** Find the nearest snapped-square edge to place a triangle against. */
function findSnappedSquareEdgeSnap(
  wx: number, wz: number, y: number,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
): SnapResult | null {
  const SQRT3 = Math.sqrt(3)
  const inR = 1 / (2 * SQRT3)
  const sides: PieceSide[] = ['north', 'east', 'south', 'west']
  const baseAngle: Record<PieceSide, number> = { east: 0, west: 180, south: 90, north: 270 }
  const normals: Record<PieceSide, [number, number]> = {
    north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0],
  }
  const edgeMid: Record<PieceSide, [number, number]> = {
    north: [0, -0.5], east: [0.5, 0], south: [0, 0.5], west: [-0.5, 0],
  }

  let bestDist = SNAP_THRESHOLD
  let best: SnapResult | null = null

  for (const piece of pieces) {
    if (!piece.squareSnap || piece.side || piece.position.y !== y) continue
    const { worldX, worldZ, rotDeg } = piece.squareSnap
    const dx = wx - worldX
    const dz = wz - worldZ
    if (dx * dx + dz * dz > 4) continue

    const theta = (rotDeg * Math.PI) / 180
    const cosT = Math.cos(theta)
    const sinT = Math.sin(theta)

    for (const side of sides) {
      const [lmx, lmz] = edgeMid[side]
      const [lnx, lnz] = normals[side]

      // Edge midpoint in world (for distance check)
      const emx = worldX + lmx * cosT + lmz * sinT
      const emz = worldZ - lmx * sinT + lmz * cosT
      const dist = Math.sqrt((wx - emx) ** 2 + (wz - emz) ** 2)
      if (dist >= bestDist) continue

      // Triangle center in world
      const lcx = lmx + inR * lnx
      const lcz = lmz + inR * lnz
      const tcx = worldX + lcx * cosT + lcz * sinT
      const tcz = worldZ - lcx * sinT + lcz * cosT

      const snapKey = toTriSnapKey(tcx, y, tcz)
      if (coordinateIndex.has(snapKey)) continue

      bestDist = dist
      best = { worldX: tcx, worldZ: tcz, angleDeg: baseAngle[side] + rotDeg, y }
    }
  }

  return best
}

/** Find the nearest free edge of a placed snap-triangle within threshold. */
function findTriEdgeSnap(
  wx: number, wz: number, y: number,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
): SnapResult | null {
  let bestDist = SNAP_THRESHOLD
  let bestSnap: SnapResult | null = null

  for (const piece of pieces) {
    if (!piece.triSnap || piece.position.y !== y) continue
    const neighbors = triSnapNeighbors(piece.triSnap.worldX, piece.triSnap.worldZ, piece.triSnap.angleDeg)
    for (const n of neighbors) {
      // Check if this neighbor slot is already occupied
      const nKey = toTriSnapKey(n.worldX, y, n.worldZ)
      if (coordinateIndex.has(nKey)) continue
      // Distance from cursor to neighbor centroid
      const dist = Math.sqrt((wx - n.worldX) ** 2 + (wz - n.worldZ) ** 2)
      if (dist < bestDist) {
        bestDist = dist
        bestSnap = { ...n, y }
      }
    }
  }

  return bestSnap
}

/** Find the nearest snap-placed triangle whose edge the cursor is near (for edge piece placement). */
function findSnapTriForEdge(
  wx: number, wz: number, y: number,
  pieces: PlacedPiece[],
): SnapEdgeResult | null {
  let bestDist = SNAP_THRESHOLD
  let best: SnapEdgeResult | null = null

  for (const piece of pieces) {
    if (!piece.triSnap || piece.triEdge !== undefined || piece.position.y !== y) continue
    const { worldX, worldZ, angleDeg } = piece.triSnap
    // Distance from cursor to triangle centroid — rough check
    const dx = wx - worldX
    const dz = wz - worldZ
    if (dx * dx + dz * dz > 4) continue // skip if too far
    const edge = detectTriSnapEdge(worldX, worldZ, angleDeg, wx, wz)
    const ep = triSnapEdgeWorldPosition(worldX, worldZ, angleDeg, y, edge)
    const dist = Math.sqrt((wx - ep.x) ** 2 + (wz - ep.z) ** 2)
    if (dist < bestDist) {
      bestDist = dist
      best = { parentSnap: piece.triSnap, edge, y }
    }
  }

  return best
}

/** Find the nearest triangle edge to snap a square to. Scans both hex-grid and snap-placed triangles. */
function findTriEdgeForSquareSnap(
  wx: number, wz: number, y: number,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
): SquareSnapResult | null {
  let bestDist = SNAP_THRESHOLD
  let best: SquareSnapResult | null = null

  for (const piece of pieces) {
    if (piece.position.y !== y) continue

    // Hex-grid triangles
    if (piece.triCoord && piece.triEdge === undefined && !piece.triSnap) {
      const { hq, hr, slot } = piece.triCoord
      for (let e = 0; e < 3; e++) {
        const mid = triEdgeWorldPosition(hq, 0, hr, slot, e)
        const dist = Math.sqrt((wx - mid.x) ** 2 + (wz - mid.z) ** 2)
        if (dist < bestDist) {
          const snap = triEdgeSquareSnapPosition(hq, hr, slot, e)
          const snapKey = toSquareSnapKey(snap.worldX, y, snap.worldZ)
          if (!coordinateIndex.has(snapKey)) {
            bestDist = dist
            best = { ...snap, y }
          }
        }
      }
    }

    // Snap-placed triangles
    if (piece.triSnap && piece.triEdge === undefined) {
      const { worldX, worldZ, angleDeg } = piece.triSnap
      const dx = wx - worldX
      const dz = wz - worldZ
      if (dx * dx + dz * dz > 4) continue
      for (let e = 0; e < 3; e++) {
        const mid = triSnapEdgeWorldPosition(worldX, worldZ, angleDeg, 0, e)
        const dist = Math.sqrt((wx - mid.x) ** 2 + (wz - mid.z) ** 2)
        if (dist < bestDist) {
          const snap = triSnapEdgeSquareSnapPosition(worldX, worldZ, angleDeg, e)
          const snapKey = toSquareSnapKey(snap.worldX, y, snap.worldZ)
          if (!coordinateIndex.has(snapKey)) {
            bestDist = dist
            best = { ...snap, y }
          }
        }
      }
    }
  }

  return best
}

/** Find an adjacent position to an existing snapped square (square-to-square chaining). */
function findSquareSnapNeighbor(
  wx: number, wz: number, y: number,
  pieces: PlacedPiece[],
  coordinateIndex: Map<string, string>,
): SquareSnapResult | null {
  let bestDist = SNAP_THRESHOLD
  let best: SquareSnapResult | null = null

  const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]]

  for (const piece of pieces) {
    if (!piece.squareSnap || piece.side || piece.position.y !== y) continue
    const { worldX, worldZ, rotDeg } = piece.squareSnap
    const dx = wx - worldX
    const dz = wz - worldZ
    if (dx * dx + dz * dz > 4) continue

    const angle = (rotDeg * Math.PI) / 180
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    for (const [ldx, ldz] of offsets) {
      const nx = worldX + ldx * cosA + ldz * sinA
      const nz = worldZ - ldx * sinA + ldz * cosA

      const snapKey = toSquareSnapKey(nx, y, nz)
      if (coordinateIndex.has(snapKey)) continue

      const dist = Math.sqrt((wx - nx) ** 2 + (wz - nz) ** 2)
      if (dist < bestDist) {
        bestDist = dist
        best = { worldX: nx, worldZ: nz, rotDeg, y }
      }
    }
  }

  return best
}

/** Find the nearest snap-placed square whose edge the cursor is near (for edge piece placement). */
function findSquareSnapForEdge(
  wx: number, wz: number, y: number,
  pieces: PlacedPiece[],
): SquareSnapEdgeResult | null {
  let bestDist = SNAP_THRESHOLD
  let best: SquareSnapEdgeResult | null = null

  for (const piece of pieces) {
    if (!piece.squareSnap || piece.side || piece.position.y !== y) continue
    const { worldX, worldZ, rotDeg } = piece.squareSnap
    const dx = wx - worldX
    const dz = wz - worldZ
    if (dx * dx + dz * dz > 4) continue
    const side = detectSquareSnapSide(worldX, worldZ, rotDeg, wx, wz)
    const ep = squareSnapEdgeWorldPosition(worldX, worldZ, rotDeg, y, side)
    const dist = Math.sqrt((wx - ep.x) ** 2 + (wz - ep.z) ** 2)
    if (dist < bestDist) {
      bestDist = dist
      best = { parentSnap: piece.squareSnap, side, y }
    }
  }

  return best
}

/** Given multiple snap candidates, return the one closest to the cursor (prefer higher y on tie). */
function pickClosestSnap(candidates: (SnapResult | null)[], wx: number, wz: number): SnapResult | null {
  let best: SnapResult | null = null
  let bestDist = Infinity
  for (const c of candidates) {
    if (!c) continue
    const dist = (wx - c.worldX) ** 2 + (wz - c.worldZ) ** 2
    if (dist < bestDist || (dist === bestDist && best && c.y > best.y)) {
      bestDist = dist
      best = c
    }
  }
  return best
}

function pickClosestSquareSnap(candidates: (SquareSnapResult | null)[], wx: number, wz: number): SquareSnapResult | null {
  let best: SquareSnapResult | null = null
  let bestDist = Infinity
  for (const c of candidates) {
    if (!c) continue
    const dist = (wx - c.worldX) ** 2 + (wz - c.worldZ) ** 2
    if (dist < bestDist || (dist === bestDist && best && c.y > best.y)) {
      bestDist = dist
      best = c
    }
  }
  return best
}

/** Collect snap results across all target floors (same-level + floor-below support). */
function collectFloorSnaps(
  wx: number, wz: number, floors: number[],
  pieces: PlacedPiece[], coordinateIndex: Map<string, string>,
): SnapResult[] {
  const results: SnapResult[] = []
  for (const targetY of floors) {
    for (const s of [
      findSquareEdgeSnap(wx, wz, targetY, coordinateIndex),
      findSnappedSquareEdgeSnap(wx, wz, targetY, pieces, coordinateIndex),
      findTriEdgeSnap(wx, wz, targetY, pieces, coordinateIndex),
    ]) { if (s) results.push(s) }
    if (targetY > 0) {
      for (const s of [
        findSquareEdgeSnap(wx, wz, targetY - 1, coordinateIndex),
        findSnappedSquareEdgeSnap(wx, wz, targetY - 1, pieces, coordinateIndex),
        findTriEdgeSnap(wx, wz, targetY - 1, pieces, coordinateIndex),
      ]) { if (s) results.push({ ...s, y: targetY }) }
    }
  }
  return results
}

function collectSquareFloorSnaps(
  wx: number, wz: number, floors: number[],
  pieces: PlacedPiece[], coordinateIndex: Map<string, string>,
): SquareSnapResult[] {
  const results: SquareSnapResult[] = []
  for (const targetY of floors) {
    for (const s of [
      findTriEdgeForSquareSnap(wx, wz, targetY, pieces, coordinateIndex),
      findSquareSnapNeighbor(wx, wz, targetY, pieces, coordinateIndex),
    ]) { if (s) results.push(s) }
    if (targetY > 0) {
      for (const s of [
        findTriEdgeForSquareSnap(wx, wz, targetY - 1, pieces, coordinateIndex),
        findSquareSnapNeighbor(wx, wz, targetY - 1, pieces, coordinateIndex),
      ]) { if (s) results.push({ ...s, y: targetY }) }
    }
  }
  return results
}

export function TriHitPlane({ floorY }: HitPlaneProps) {
  const mode = useMode()
  const config = mode.pieces
  const bounds = mode.gridBounds
  const effectiveMaxFloors: number | 'infinite' = mode.maxFloors === 'dynamic' ? 'infinite' : mode.maxFloors
  const topSet = new Set(mode.topFloorAllowedTypes)
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const pieces = useStore((s) => s.pieces)
  const coordinateIndex = useStore((s) => s.coordinateIndex)
  const visibleLevels = useStore((s) => s.visibleLevels)
  const placeTrianglePiece = useStore((s) => s.placeTrianglePiece)
  const placeTriangleEdgePiece = useStore((s) => s.placeTriangleEdgePiece)
  const placeTriangleSnapped = useStore((s) => s.placeTriangleSnapped)
  const placeTriSnapEdgePiece = useStore((s) => s.placeTriSnapEdgePiece)
  const placeSquareSnapped = useStore((s) => s.placeSquareSnapped)
  const placeSquareSnapEdgePiece = useStore((s) => s.placeSquareSnapEdgePiece)
  const [ghost, setGhost] = useState<TriGhostState | null>(null)

  if (!selectedPieceType) return null

  const pieceConfig = config[selectedPieceType]
  if (!pieceConfig) return null

  const isTriType = selectedPieceType.includes('triangle')
  const isEdgeType = pieceConfig.placementType === 'edge'
  // Square cell types that can snap to triangle edges (hulls, floors)
  const isSquareSnapType = pieceConfig.placementType === 'cell' && !isTriType
    && (pieceConfig.category === 'hull' || pieceConfig.category === 'floor')

  // This hit plane handles: triangle cells, edge pieces on triangles/snapped-squares, square cells snapping to triangles
  if (!isTriType && !isEdgeType && !isSquareSnapType) return null
  // Triangle edge piece types don't exist — skip
  if (isTriType && isEdgeType) return null

  // All visible upper floors to scan for snap targets
  const upperFloors = ([1, 2] as const).filter((f) => visibleLevels.has(f)) as number[]
  // For ground-only pieces, just use floorY; for upper/null, scan upper floors
  const snapFloors = pieceConfig.floorConstraint === 'ground_only' ? [floorY] : (upperFloors.length > 0 ? upperFloors : [floorY])

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    // Square cell snapping to triangle edges or adjacent snapped squares
    if (isSquareSnapType) {
      const sqCandidates = collectSquareFloorSnaps(e.point.x, e.point.z, snapFloors, pieces, coordinateIndex)
      const sqSnap = pickClosestSquareSnap(sqCandidates, e.point.x, e.point.z)
      if (sqSnap) {
        e.stopPropagation()
        const triCoord: TriCoord = { hq: 0, hr: 0, slot: 0 }
        setGhost({ triCoord, y: floorY, squareSnap: sqSnap })
      } else {
        setGhost(null)
      }
      return
    }

    if (isEdgeType) {
      // Scan visible floors top-to-bottom for a foundation or edge-below to attach to
      const { hq, hr, slot } = worldToTriCoord(e.point.x, e.point.z)
      const detectedEdge = detectTriEdge(hq, hr, slot, e.point.x, e.point.z)
      for (const f of [2, 1, 0] as const) {
        if (!visibleLevels.has(f)) continue
        // Check hex-grid triangles (foundation or edge stacking)
        const triKey = toTriKey(hq, f, hr, slot)
        const hasTriFound = coordinateIndex.has(triKey)
        const hasTriEdgeBelow = f > 0
          && coordinateIndex.has(toTriEdgeKey(hq, f - 1, hr, slot, detectedEdge))
        if (hasTriFound || hasTriEdgeBelow) {
          e.stopPropagation()
          const triCoord: TriCoord = { hq, hr, slot: slot as TriCoord['slot'] }
          setGhost({ triCoord, y: f, triEdge: detectedEdge })
          return
        }
        // Check snap-placed triangles
        const se = findSnapTriForEdge(e.point.x, e.point.z, f, pieces)
        if (se) {
          e.stopPropagation()
          const triCoord2: TriCoord = { hq: 0, hr: 0, slot: 0 }
          setGhost({ triCoord: triCoord2, y: f, snapEdge: se })
          return
        }
        // Check snap-placed squares
        const sqse = findSquareSnapForEdge(e.point.x, e.point.z, f, pieces)
        if (sqse) {
          e.stopPropagation()
          const triCoord3: TriCoord = { hq: 0, hr: 0, slot: 0 }
          setGhost({ triCoord: triCoord3, y: f, squareSnapEdge: sqse })
          return
        }
      }
      // No triangle/square found — let event pass through to square HitPlane
      setGhost(null)
      return
    }

    // Triangle cell piece: always claim the event
    e.stopPropagation()
    const snapCandidates = collectFloorSnaps(e.point.x, e.point.z, snapFloors, pieces, coordinateIndex)
    const snap = pickClosestSnap(snapCandidates, e.point.x, e.point.z)
    if (snap) {
      const triCoord: TriCoord = { hq: 0, hr: 0, slot: 0 }
      setGhost({ triCoord, y: floorY, snap })
      return
    }

    // Fall back to hex grid placement
    const { hq, hr, slot } = worldToTriCoord(e.point.x, e.point.z)
    const triCoord: TriCoord = { hq, hr, slot: slot as TriCoord['slot'] }
    setGhost({ triCoord, y: floorY })
  }

  function handlePointerLeave() {
    setGhost(null)
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (e.delta > 5) return
    // Square cell snapping to triangle edges or adjacent snapped squares
    if (isSquareSnapType) {
      const sqCandidates = collectSquareFloorSnaps(e.point.x, e.point.z, snapFloors, pieces, coordinateIndex)
      const sqSnap = pickClosestSquareSnap(sqCandidates, e.point.x, e.point.z)
      if (sqSnap) {
        e.stopPropagation()
        if (canPlaceSquareSnapWith(selectedPieceType!, sqSnap, pieces, coordinateIndex, config, effectiveMaxFloors, topSet)) {
          placeSquareSnapped(selectedPieceType!, sqSnap)
        }
      }
      return
    }

    if (isEdgeType) {
      // Scan visible floors top-to-bottom for a foundation or edge-below to attach to
      const { hq, hr, slot } = worldToTriCoord(e.point.x, e.point.z)
      const detectedEdge = detectTriEdge(hq, hr, slot, e.point.x, e.point.z)
      for (const f of [2, 1, 0] as const) {
        if (!visibleLevels.has(f)) continue
        // Check hex-grid triangles (foundation or edge stacking)
        const triKey = toTriKey(hq, f, hr, slot)
        const hasTriFound = coordinateIndex.has(triKey)
        const hasTriEdgeBelow = f > 0
          && coordinateIndex.has(toTriEdgeKey(hq, f - 1, hr, slot, detectedEdge))
        if (hasTriFound || hasTriEdgeBelow) {
          e.stopPropagation()
          const triCoord: TriCoord = { hq, hr, slot: slot as TriCoord['slot'] }
          if (canPlaceWith(selectedPieceType!, { x: 0, y: f, z: 0 }, pieces, coordinateIndex, config, bounds, effectiveMaxFloors, topSet, undefined, triCoord, detectedEdge)) {
            placeTriangleEdgePiece(selectedPieceType!, f, triCoord, detectedEdge)
          }
          return
        }
        // Check snap-placed triangles
        const se = findSnapTriForEdge(e.point.x, e.point.z, f, pieces)
        if (se) {
          e.stopPropagation()
          if (canPlaceTriSnapEdgeWith(selectedPieceType!, se.parentSnap, f, se.edge, pieces, coordinateIndex, config, effectiveMaxFloors, topSet)) {
            placeTriSnapEdgePiece(selectedPieceType!, se.parentSnap, f, se.edge)
          }
          return
        }
        // Check snap-placed squares
        const sqse = findSquareSnapForEdge(e.point.x, e.point.z, f, pieces)
        if (sqse) {
          e.stopPropagation()
          if (canPlaceSquareSnapEdgeWith(selectedPieceType!, sqse.parentSnap, f, sqse.side, pieces, coordinateIndex, config, effectiveMaxFloors, topSet)) {
            placeSquareSnapEdgePiece(selectedPieceType!, sqse.parentSnap, f, sqse.side)
          }
          return
        }
      }
      return
    }

    // Triangle cell piece: always claim the event
    e.stopPropagation()

    // Check for snap — pick whichever candidate centroid is closest to cursor
    const snapCandidates = collectFloorSnaps(e.point.x, e.point.z, snapFloors, pieces, coordinateIndex)
    const snap = pickClosestSnap(snapCandidates, e.point.x, e.point.z)
    if (snap) {
      if (canPlaceTriSnapWith(selectedPieceType!, snap, pieces, coordinateIndex, config, effectiveMaxFloors, topSet)) {
        placeTriangleSnapped(selectedPieceType!, snap)
      }
      return
    }

    // Fall back to hex grid placement
    const { hq, hr, slot } = worldToTriCoord(e.point.x, e.point.z)
    const triCoord: TriCoord = { hq, hr, slot: slot as TriCoord['slot'] }
    if (canPlaceWith(selectedPieceType!, { x: 0, y: floorY, z: 0 }, pieces, coordinateIndex, config, bounds, effectiveMaxFloors, topSet, undefined, triCoord)) {
      placeTrianglePiece(selectedPieceType!, floorY, triCoord)
    }
  }

  // Compute ghost validity
  let isValid = false
  if (ghost) {
    if (ghost.squareSnap) {
      isValid = canPlaceSquareSnapWith(selectedPieceType, ghost.squareSnap, pieces, coordinateIndex, config, effectiveMaxFloors, topSet)
    } else if (ghost.squareSnapEdge) {
      isValid = canPlaceSquareSnapEdgeWith(selectedPieceType, ghost.squareSnapEdge.parentSnap, ghost.squareSnapEdge.y, ghost.squareSnapEdge.side, pieces, coordinateIndex, config, effectiveMaxFloors, topSet)
    } else if (ghost.snapEdge) {
      isValid = canPlaceTriSnapEdgeWith(selectedPieceType, ghost.snapEdge.parentSnap, ghost.snapEdge.y, ghost.snapEdge.edge, pieces, coordinateIndex, config, effectiveMaxFloors, topSet)
    } else if (ghost.snap) {
      isValid = canPlaceTriSnapWith(selectedPieceType, ghost.snap, pieces, coordinateIndex, config, effectiveMaxFloors, topSet)
    } else {
      isValid = canPlaceWith(selectedPieceType, { x: 0, y: ghost.y, z: 0 }, pieces, coordinateIndex, config, bounds, effectiveMaxFloors, topSet, undefined, ghost.triCoord, ghost.triEdge)
    }
  }

  const planeSize = 24

  return (
    <>
      <mesh
        position={[HEX_ORIGIN.x, floorY + 0.001, HEX_ORIGIN.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {ghost && ghost.squareSnap && (
        <SquareSnapGhostPiece
          type={selectedPieceType}
          squareSnap={ghost.squareSnap}
          valid={isValid}
        />
      )}
      {ghost && ghost.squareSnapEdge && (
        <SquareSnapEdgeGhostPiece
          type={selectedPieceType}
          squareSnapEdge={ghost.squareSnapEdge}
          valid={isValid}
        />
      )}
      {ghost && ghost.snap && isTriType && (
        <TriSnapGhostPiece
          type={selectedPieceType}
          snap={ghost.snap}
          valid={isValid}
        />
      )}
      {ghost && !ghost.snap && ghost.triEdge === undefined && isTriType && (
        <TriGhostPiece
          type={selectedPieceType}
          triCoord={ghost.triCoord}
          y={ghost.y}
          valid={isValid}
        />
      )}
      {ghost && !ghost.snapEdge && ghost.triEdge !== undefined && (
        <TriEdgeGhostPiece
          type={selectedPieceType}
          triCoord={ghost.triCoord}
          triEdge={ghost.triEdge}
          y={ghost.y}
          valid={isValid}
        />
      )}
      {ghost && ghost.snapEdge && (
        <TriSnapEdgeGhostPiece
          type={selectedPieceType}
          snapEdge={ghost.snapEdge}
          valid={isValid}
        />
      )}
    </>
  )
}

function TriSnapGhostPiece({ type, snap, valid }: { type: string; snap: SnapResult; valid: boolean }) {
  const color = valid ? GHOST_VALID_COLOR : '#ff3333'

  return (
    <group position={[snap.worldX, snap.y, snap.worldZ]}>
      <CellMesh type={type} color={color} opacity={0.45} roughness={0.85} angleDeg={snap.angleDeg} />
    </group>
  )
}

function TriGhostPiece({ type, triCoord, y, valid }: { type: string; triCoord: TriCoord; y: number; valid: boolean }) {
  const color = valid ? GHOST_VALID_COLOR : '#ff3333'
  const wp = triSlotWorldPosition(triCoord.hq, y, triCoord.hr, triCoord.slot)
  const angleDeg = triSlotRotationDeg(triCoord.slot)

  return (
    <group position={[wp.x, wp.y, wp.z]}>
      <CellMesh type={type} color={color} opacity={0.45} roughness={0.85} angleDeg={angleDeg} />
    </group>
  )
}

function TriEdgeGhostPiece({ type, triCoord, triEdge, y, valid }: {
  type: string; triCoord: TriCoord; triEdge: TriEdgeIndex; y: number; valid: boolean
}) {
  const color = valid ? GHOST_VALID_COLOR : '#ff3333'
  const { hq, hr, slot } = triCoord
  const wp = triEdgeWorldPosition(hq, y, hr, slot, triEdge)
  const rotDeg = triEdgeRotationDeg(slot, triEdge)
  const rotRad = (rotDeg * Math.PI) / 180
  const wallH = type.includes('low') || type.includes('barrier') ? 0.33 : 1.0

  return (
    <group position={[wp.x, wp.y + wallH / 2, wp.z]} rotation={[0, rotRad, 0]}>
      <EdgeMesh type={type} side="north" color={color} opacity={0.45} roughness={0.85} />
    </group>
  )
}

function TriSnapEdgeGhostPiece({ type, snapEdge, valid }: {
  type: string; snapEdge: SnapEdgeResult; valid: boolean
}) {
  const color = valid ? GHOST_VALID_COLOR : '#ff3333'
  const { worldX, worldZ, angleDeg } = snapEdge.parentSnap
  const wp = triSnapEdgeWorldPosition(worldX, worldZ, angleDeg, snapEdge.y, snapEdge.edge)
  const rotDeg = triSnapEdgeRotationDeg(worldX, worldZ, angleDeg, snapEdge.edge)
  const rotRad = (rotDeg * Math.PI) / 180
  const wallH = type.includes('low') || type.includes('barrier') ? 0.33 : 1.0

  return (
    <group position={[wp.x, wp.y + wallH / 2, wp.z]} rotation={[0, rotRad, 0]}>
      <EdgeMesh type={type} side="north" color={color} opacity={0.45} roughness={0.85} />
    </group>
  )
}

function SquareSnapGhostPiece({ type, squareSnap, valid }: {
  type: string; squareSnap: SquareSnapResult; valid: boolean
}) {
  const color = valid ? GHOST_VALID_COLOR : '#ff3333'
  const shape = getCellPieceShape(type)
  const rotRad = (squareSnap.rotDeg * Math.PI) / 180

  return (
    <group
      position={[squareSnap.worldX, squareSnap.y + shape.offset[1], squareSnap.worldZ]}
      rotation={[0, rotRad, 0]}
    >
      <CellMesh type={type} color={color} opacity={0.45} roughness={0.85} />
    </group>
  )
}

function SquareSnapEdgeGhostPiece({ type, squareSnapEdge, valid }: {
  type: string; squareSnapEdge: SquareSnapEdgeResult; valid: boolean
}) {
  const color = valid ? GHOST_VALID_COLOR : '#ff3333'
  const { worldX, worldZ, rotDeg } = squareSnapEdge.parentSnap
  const wp = squareSnapEdgeWorldPosition(worldX, worldZ, rotDeg, squareSnapEdge.y, squareSnapEdge.side)
  const edgeRotDeg = squareSnapEdgeRotationDeg(rotDeg, squareSnapEdge.side)
  const rotRad = (edgeRotDeg * Math.PI) / 180
  const wallH = type.includes('low') || type.includes('barrier') ? 0.33 : 1.0

  return (
    <group position={[wp.x, wp.y + wallH / 2, wp.z]} rotation={[0, rotRad, 0]}>
      <EdgeMesh type={type} side="north" color={color} opacity={0.45} roughness={0.85} />
    </group>
  )
}
