// src/App.tsx
import { useState, useEffect } from 'react'
import './App.css'
import TopBar from './core/ui/TopBar'
import Sidebar from './core/ui/Sidebar'
import CameraHints from './core/ui/CameraHints'
import Viewport from './core/scene/Viewport'
import { useStore } from './core/store/useStore'
import { encodePieces } from './core/utils/serialization'
import { usePersistence } from './core/hooks/usePersistence'
import { ModeProvider, useMode } from './core/context/ModeContext'
import boatMode from './modes/boat'
import baseMode from './modes/base'
import { parseHashRoute, buildHashRoute } from './core/routing/hashRoute'
import type { ModeId } from './core/routing/hashRoute'

const LAST_MODE_KEY = 'rust-builder:lastMode'

function resolveModeFromHash(): ModeId {
  const parsed = parseHashRoute(window.location.hash)
  if (parsed) return parsed.mode
  const last = localStorage.getItem(LAST_MODE_KEY) as ModeId | null
  return last ?? 'boat'
}

function resolveModeConfig(modeId: ModeId) {
  return modeId === 'base' ? baseMode : boatMode
}

function AppInner() {
  const mode = useMode()
  const { StatsPanel } = mode
  usePersistence(mode.storageKey)

  const clearAll = useStore((s) => s.clearAll)
  const pieces = useStore((s) => s.pieces)
  const cameraResetFn = useStore((s) => s.cameraResetFn)
  const selectPieceType = useStore((s) => s.selectPieceType)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const deleteSelectedPiece = useStore((s) => s.deleteSelectedPiece)
  const clearSelection = useStore((s) => s.clearSelection)
  const [shareLabel, setShareLabel] = useState('Share')

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        selectPieceType(null)
        clearSelection()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedPiece()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectPieceType, undo, redo, deleteSelectedPiece, clearSelection])

  function handleShare() {
    const encoded = encodePieces(pieces)
    window.location.hash = buildHashRoute({ mode: mode.id, data: encoded })
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareLabel('Copied!')
      setTimeout(() => setShareLabel('Share'), 2000)
    })
  }

  function handleClear() {
    if (window.confirm('Remove all placed pieces?')) {
      clearAll()
      window.location.hash = buildHashRoute({ mode: mode.id, data: null })
    }
  }

  function handleModeChange(newMode: ModeId) {
    window.location.hash = buildHashRoute({ mode: newMode, data: null })
  }

  return (
    <div className="app">
      <TopBar
        onResetCamera={() => cameraResetFn?.()}
        onShare={handleShare}
        onClear={handleClear}
        shareLabel={shareLabel}
        modeId={mode.id}
        onModeChange={handleModeChange}
      />
      <div className="app__body">
        <Sidebar />
        <div className="app__viewport">
          <Viewport />
          <StatsPanel />
          <CameraHints />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [modeId, setModeId] = useState<ModeId>(resolveModeFromHash)

  useEffect(() => {
    function onHashChange() {
      const parsed = parseHashRoute(window.location.hash)
      if (parsed) setModeId(parsed.mode)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    localStorage.setItem(LAST_MODE_KEY, modeId)
    const parsed = parseHashRoute(window.location.hash)
    if (!parsed) window.location.hash = `#/${modeId}`
  }, [modeId])

  const modeConfig = resolveModeConfig(modeId)

  return (
    <ModeProvider config={modeConfig}>
      <AppInner />
    </ModeProvider>
  )
}
