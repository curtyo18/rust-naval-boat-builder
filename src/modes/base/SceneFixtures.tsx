import { useMemo } from 'react'
import { getGrassTexture } from './grassTexture'

export default function SceneFixtures() {
  const tex = useMemo(() => getGrassTexture(), [])
  return (
    <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial map={tex} color="#7a9a5a" roughness={1} metalness={0} />
    </mesh>
  )
}
