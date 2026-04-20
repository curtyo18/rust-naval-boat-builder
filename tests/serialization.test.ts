import { describe, it, expect } from 'vitest'
import { encodePieces, decodePieces } from '../src/core/utils/serialization'
import type { PlacedPiece } from '../src/core/types'

const pieces: PlacedPiece[] = [
  { id: 'abc', type: 'wall', position: { x: 1, y: 0, z: 2 }, rotation: 0 },
  { id: 'def', type: 'sail', position: { x: 3, y: 1, z: 4 }, rotation: 90 },
]

function stripIds(arr: PlacedPiece[]): Omit<PlacedPiece, 'id'>[] {
  return arr.map(({ id: _, ...rest }) => rest)
}

describe('encodePieces / decodePieces', () => {
  it('round-trips pieces through encode/decode (ignoring regenerated ids)', () => {
    const encoded = encodePieces(pieces)
    const decoded = decodePieces(encoded)!
    expect(stripIds(decoded)).toEqual(stripIds(pieces))
    // IDs are regenerated, so they should differ from originals
    expect(decoded[0].id).not.toBe('abc')
    expect(decoded[0].id).toBeTruthy()
  })

  it('encode returns a compressed string starting with z:', () => {
    const encoded = encodePieces(pieces)
    expect(encoded.startsWith('z:')).toBe(true)
    expect(encoded.length).toBeGreaterThan(0)
  })

  it('compressed output is shorter than legacy base64', () => {
    const compressed = encodePieces(pieces)
    const legacy = btoa(JSON.stringify(pieces))
    expect(compressed.length).toBeLessThan(legacy.length)
  })

  it('encodes empty array', () => {
    expect(decodePieces(encodePieces([]))).toEqual([])
  })

  it('decodes legacy base64 format (backward compat)', () => {
    const legacy = btoa(JSON.stringify(pieces))
    const decoded = decodePieces(legacy)
    expect(decoded).toEqual(pieces)
  })

  it('returns null for invalid input', () => {
    expect(decodePieces('!!!not-base64!!!')).toBeNull()
    expect(decodePieces('')).toBeNull()
    expect(decodePieces('z:invalid')).toBeNull()
  })

  it('round-trips pieces with triCoord and triEdge', () => {
    const triPieces: PlacedPiece[] = [
      { id: '1', type: 'triangle_hull', position: { x: 0, y: 0, z: 0 }, rotation: 0, triCoord: { hq: 1, hr: -1, slot: 3 }, triEdge: 2 },
    ]
    const decoded = decodePieces(encodePieces(triPieces))!
    expect(stripIds(decoded)).toEqual(stripIds(triPieces))
  })

  it('round-trips pieces with triSnap and squareSnap', () => {
    const snapPieces: PlacedPiece[] = [
      { id: '1', type: 'triangle_hull', position: { x: 0, y: 0, z: 0 }, rotation: 0, triSnap: { worldX: 1.5, worldZ: 2.3, angleDeg: 60 } },
      { id: '2', type: 'square_hull', position: { x: 0, y: 0, z: 0 }, rotation: 0, squareSnap: { worldX: 3.1, worldZ: 4.2, rotDeg: 90 } },
    ]
    const decoded = decodePieces(encodePieces(snapPieces))!
    expect(stripIds(decoded)).toEqual(stripIds(snapPieces))
  })
})
