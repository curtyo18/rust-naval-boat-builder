import * as THREE from 'three'

let _texture: THREE.CanvasTexture | null = null

/**
 * Procedural wood grain canvas texture.
 * Light base with darker grain lines — designed to be tinted
 * by the material `color` property (map * color).
 */
export function getWoodTexture(): THREE.CanvasTexture {
  if (_texture) return _texture

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Light warm base — close to white so `color` controls the hue
  ctx.fillStyle = '#ede4d6'
  ctx.fillRect(0, 0, size, size)

  // Fine grain lines
  for (let y = 0; y < size; y++) {
    const wave1 = Math.sin(y * 0.35 + Math.sin(y * 0.06) * 5)
    const wave2 = Math.sin(y * 0.12 + 1.5)
    const grain = (wave1 * 0.5 + 0.5) * (wave2 * 0.3 + 0.7)
    const alpha = grain * 0.18
    ctx.fillStyle = `rgba(80, 45, 10, ${alpha})`
    ctx.fillRect(0, y, size, 1)
  }

  // Wider grain bands for depth
  for (let y = 0; y < size; y++) {
    const band = Math.sin(y * 0.07 + Math.sin(y * 0.015) * 4)
    if (band > 0.6) {
      const strength = (band - 0.6) * 0.2
      ctx.fillStyle = `rgba(70, 35, 5, ${strength})`
      ctx.fillRect(0, y, size, 1)
    }
  }

  // Subtle knots
  const knots = [
    { x: 60, y: 40, r: 8 },
    { x: 180, y: 150, r: 6 },
    { x: 100, y: 220, r: 7 },
  ]
  for (const knot of knots) {
    const grad = ctx.createRadialGradient(knot.x, knot.y, 0, knot.x, knot.y, knot.r)
    grad.addColorStop(0, 'rgba(70, 35, 5, 0.12)')
    grad.addColorStop(0.6, 'rgba(70, 35, 5, 0.06)')
    grad.addColorStop(1, 'rgba(70, 35, 5, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(knot.x - knot.r, knot.y - knot.r, knot.r * 2, knot.r * 2)
  }

  _texture = new THREE.CanvasTexture(canvas)
  _texture.wrapS = THREE.RepeatWrapping
  _texture.wrapT = THREE.RepeatWrapping
  _texture.repeat.set(2, 2)
  return _texture
}
