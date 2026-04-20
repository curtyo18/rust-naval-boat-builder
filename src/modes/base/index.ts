import type { ModeConfig, PiecesConfig } from '../../core/types'
import piecesJson from './pieces.json'
import SceneFixtures from './SceneFixtures'
import StatsPanel from './StatsPanel'
import { ENTRY_PIECE_TYPES } from './constants'

const pieces = piecesJson as PiecesConfig

const baseMode: ModeConfig = {
  id: 'base',
  label: 'Base',
  pieces,
  gridBounds: 'infinite',
  maxFloors: 'dynamic',
  initialCamera: {
    position: [12, 12, 16],
    target: [0, 0, 0],
  },
  sceneBackground: '#9fb5c4',
  SceneFixtures,
  StatsPanel,
  storageKey: 'rust-builder:base',
  supportsTiers: true,
  defaultTier: 'stone',
  entryPieceTypes: ENTRY_PIECE_TYPES,
  topFloorAllowedTypes: [],
}

export default baseMode
