import type { ModeConfig, PiecesConfig } from '../../core/types'
import piecesJson from './pieces.json'
import SceneFixtures from './SceneFixtures'
import StatsPanel from './StatsPanel'

const pieces = piecesJson as PiecesConfig

const boatMode: ModeConfig = {
  id: 'boat',
  label: 'Boat',
  pieces,
  gridBounds: { x: 5, y: 3, z: 10 },
  maxFloors: 3,
  initialCamera: {
    position: [2.5, 10, 10],
    target: [2.5, 0, 5],
  },
  sceneBackground: '#2a4a68',
  SceneFixtures,
  StatsPanel,
  storageKey: 'rust-builder:boat',
  supportsTiers: false,
  topFloorAllowedTypes: ['low_wall', 'low_cannon_wall', 'low_wall_barrier'],
}

export default boatMode
