import { RigidBody, CuboidCollider } from "@react-three/rapier";

function Trees() {
  return (
    <group>
      {/* Trees (fixed) */}
      {[
        [-6, -3],
        [-10, 2],
        [7, -5],
        [10, 4]
      ].map(([x, z], i) => (
        <RigidBody key={i} type="fixed" position={[x, 0, z]} colliders={false}>
          <mesh castShadow position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 1.6, 6]} />
            <meshToonMaterial color="#c58c5c" />
          </mesh>
          <mesh castShadow position={[0, 1.6, 0]}>
            <coneGeometry args={[0.9, 1.4, 6]} />
            <meshToonMaterial color="#e7ef6a" />
          </mesh>
          <CuboidCollider args={[0.45, 1.2, 0.45]} position={[0, 1.2, 0]} />
        </RigidBody>
      ))}
    </group>
  );
}

export default Trees;