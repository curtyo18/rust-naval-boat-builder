export default function SceneFixtures() {
  return (
    <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#4a6a3a" roughness={1} metalness={0} />
    </mesh>
  )
}
