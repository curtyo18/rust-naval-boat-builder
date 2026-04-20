import { useEffect } from 'react'
import { useStore } from '../core/store/useStore'
import { encodePieces, decodePieces } from '../core/utils/serialization'

const STORAGE_KEY = 'naval-planner-design'

export function usePersistence() {
  const pieces = useStore((s) => s.pieces)
  const loadPieces = useStore((s) => s.loadPieces)

  // Restore on mount: URL hash takes priority over localStorage
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#data=')) {
      const encoded = hash.slice('#data='.length)
      const loaded = decodePieces(encoded)
      if (loaded) {
        loadPieces(loaded)
        return
      }
    }
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const loaded = decodePieces(saved)
      if (loaded) loadPieces(loaded)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, encodePieces(pieces))
  }, [pieces])
}
