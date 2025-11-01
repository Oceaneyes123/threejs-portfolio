import { RigidBody, CuboidCollider } from "@react-three/rapier";

function Ground() {
  return (
    <group>
      <RigidBody type="fixed" restitution={0.1} friction={2}>
        <CuboidCollider args={[25, 0.5, 25]} position={[0, -0.5, 0]} />
      </RigidBody>
      <mesh
        receiveShadow
        rotation-x={-Math.PI / 2}
        position={[0, 0, 0]}
        frustumCulled={false}
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color={"#ffb16e"} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

export default Ground;