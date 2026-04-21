import { deflateSync, inflateSync } from 'fflate'
import type { PlacedPiece, PieceRotation, PieceSide, TriSlot, TriEdgeIndex } from '../types'

/** Compact wire format — no id, short keys, arrays for coords */
interface CompactPiece {
  t: string
  p: [number, number, number]
  r: number
  s?: string
  tc?: [number, number, number]
  te?: number
  ts?: [number, number, number]
  ss?: [number, number, number]
  tr?: string
  sl?: 0 | 1
}

function toCompact(piece: PlacedPiece): CompactPiece {
  const c: CompactPiece = {
    t: piece.type,
    p: [piece.position.x, piece.position.y, piece.position.z],
    r: piece.rotation,
  }
  if (piece.side) c.s = piece.side
  if (piece.triCoord) c.tc = [piece.triCoord.hq, piece.triCoord.hr, piece.triCoord.slot]
  if (piece.triEdge != null) c.te = piece.triEdge
  if (piece.triSnap) c.ts = [piece.triSnap.worldX, piece.triSnap.worldZ, piece.triSnap.angleDeg]
  if (piece.squareSnap) c.ss = [piece.squareSnap.worldX, piece.squareSnap.worldZ, piece.squareSnap.rotDeg]
  if (piece.tier) c.tr = piece.tier
  if (piece.stackLevel != null) c.sl = piece.stackLevel
  return c
}

function fromCompact(c: CompactPiece): PlacedPiece {
  const piece: PlacedPiece = {
    id: crypto.randomUUID(),
    type: c.t,
    position: { x: c.p[0], y: c.p[1], z: c.p[2] },
    rotation: c.r as PieceRotation,
  }
  if (c.s) piece.side = c.s as PieceSide
  if (c.tc) piece.triCoord = { hq: c.tc[0], hr: c.tc[1], slot: c.tc[2] as TriSlot }
  if (c.te != null) piece.triEdge = c.te as TriEdgeIndex
  if (c.ts) piece.triSnap = { worldX: c.ts[0], worldZ: c.ts[1], angleDeg: c.ts[2] }
  if (c.ss) piece.squareSnap = { worldX: c.ss[0], worldZ: c.ss[1], rotDeg: c.ss[2] }
  if (c.tr) piece.tier = c.tr
  if (c.sl != null) piece.stackLevel = c.sl
  return piece
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - s.length % 4) % 4)
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

interface VersionedPayload {
  v: 1
  p: CompactPiece[]
}

export function encodePieces(pieces: PlacedPiece[]): string {
  const payload: VersionedPayload = { v: 1, p: pieces.map(toCompact) }
  const json = JSON.stringify(payload)
  const compressed = deflateSync(new TextEncoder().encode(json))
  return 'z:' + toBase64Url(compressed)
}

export function decodePieces(encoded: string): PlacedPiece[] | null {
  if (!encoded) return null
  try {
    if (encoded.startsWith('z:')) {
      const bytes = fromBase64Url(encoded.slice(2))
      const json = new TextDecoder().decode(inflateSync(bytes))
      const parsed = JSON.parse(json)
      const compact: CompactPiece[] = Array.isArray(parsed) ? parsed : parsed.p
      if (!Array.isArray(compact)) return null
      return compact.map(fromCompact)
    }
    // Legacy: raw base64 JSON (may be flat array or versioned object)
    const json = atob(encoded)
    const parsed = JSON.parse(json)
    const arr = Array.isArray(parsed) ? parsed : parsed.p
    if (!Array.isArray(arr)) return null
    return arr.map(fromCompact)
  } catch {
    return null
  }
}
