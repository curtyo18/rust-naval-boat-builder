// src/scene/Viewport.tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef, useCallback, useEffect } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import HullMesh from './HullMesh'
import SceneGrid from './SceneGrid'
import { useStore } from '../store/useStore'

const SCENE_CENTER: [number, number, number] = [2.5, 0, 5.5]

function SceneSetup() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const setCameraResetFn = useStore((s) => s.setCameraResetFn)

  const resetCamera = useCallback(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.target.set(...SCENE_CENTER)
    controls.object.position.set(2.5, 18, 5.5)
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

export default function Viewport() {
  return (
    <Canvas
      camera={{ position: [2.5, 18, 5.5], fov: 50 }}
      style={{ width: '100%', height: '100%', background: '#1a1a2e' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <HullMesh />
      <SceneGrid />
      <SceneSetup />
    </Canvas>
  )
}
