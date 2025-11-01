import { RigidBody, CuboidCollider } from "@react-three/rapier";

function Rocks() {
  return (
    <group>
      {/* A few dynamic rocks to push */}
      {[[-3, 1], [2, -2], [4, 3]].map(([x, z], i) => (
        <RigidBody key={`r${i}`} mass={2} position={[x, 0.6, z]}>
          <mesh castShadow>
            <icosahedronGeometry args={[0.4, 0]} />
            <meshToonMaterial color="#f6dec4" />
          </mesh>
          <CuboidCollider args={[0.35, 0.35, 0.35]} />
        </RigidBody>
      ))}
    </group>
  );
}

export default Rocks;