// src/scene/HullMesh.tsx
// Static decorative boat hull — visual reference only, not interactive.
export default function HullMesh() {
  return (
    <mesh position={[2.5, -0.11, 5]} receiveShadow>
      <boxGeometry args={[5, 0.2, 10]} />
      <meshStandardMaterial color="#8cb8d0" roughness={0.6} metalness={0.1} />
    </mesh>
  )
}
