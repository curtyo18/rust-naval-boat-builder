import type { XYZ } from '../types'

export const toKey = (pos: XYZ): string => `${pos.x},${pos.y},${pos.z}`

export const fromKey = (key: string): XYZ => {
  const [x, y, z] = key.split(',').map(Number)
  return { x, y, z }
}
