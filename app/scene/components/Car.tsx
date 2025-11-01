import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useRef } from "react";

// Movement/control constants removed — this component now only renders a static car.

function Car() {
  const { scene } = useGLTF("/assets/car2.glb");
  const carRef = useRef<React.ComponentRef<typeof RigidBody> | null>(null);

  return (
    <RigidBody
      ref={carRef}
      type="fixed"
      position={[-10, 0, 15]}
      rotation={[0, Math.PI / 2, 0]}
      colliders="hull"
      restitution={0}
      friction={1.6}
    >
      <primitive object={scene} scale={1} castShadow />
    </RigidBody>
  );
}

export default Car;