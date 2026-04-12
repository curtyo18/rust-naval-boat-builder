import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useStore } from '../src/store/useStore'

beforeEach(() => {
  act(() => useStore.getState().clearAll())
})

describe('placePiece', () => {
  it('adds piece to pieces array', () => {
    act(() => useStore.getState().placePiece('wall', { x: 0, y: 0, z: 0 }, 0))
    expect(useStore.getState().pieces).toHaveLength(1)
    expect(useStore.getState().pieces[0].type).toBe('wall')
  })

  it('updates coordinateIndex', () => {
    act(() => useStore.getState().placePiece('wall', { x: 1, y: 0, z: 2 }, 0))
    expect(useStore.getState().coordinateIndex.has('1,0,2')).toBe(true)
  })

  it('assigns unique id to each piece', () => {
    act(() => {
      useStore.getState().placePiece('wall', { x: 0, y: 0, z: 0 }, 0)
      useStore.getState().placePiece('wall', { x: 1, y: 0, z: 0 }, 0)
    })
    const { pieces } = useStore.getState()
    expect(pieces[0].id).not.toBe(pieces[1].id)
  })
})

describe('removePiece', () => {
  it('removes piece from pieces array', () => {
    act(() => useStore.getState().placePiece('wall', { x: 0, y: 0, z: 0 }, 0))
    const id = useStore.getState().pieces[0].id
    act(() => useStore.getState().removePiece(id))
    expect(useStore.getState().pieces).toHaveLength(0)
  })

  it('removes piece from coordinateIndex', () => {
    act(() => useStore.getState().placePiece('wall', { x: 0, y: 0, z: 0 }, 0))
    const id = useStore.getState().pieces[0].id
    act(() => useStore.getState().removePiece(id))
    expect(useStore.getState().coordinateIndex.has('0,0,0')).toBe(false)
  })
})

describe('clearAll', () => {
  it('empties pieces and coordinateIndex', () => {
    act(() => {
      useStore.getState().placePiece('wall', { x: 0, y: 0, z: 0 }, 0)
      useStore.getState().clearAll()
    })
    expect(useStore.getState().pieces).toHaveLength(0)
    expect(useStore.getState().coordinateIndex.size).toBe(0)
  })
})

describe('loadPieces', () => {
  it('replaces pieces and rebuilds coordinateIndex', () => {
    const incoming = [
      { id: 'x1', type: 'wall', position: { x: 2, y: 1, z: 3 }, rotation: 0 as const },
    ]
    act(() => useStore.getState().loadPieces(incoming))
    expect(useStore.getState().pieces).toEqual(incoming)
    expect(useStore.getState().coordinateIndex.get('2,1,3')).toBe('x1')
  })
})

describe('selectPieceType', () => {
  it('sets selectedPieceType', () => {
    act(() => useStore.getState().selectPieceType('cannon'))
    expect(useStore.getState().selectedPieceType).toBe('cannon')
  })
  it('clears selectedPieceType when set to null', () => {
    act(() => {
      useStore.getState().selectPieceType('cannon')
      useStore.getState().selectPieceType(null)
    })
    expect(useStore.getState().selectedPieceType).toBeNull()
  })
})

describe('setVisibleLevels', () => {
  it('updates visibleLevels', () => {
    act(() => useStore.getState().setVisibleLevels(new Set([0, 2])))
    expect(useStore.getState().visibleLevels).toEqual(new Set([0, 2]))
  })
})
