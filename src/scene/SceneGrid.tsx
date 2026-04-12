// src/scene/SceneGrid.tsx
import { Grid } from '@react-three/drei'
import { useStore } from '../store/useStore'

const FLOOR_Y = [0, 1, 2] as const

export default function SceneGrid() {
  const visibleLevels = useStore((s) => s.visibleLevels)

  return (
    <>
      {FLOOR_Y.map((y) =>
        visibleLevels.has(y) ? (
          <Grid
            key={y}
            position={[2.5, y, 5.5]}
            args={[5, 11]}
            cellSize={1}
            cellThickness={0.4}
            cellColor="#444"
            sectionSize={5}
            sectionThickness={0.8}
            sectionColor="#666"
            fadeDistance={50}
            infiniteGrid={false}
          />
        ) : null
      )}
    </>
  )
}
