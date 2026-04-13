// src/App.tsx
import { useState, useEffect } from 'react'
import './App.css'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import CostWidget from './components/CostWidget'
import CameraHints from './components/CameraHints'
import Viewport from './scene/Viewport'
import { useStore } from './store/useStore'
import { encodeState } from './utils/serialization'
import { usePersistence } from './hooks/usePersistence'

export default function App() {
  usePersistence()

  const clearAll = useStore((s) => s.clearAll)
  const pieces = useStore((s) => s.pieces)
  const cameraResetFn = useStore((s) => s.cameraResetFn)
  const selectPieceType = useStore((s) => s.selectPieceType)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const deleteSelectedPiece = useStore((s) => s.deleteSelectedPiece)
  const selectPiece = useStore((s) => s.selectPiece)
  const [shareLabel, setShareLabel] = useState('Share')

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        selectPieceType(null)
        selectPiece(null)
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
  }, [selectPieceType, undo, redo, deleteSelectedPiece, selectPiece])

  function handleShare() {
    const encoded = encodeState(pieces, useStore.getState().uiScale)
    window.location.hash = `#data=${encoded}`
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareLabel('Copied!')
      setTimeout(() => setShareLabel('Share'), 2000)
    })
  }

  function handleClear() {
    if (window.confirm('Remove all placed pieces?')) {
      clearAll()
      window.location.hash = ''
    }
  }

  return (
    <div className="app">
      <TopBar
        onResetCamera={() => cameraResetFn?.()}
        onShare={handleShare}
        onClear={handleClear}
        shareLabel={shareLabel}
      />
      <div className="app__body">
        <Sidebar />
        <div className="app__viewport">
          <Viewport />
          <CostWidget />
          <CameraHints />
        </div>
      </div>
    </div>
  )
}
