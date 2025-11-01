import { useFrame } from "@react-three/fiber";
import { useGLTF, useKeyboardControls } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";

type Controls = "forward" | "backward" | "left" | "right";

function Car() {
  const { scene } = useGLTF("/assets/car2.glb");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const carRef = useRef<any>(null); // RigidBody imperative API
  const [, get] = useKeyboardControls<Controls>();

  useFrame(() => {
    if (!carRef.current) return;
    const { forward, backward, left, right } = get();

    const velocity = new THREE.Vector3();
    const quaternion = new THREE.Quaternion().setFromEuler(carRef.current.rotation);
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(quaternion);
    velocity.copy(direction);
    velocity.y = 0;
    velocity.normalize();

    const force = new THREE.Vector3();
    if (forward) {
      force.add(velocity.clone().multiplyScalar(0.5));
    }
    if (backward) {
      force.add(velocity.clone().multiplyScalar(-0.5));
    }

    // Apply force to the RigidBody
    if (carRef.current && force.length() > 0) {
      carRef.current.addForce(force, true);
    }

    // Apply instant rotation for turning instead of torque
    if (left) {
      carRef.current.rotation.y += 0.05; // Adjust rotation speed as needed
    }
    if (right) {
      carRef.current.rotation.y -= 0.05;
    }
  });

  return (
    <RigidBody
      ref={carRef}
      mass={5}
      position={[-3, 0, 7]}
      colliders="hull"
      restitution={0.1}
      friction={0.8}
      linearDamping={0.5}
      angularDamping={0.5}
    >
      <primitive object={scene} scale={0.5} castShadow />
    </RigidBody>
  );
}

export default Car;