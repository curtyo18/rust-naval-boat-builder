import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { encodePieces, decodePieces } from '../utils/serialization'
import { parseHashRoute } from '../routing/hashRoute'

const LEGACY_KEY = 'naval-planner-design'

export function usePersistence(storageKey: string) {
  const pieces = useStore((s) => s.pieces)
  const loadPieces = useStore((s) => s.loadPieces)

  useEffect(() => {
    // One-time migration: legacy key → boat storage key (only on the boat mode's first load)
    if (storageKey === 'rust-builder:boat') {
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (legacy && !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, legacy)
        localStorage.removeItem(LEGACY_KEY)
      }
    }

    const parsed = parseHashRoute(window.location.hash)
    if (parsed?.data) {
      const loaded = decodePieces(parsed.data)
      if (loaded) {
        loadPieces(loaded)
        return
      }
    }

    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const loaded = decodePieces(saved)
      if (loaded) loadPieces(loaded)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Auto-save to localStorage on every change
  useEffect(() => {
    localStorage.setItem(storageKey, encodePieces(pieces))
  }, [pieces, storageKey])
}
