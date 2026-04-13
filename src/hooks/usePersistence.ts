import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { encodeState, decodeState } from '../utils/serialization'

const STORAGE_KEY = 'naval-planner-design'

export function usePersistence() {
  const pieces = useStore((s) => s.pieces)
  const uiScale = useStore((s) => s.uiScale)
  const loadPieces = useStore((s) => s.loadPieces)
  const setUiScale = useStore((s) => s.setUiScale)

  // Restore on mount: URL hash takes priority over localStorage
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#data=')) {
      const encoded = hash.slice('#data='.length)
      const state = decodeState(encoded)
      if (state) {
        loadPieces(state.pieces)
        setUiScale(state.uiScale)
        return
      }
    }
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const state = decodeState(saved)
      if (state) {
        loadPieces(state.pieces)
        setUiScale(state.uiScale)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, encodeState(pieces, uiScale))
  }, [pieces, uiScale])
}
