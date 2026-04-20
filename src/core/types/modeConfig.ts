import type { ComponentType } from 'react'
import type { PiecesConfig } from './index'

export type GridBounds = { x: number; y: number; z: number } | 'infinite'

export type MaxFloors = number | 'dynamic'

export interface ModeConfig {
  id: 'boat' | 'base'
  label: string
  pieces: PiecesConfig
  gridBounds: GridBounds
  maxFloors: MaxFloors
  initialCamera: {
    position: [number, number, number]
    target: [number, number, number]
  }
  sceneBackground: string
  SceneFixtures: ComponentType
  StatsPanel: ComponentType
  storageKey: string
  supportsTiers: boolean
  defaultTier?: string
  entryPieceTypes?: string[]
  topFloorAllowedTypes: string[]
}
