import * as THREE from 'three'

let _texture: THREE.CanvasTexture | null = null

export function getGrassTexture(): THREE.CanvasTexture {
  if (_texture) return _texture

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#4a6a3a'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 2500; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const hueShift = Math.random()
    const green =
      hueShift < 0.33 ? '#3a5a2a' :
      hueShift < 0.66 ? '#5a7a4a' :
      '#6a8a5a'
    ctx.fillStyle = green
    ctx.fillRect(x, y, 1, Math.random() < 0.3 ? 2 : 1)
  }

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 4 + Math.random() * 10
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(30, 50, 25, 0.25)')
    grad.addColorStop(1, 'rgba(30, 50, 25, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  _texture = new THREE.CanvasTexture(canvas)
  _texture.wrapS = THREE.RepeatWrapping
  _texture.wrapT = THREE.RepeatWrapping
  _texture.repeat.set(40, 40)
  return _texture
}
