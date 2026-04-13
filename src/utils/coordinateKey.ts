import type { XYZ, PieceSide } from '../types'

export const toKey = (pos: XYZ): string => `${pos.x},${pos.y},${pos.z}`

export const toEdgeKey = (pos: XYZ, side: PieceSide): string => `${pos.x},${pos.y},${pos.z},${side}`

export const fromKey = (key: string): XYZ => {
  const [x, y, z] = key.split(',').map(Number)
  return { x, y, z }
}

export const toTriKey = (hq: number, y: number, hr: number, slot: number): string =>
  `t:${hq},${y},${hr},${slot}`

export const toTriEdgeKey = (hq: number, y: number, hr: number, slot: number, edge: number): string =>
  `te:${hq},${y},${hr},${slot},${edge}`

export const toTriSnapKey = (worldX: number, y: number, worldZ: number): string =>
  `tsnap:${Math.round(worldX * 1000)},${y},${Math.round(worldZ * 1000)}`

export const toTriSnapEdgeKey = (worldX: number, y: number, worldZ: number, edge: number): string =>
  `tsnapedge:${Math.round(worldX * 1000)},${y},${Math.round(worldZ * 1000)},${edge}`

export function parseTriKey(key: string): { hq: number; y: number; hr: number; slot: number } | null {
  if (!key.startsWith('t:')) return null
  if (key.startsWith('te:')) return null
  const parts = key.slice(2).split(',').map(Number)
  if (parts.length !== 4 || parts.some(isNaN)) return null
  return { hq: parts[0], y: parts[1], hr: parts[2], slot: parts[3] }
}
