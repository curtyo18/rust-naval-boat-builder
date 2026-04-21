import * as THREE from 'three'
import { getWoodTexture } from './woodTexture'

let _stone: THREE.CanvasTexture | null = null
let _metal: THREE.CanvasTexture | null = null
let _hqm: THREE.CanvasTexture | null = null

/** Returns the procedural texture for a given tier, defaults to wood. */
export function getTierTexture(tier?: string): THREE.CanvasTexture {
  switch (tier) {
    case 'stone': return getStoneTexture()
    case 'metal': return getMetalTexture()
    case 'hqm':   return getHqmTexture()
    default:      return getWoodTexture()
  }
}

/**
 * Stone — grainy cool-grey with irregular darker crevices.
 * Bright base so the material `color` can tint it via map * color.
 */
export function getStoneTexture(): THREE.CanvasTexture {
  if (_stone) return _stone

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#d8d4cd'
  ctx.fillRect(0, 0, size, size)

  // Fine grain speckle via per-pixel noise
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 55
    d[i]     = clamp255(d[i] + n)
    d[i + 1] = clamp255(d[i + 1] + n)
    d[i + 2] = clamp255(d[i + 2] + n)
  }
  ctx.putImageData(img, 0, 0)

  // Irregular darker crack lines for mortar/crevice feel
  ctx.strokeStyle = 'rgba(55, 50, 45, 0.35)'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 9; i++) {
    ctx.beginPath()
    let x = Math.random() * size
    let y = Math.random() * size
    ctx.moveTo(x, y)
    for (let j = 0; j < 6; j++) {
      x += (Math.random() - 0.5) * 45
      y += (Math.random() - 0.5) * 45
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // A few lighter highlight blobs for uneven stone surface
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 10 + Math.random() * 14
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(255, 252, 245, 0.12)')
    grad.addColorStop(1, 'rgba(255, 252, 245, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  _stone = new THREE.CanvasTexture(canvas)
  _stone.wrapS = THREE.RepeatWrapping
  _stone.wrapT = THREE.RepeatWrapping
  _stone.repeat.set(2, 2)
  return _stone
}

/**
 * Metal — rusty corrugated steel. Warm weathered base with corrugation
 * ridges, irregular orange rust patches, and a few lighter scuffs where
 * the rust has worn through.
 */
export function getMetalTexture(): THREE.CanvasTexture {
  if (_metal) return _metal

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Warm weathered base
  ctx.fillStyle = '#e2cdb0'
  ctx.fillRect(0, 0, size, size)

  // Corrugation: one ridge every 32px — shadow groove + highlight band.
  const period = 32
  for (let yTop = 0; yTop < size; yTop += period) {
    const shadowY = yTop + period * 0.55
    const shadowGrad = ctx.createLinearGradient(0, shadowY - 6, 0, shadowY + 6)
    shadowGrad.addColorStop(0, 'rgba(60, 35, 15, 0)')
    shadowGrad.addColorStop(0.5, 'rgba(60, 35, 15, 0.42)')
    shadowGrad.addColorStop(1, 'rgba(60, 35, 15, 0)')
    ctx.fillStyle = shadowGrad
    ctx.fillRect(0, shadowY - 6, size, 12)

    const highlightY = yTop + period * 0.1
    const highGrad = ctx.createLinearGradient(0, highlightY - 4, 0, highlightY + 4)
    highGrad.addColorStop(0, 'rgba(255, 245, 225, 0)')
    highGrad.addColorStop(0.5, 'rgba(255, 245, 225, 0.28)')
    highGrad.addColorStop(1, 'rgba(255, 245, 225, 0)')
    ctx.fillStyle = highGrad
    ctx.fillRect(0, highlightY - 4, size, 8)
  }

  // Irregular rust patches — warm orange/brown blobs
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 12 + Math.random() * 28
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(130, 55, 20, 0.45)')
    grad.addColorStop(0.5, 'rgba(155, 75, 30, 0.22)')
    grad.addColorStop(1, 'rgba(155, 75, 30, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Darker pitting / deep rust spots
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 2 + Math.random() * 3
    ctx.fillStyle = `rgba(75, 35, 12, ${(0.35 + Math.random() * 0.25).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // A few brighter scuffs where the rust has worn through to bare steel
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 6 + Math.random() * 10
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(240, 235, 225, 0.35)')
    grad.addColorStop(1, 'rgba(240, 235, 225, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  _metal = new THREE.CanvasTexture(canvas)
  _metal.wrapS = THREE.RepeatWrapping
  _metal.wrapT = THREE.RepeatWrapping
  _metal.repeat.set(1, 1)
  return _metal
}

/**
 * HQM — dark gunmetal armor plate: medium-grey base multiplied by a dark
 * color tint, with a 4×4 panel grid and brighter rivets at every
 * intersection to catch the eye against the dark surface.
 */
export function getHqmTexture(): THREE.CanvasTexture {
  if (_hqm) return _hqm

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Medium-grey base — the dark tint color will darken it further
  ctx.fillStyle = '#c8cbce'
  ctx.fillRect(0, 0, size, size)

  // Fine horizontal brushing
  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 1.8) * 0.5 + 0.5
    const alpha = (Math.random() * 0.14 + 0.04) * wave
    ctx.fillStyle = `rgba(20, 25, 32, ${alpha.toFixed(3)})`
    ctx.fillRect(0, y, size, 1)
  }

  // Subtle lighter patches for plate unevenness
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 20 + Math.random() * 30
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // 4×4 panel grid — dark seams
  ctx.strokeStyle = 'rgba(15, 20, 28, 0.6)'
  ctx.lineWidth = 1.5
  for (let i = 1; i < 4; i++) {
    const pos = (size / 4) * i
    ctx.beginPath()
    ctx.moveTo(0, pos); ctx.lineTo(size, pos)
    ctx.moveTo(pos, 0); ctx.lineTo(pos, size)
    ctx.stroke()
  }

  // Brighter rivets so they stand out on the dark gunmetal
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 4; j++) {
      const x = (size / 4) * i
      const y = (size / 4) * j
      drawRivet(ctx, x, y, 3.0, '#c8ccd2', '#f3f5f7')
    }
  }

  _hqm = new THREE.CanvasTexture(canvas)
  _hqm.wrapS = THREE.RepeatWrapping
  _hqm.wrapT = THREE.RepeatWrapping
  _hqm.repeat.set(1, 1)
  return _hqm
}

function drawRivet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  dark: string,
  light: string,
) {
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
  grad.addColorStop(0, light)
  grad.addColorStop(0.7, dark)
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function clamp255(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n
}
