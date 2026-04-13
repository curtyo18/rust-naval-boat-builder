import { describe, it, expect } from 'vitest'
import { encodePieces, decodePieces } from '../src/utils/serialization'
import type { PlacedPiece } from '../src/types'

const pieces: PlacedPiece[] = [
  { id: 'abc', type: 'wall', position: { x: 1, y: 0, z: 2 }, rotation: 0 },
  { id: 'def', type: 'sail', position: { x: 3, y: 1, z: 4 }, rotation: 90 },
]

describe('encodePieces / decodePieces', () => {
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
    expect(decodePieces('aGVsbG8=')).toBeNull() // valid base64 but not valid pieces JSON
  })
})
