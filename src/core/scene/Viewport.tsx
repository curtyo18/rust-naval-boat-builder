// src/scene/Viewport.tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef, useCallback, useEffect } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import SceneGrid from './SceneGrid'
import PlacedPieces from './PlacedPieces'
import HitPlane, { TriHitPlane } from './HitPlane'
import { useStore } from '../store/useStore'
import { useMode } from '../context/ModeContext'

function SceneSetup() {
  const mode = useMode()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const setCameraResetFn = useStore((s) => s.setCameraResetFn)

  const resetCamera = useCallback(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.target.set(...mode.initialCamera.target)
    controls.object.position.set(...mode.initialCamera.position)
    controls.update()
  }, [mode])

  useEffect(() => {
    setCameraResetFn(resetCamera)
  }, [resetCamera, setCameraResetFn])

  return (
    <OrbitControls
      ref={controlsRef}
      target={mode.initialCamera.target}
      makeDefault
    />
  )
}

function ActiveHitPlane() {
  const config = useMode().pieces
  const selectedPieceType = useStore((s) => s.selectedPieceType)
  const visibleLevels = useStore((s) => s.visibleLevels)

  if (!selectedPieceType) return null

  const constraint = config[selectedPieceType]?.floorConstraint
  let activeFloor: 0 | 1 | 2 | null = null

  if (constraint === 'ground_only') {
    activeFloor = 0
  } else if (constraint === 'upper_only') {
    activeFloor = ([1, 2] as const).find((f) => visibleLevels.has(f)) ?? null
  } else {
    // No constraint — use lowest visible floor
    activeFloor = ([0, 1, 2] as const).find((f) => visibleLevels.has(f)) ?? null
  }

  if (activeFloor === null) return null

  return (
    <>
      <HitPlane floorY={activeFloor} />
      <TriHitPlane floorY={activeFloor} />
    </>
  )
}

export default function Viewport() {
  const mode = useMode()
  const { SceneFixtures } = mode
  const [camX, camY, camZ] = mode.initialCamera.position

  return (
    <Canvas
      camera={{ position: [camX, camY, camZ], fov: 50 }}
      style={{ width: '100%', height: '100%', background: mode.sceneBackground }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <SceneFixtures />
      <SceneGrid />
      <PlacedPieces />
      <ActiveHitPlane />
      <SceneSetup />
    </Canvas>
  )
}
