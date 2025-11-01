import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

function Ground() {
  const textTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = 2000;
    canvas.height = 500;

    // Set font and style
    context.font = "Bold 100px Arial";
    context.fillStyle = "rgb(255, 255, 255)";
    context.textAlign = "center";
    context.textBaseline = "middle";

    // Draw the text
    context.fillText("FULL STACK DEVELOPER", canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <group>
      <RigidBody type="fixed" restitution={0} friction={2}>
        <CuboidCollider args={[25, 0.5, 25]} position={[0, -0.5, 0]} />
      </RigidBody>
      <mesh
        receiveShadow
        rotation-x={-Math.PI / 2}
        position={[0, 0, 0]}
        frustumCulled={false}
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color={"#fc985d"} roughness={1} metalness={0} />
      </mesh>
      {/* Text plane */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.01, 5]} // Position between camera and origin
      >
        <planeGeometry args={[5, 1.25]} />
        <meshBasicMaterial map={textTexture} transparent />
      </mesh>
    </group>
  );
}

export default Ground;