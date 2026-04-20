// src/scene/Viewport.tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef, useCallback, useEffect } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import HullMesh from '../../scene/HullMesh'
import SceneGrid from './SceneGrid'
import PlacedPieces from './PlacedPieces'
import HitPlane, { TriHitPlane } from './HitPlane'
import { useStore } from '../../store/useStore'
import piecesConfig from '../../data/pieces-config.json'
import type { PiecesConfig } from '../types'

const config = piecesConfig as PiecesConfig

const SCENE_CENTER: [number, number, number] = [2.5, 0, 5]

function SceneSetup() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const setCameraResetFn = useStore((s) => s.setCameraResetFn)

  const resetCamera = useCallback(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.target.set(...SCENE_CENTER)
    controls.object.position.set(2.5, 10, 10)
    controls.update()
  }, [])

  useEffect(() => {
    setCameraResetFn(resetCamera)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <OrbitControls
      ref={controlsRef}
      target={SCENE_CENTER}
      makeDefault
    />
  )
}

function ActiveHitPlane() {
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
  return (
    <Canvas
      camera={{ position: [2.5, 10, 10], fov: 50 }}
      style={{ width: '100%', height: '100%', background: '#2a4a68' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <HullMesh />
      <SceneGrid />
      <PlacedPieces />
      <ActiveHitPlane />
      <SceneSetup />
    </Canvas>
  )
}
