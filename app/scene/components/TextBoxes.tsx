import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

type TextBoxProps = {
  text: string;
  position: [number, number, number];
};

function TextBox({ text, position }: TextBoxProps) {
  const boxSize = [1.5, 0.75, 1.5] as [number, number, number]; // width, height, depth

  const textTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = 256;
    canvas.height = 128;

    // Clear canvas with white background
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw black text
    context.fillStyle = "#000000";
    context.font = "bold 50px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [text]);

  const materials = useMemo(
    () =>
      [
        new THREE.MeshToonMaterial({ color: "#ffffff" }), // right (+X)
        new THREE.MeshToonMaterial({ color: "#ffffff" }), // left (-X)
        new THREE.MeshToonMaterial({ map: textTexture }), // top (+Y) - with text
        new THREE.MeshToonMaterial({ color: "#ffffff" }), // bottom (-Y)
        new THREE.MeshToonMaterial({ color: "#ffffff" }), // front (+Z)
        new THREE.MeshToonMaterial({ color: "#ffffff" }), // back (-Z)
      ] as const,
    [textTexture]
  );

  return (
    <group position={position}>
      <RigidBody
        colliders="cuboid"
        restitution={0.3}
        friction={0.8}
        mass={5}
        linearDamping={0.5}
        angularDamping={0.5}
      >
        <mesh castShadow receiveShadow material={materials}>
          <boxGeometry args={boxSize} />
        </mesh>
      </RigidBody>
    </group>
  );
}

type TextBoxesProps = {
  boxes: Array<{ text: string; position: [number, number, number] }>;
};

export default function TextBoxes({ boxes }: TextBoxesProps) {
  return (
    <>
      {boxes.map((box, index) => (
        <TextBox key={index} text={box.text} position={box.position} />
      ))}
    </>
  );
}