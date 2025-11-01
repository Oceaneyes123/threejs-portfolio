import { RigidBody } from "@react-three/rapier";
import { Text3D, Center } from "@react-three/drei";
import { useMemo } from "react";

function Letters3D({ name }: { name: string }) {
  const size = 1.2; // visual font size
  const depth = 0.8; // extrusion - INCREASED for more thickness
  const spacing = size * 0.9; // distance between letter centers
  const letters = useMemo(() => [...name], [name]);
  const totalWidth = (letters.length - 1) * spacing;
  // deterministic jitter for initial small rotation (pure function)
  const jitter = useMemo(() =>
    letters.map((_, i) => {
      const fract = (x: number) => x - Math.floor(x);
      const ry = (fract(Math.sin(i * 12.9898) * 43758.5453) - 0.5) * 0.1;
      const rz = (fract(Math.sin((i + 1) * 78.233) * 12515.873) - 0.5) * 0.1;
      return { ry, rz };
    }),
    [letters]
  );
  return (
    <group position={[-totalWidth / 2, 0.5, 0]}>
      {letters.map((ch, idx) => {
        if (ch === " ") return null; // skip spaces
        return (
          <RigidBody
            key={`${ch}-${idx}`}
            colliders="hull"
            restitution={0.3}
            friction={0.8}
            mass={5}
            position={[idx * spacing, 0, 0]}
            rotation={[0, jitter[idx].ry, jitter[idx].rz]}
            linearDamping={0.5}
            angularDamping={0.5}
          >
            <Center top>
              <Text3D
                font="https://threejs.org/examples/fonts/helvetiker_bold.typeface.json"
                size={size}
                height={depth}
                bevelEnabled
                bevelSize={0.03}
                bevelThickness={0.08}
                bevelSegments={5}
                castShadow
                receiveShadow
              >
                {ch}
                <meshToonMaterial color="#c3c6c9" />
              </Text3D>
            </Center>
          </RigidBody>
        );
      })}
    </group>
  );
}

export default Letters3D;