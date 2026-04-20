// src/scene/SceneGrid.tsx
import { Grid } from '@react-three/drei'
import { useStore } from '../../store/useStore'

const FLOOR_Y = [0, 1, 2] as const

export default function SceneGrid() {
  const visibleLevels = useStore((s) => s.visibleLevels)
  const showGrid = useStore((s) => s.showGrid)

  if (!showGrid) return null

  return (
    <>
      {FLOOR_Y.map((y) =>
        visibleLevels.has(y) ? (
          <Grid
            key={y}
            position={[2.5, y, 5]}
            args={[5, 10]}
            cellSize={1}
            cellThickness={0.4}
            cellColor="#6a9ab0"
            sectionSize={5}
            sectionThickness={0.8}
            sectionColor="#4a7a90"
            fadeDistance={50}
            infiniteGrid={false}
          />
        ) : null
      )}
    </>
  )
}
