// src/scene/HullMesh.tsx
// Static decorative boat hull — visual reference only, not interactive.
export default function HullMesh() {
  return (
    <mesh position={[2.5, -0.11, 5.5]} receiveShadow>
      <boxGeometry args={[5, 0.2, 11]} />
      <meshStandardMaterial color="#3d2b1f" />
    </mesh>
  )
}
