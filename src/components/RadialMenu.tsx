import { useState, useEffect, useCallback } from 'react'
import './RadialMenu.css'
import { useStore } from '../store/useStore'
import piecesConfig from '../data/pieces-config.json'
import type { PiecesConfig, PieceCategory } from '../types'

const config = piecesConfig as PiecesConfig

const RADIAL_CATEGORIES: PieceCategory[] = ['hull', 'structural', 'floor']

export interface RadialPiece {
  type: string
  label: string
  category: PieceCategory
}

export function getRadialPieces(): RadialPiece[] {
  const result: RadialPiece[] = []
  for (const cat of RADIAL_CATEGORIES) {
    for (const [type, cfg] of Object.entries(config)) {
      if (cfg.category === cat) {
        result.push({ type, label: cfg.label, category: cat })
      }
    }
  }
  return result
}

function getAngleDeg(cx: number, cy: number, mx: number, my: number): number {
  const dx = mx - cx
  const dy = my - cy
  let angle = Math.atan2(dy, dx) * (180 / Math.PI)
  if (angle < 0) angle += 360
  return angle
}

function getHighlightedIndex(
  cx: number,
  cy: number,
  mx: number,
  my: number,
  count: number,
): number | null {
  const dx = mx - cx
  const dy = my - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 25) return null // too close to center
  const angle = getAngleDeg(cx, cy, mx, my)
  const sliceSize = 360 / count
  return Math.floor(((angle + sliceSize / 2) % 360) / sliceSize)
}

export default function RadialMenu() {
  const radialMenu = useStore((s) => s.radialMenu)
  const closeRadialMenu = useStore((s) => s.closeRadialMenu)
  const selectPieceType = useStore((s) => s.selectPieceType)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const pieces = getRadialPieces()
  const count = pieces.length
  const sliceSize = 360 / count

  const cx = radialMenu.x
  const cy = radialMenu.y

  const highlightedIndex = radialMenu.open
    ? getHighlightedIndex(cx, cy, mousePos.x, mousePos.y, count)
    : null

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    // Right-click released — close without selecting
    if (e.button === 2) {
      closeRadialMenu()
    }
  }, [closeRadialMenu])

  const handleClick = useCallback((e: MouseEvent) => {
    // Left-click — select highlighted piece and close
    if (e.button === 0 && highlightedIndex !== null) {
      e.preventDefault()
      e.stopPropagation()
      selectPieceType(pieces[highlightedIndex].type)
      closeRadialMenu()
    }
  }, [highlightedIndex, pieces, selectPieceType, closeRadialMenu])

  useEffect(() => {
    if (!radialMenu.open) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [radialMenu.open, handleMouseMove, handleMouseUp, handleClick])

  if (!radialMenu.open) return null

  // Find divider positions (angles between category groups)
  const dividerAngles: number[] = []
  for (let i = 1; i < count; i++) {
    if (pieces[i].category !== pieces[i - 1].category) {
      dividerAngles.push(i * sliceSize)
    }
  }

  return (
    <div
      className="radial-menu"
      style={{ left: cx - 140, top: cy - 140 }}
    >
      <div className="radial-menu__ring">
        {pieces.map((piece, i) => {
          const angle = i * sliceSize
          return (
            <div
              key={piece.type}
              className={`radial-menu__segment ${highlightedIndex === i ? 'radial-menu__segment--highlighted' : ''}`}
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <span className="radial-menu__segment-label">{piece.label}</span>
            </div>
          )
        })}
        {dividerAngles.map((angle) => (
          <div
            key={angle}
            className="radial-menu__divider"
            style={{ transform: `rotate(${angle - sliceSize / 2}deg)` }}
          />
        ))}
        <div className="radial-menu__center" />
      </div>
    </div>
  )
}
