import { describe, it, expect } from 'vitest'
import { encodeState, decodeState, encodePieces, decodePieces } from '../src/utils/serialization'
import type { PlacedPiece } from '../src/types'

const pieces: PlacedPiece[] = [
  { id: 'abc', type: 'wall', position: { x: 1, y: 0, z: 2 }, rotation: 0 },
  { id: 'def', type: 'sail', position: { x: 3, y: 1, z: 4 }, rotation: 90 },
]

describe('encodeState / decodeState', () => {
  it('round-trips pieces and uiScale', () => {
    const encoded = encodeState(pieces, 125)
    const result = decodeState(encoded)
    expect(result).not.toBeNull()
    expect(result!.pieces).toEqual(pieces)
    expect(result!.uiScale).toBe(125)
  })

  it('defaults uiScale to 100 when not provided', () => {
    const encoded = encodeState(pieces)
    const result = decodeState(encoded)
    expect(result!.uiScale).toBe(100)
  })

  it('handles empty pieces array', () => {
    const encoded = encodeState([], 80)
    const result = decodeState(encoded)
    expect(result!.pieces).toEqual([])
    expect(result!.uiScale).toBe(80)
  })

  it('returns null for invalid input', () => {
    expect(decodeState('!!!not-base64!!!')).toBeNull()
    expect(decodeState('')).toBeNull()
  })

  it('decodes legacy format (plain array) with default scale', () => {
    // Old format: base64 of a JSON array
    const legacyEncoded = encodePieces(pieces)
    const result = decodeState(legacyEncoded)
    expect(result).not.toBeNull()
    expect(result!.pieces).toEqual(pieces)
    expect(result!.uiScale).toBe(100)
  })
})

describe('encodePieces / decodePieces (legacy compat)', () => {
  it('round-trips pieces through encode/decode', () => {
    const encoded = encodePieces(pieces)
    expect(decodePieces(encoded)).toEqual(pieces)
  })

  it('encode returns a non-empty string', () => {
    expect(typeof encodePieces(pieces)).toBe('string')
    expect(encodePieces(pieces).length).toBeGreaterThan(0)
  })

  it('encodes empty array', () => {
    expect(decodePieces(encodePieces([]))).toEqual([])
  })

  it('returns null for invalid input', () => {
    expect(decodePieces('!!!not-base64!!!')).toBeNull()
    expect(decodePieces('')).toBeNull()
    expect(decodePieces('aGVsbG8=')).toBeNull()
  })
})
