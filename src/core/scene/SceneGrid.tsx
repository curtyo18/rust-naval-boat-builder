// src/scene/SceneGrid.tsx
import { Grid } from '@react-three/drei'
import { useStore } from '../store/useStore'
import { useMode } from '../context/ModeContext'

const FLOOR_Y = [0, 1, 2] as const

export default function SceneGrid() {
  const mode = useMode()
  const bounds = mode.gridBounds
  const gridW = bounds === 'infinite' ? 60 : bounds.x
  const gridL = bounds === 'infinite' ? 60 : bounds.z
  const centerX = bounds === 'infinite' ? 0 : gridW / 2
  const centerZ = bounds === 'infinite' ? 0 : gridL / 2
  const isInfinite = bounds === 'infinite'
  const visibleLevels = useStore((s) => s.visibleLevels)
  const showGrid = useStore((s) => s.showGrid)

  if (!showGrid) return null

  return (
    <>
      {FLOOR_Y.map((y) =>
        visibleLevels.has(y) ? (
          <Grid
            key={y}
            position={[centerX, y, centerZ]}
            args={[gridW, gridL]}
            cellSize={1}
            cellThickness={0.4}
            cellColor="#6a9ab0"
            sectionSize={5}
            sectionThickness={0.8}
            sectionColor="#4a7a90"
            fadeDistance={50}
            infiniteGrid={isInfinite}
          />
        ) : null
      )}
    </>
  )
}
