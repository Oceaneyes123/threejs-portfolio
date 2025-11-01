"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, SoftShadows, KeyboardControls } from "@react-three/drei";
import type { KeyboardControlsEntry } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Suspense, useMemo, useEffect, useRef, useState } from "react";
import Ground from "./components/Ground";
import Lights from "./components/Lights";
import Letters3D from "./components/Letters3D";
import Trees from "./components/Trees";
import Rocks from "./components/Rocks";
import Car from "./components/Car";

// Joystick library will be loaded dynamically on mobile inside useEffect

type Props = {
  name?: string;
};

type Controls = "forward" | "backward" | "left" | "right";

// Mobile joystick state manager
const joystickState = {
  forward: 0,
  backward: 0,
  left: 0,
  right: 0,
};

// Flag to ensure camera animation runs only once per page load
let animationCompleted = false;

export default function NameScene({ name = process.env.NEXT_PUBLIC_DISPLAY_NAME || "JEZREL DAVE" }: Props) {
  const keyboardMap = useMemo<KeyboardControlsEntry<Controls>[]>
    (() => [
      { name: "forward", keys: ["ArrowUp", "KeyW"] },
      { name: "backward", keys: ["ArrowDown", "KeyS"] },
      { name: "left", keys: ["ArrowLeft", "KeyA"] },
      { name: "right", keys: ["ArrowRight", "KeyD"] },
    ],
    [])

  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Only enable joystick on mobile/touch devices
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      ("ontouchstart" in window) ||
      window.innerWidth <= 768;

    if (!isMobile) return;

    // Avoid duplicating container (hot-reload etc.)
    let joystickContainer = document.getElementById("joystick-container");
    if (!joystickContainer) {
      joystickContainer = document.createElement("div");
      joystickContainer.id = "joystick-container";
      joystickContainer.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 80px;
        width: 150px;
        height: 150px;
        z-index: 1000;
        touch-action: none;
      `;
      document.body.appendChild(joystickContainer);
    }

    type NippleManager = {
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      destroy: () => void;
    };
    let manager: NippleManager | null = null;

    // Load nipplejs dynamically only on mobile
    (async () => {
      const { default: nipplejs } = await import("nipplejs");
      manager = nipplejs.create({
        zone: joystickContainer as HTMLElement,
        mode: "static",
        position: { left: "50%", top: "50%" },
        color: "#ff5c39",
        size: 120,
      }) as unknown as NippleManager;

      manager.on("move", (...args: unknown[]) => {
        type MoveData = { angle?: { radian?: number }; force?: number };
        const [, dataRaw] = args as [unknown, MoveData];
        const angle = dataRaw?.angle?.radian ?? 0;
        const force = Math.min(dataRaw?.force ?? 0, 2) / 2; // Normalize to 0-1

        // Convert polar coordinates to direction
        joystickState.forward = Math.max(0, -Math.sin(angle) * force);
        joystickState.backward = Math.max(0, Math.sin(angle) * force);
        joystickState.left = Math.max(0, -Math.cos(angle) * force);
        joystickState.right = Math.max(0, Math.cos(angle) * force);
      });

      manager.on("end", () => {
        joystickState.forward = 0;
        joystickState.backward = 0;
        joystickState.left = 0;
        joystickState.right = 0;
      });
    })();

    return () => {
      if (manager) manager.destroy();
      if (joystickContainer && joystickContainer.parentElement) {
        joystickContainer.parentElement.removeChild(joystickContainer);
      }
    };
  }, []);

  // Camera animation component
  function CameraAnimation() {
    const { camera } = useThree();
    const animationRef = useRef({ progress: 0, enabled: true });

    useFrame((state, delta) => {
      if (!animationRef.current.enabled || animationCompleted) return;

      animationRef.current.progress += delta * 0.1; // Adjust speed here
      const progress = Math.min(animationRef.current.progress, 1);

      // Start position: top view [0, 20, 0]
      // End position: [8, 5, 10]
      const startPos = [10, 30, 10];
      const endPos = [10, 5, 10];

      // Interpolate position
      camera.position.x = startPos[0] + (endPos[0] - startPos[0]) * progress;
      camera.position.y = startPos[1] + (endPos[1] - startPos[1]) * progress;
      camera.position.z = startPos[2] + (endPos[2] - startPos[2]) * progress;

      // Rotate camera around the scene during animation
      const angle = progress * Math.PI * 3; // Rotate 3 times during animation
      camera.position.x = Math.cos(angle) * 15 * (1 - progress) + endPos[0] * progress;
      camera.position.z = Math.sin(angle) * 15 * (1 - progress) + endPos[2] * progress;

      // Look at the center
      camera.lookAt(0, 0, 0);

      if (progress >= 1) {
        setAnimationComplete(true);
        animationRef.current.enabled = false;
        animationCompleted = true;
      }
    });

    return null;
  }

  return (
    <div style={{ width: "100%", height: "100dvh", background: "linear-gradient(180deg,#ff9255 0%,#ffb884 100%)" }}>
      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ fov: 50 }}>
          <color attach="background" args={["#ffb884"]} />
          <SoftShadows size={42} samples={16} focus={0.8} />
          <CameraAnimation />
          <Lights />
          <Suspense fallback={null}>
            <Physics gravity={[0, -10, 0]}>
              <Letters3D name={name} />
              <Ground />
              <Trees />
              <Rocks />
              <Car />
            </Physics>
            <Environment preset="sunset" />
          </Suspense>
          <OrbitControls enablePan={false} minDistance={4} maxDistance={30} maxPolarAngle={Math.PI / 2.1} enabled={animationComplete} />
        </Canvas>
      </KeyboardControls>
    </div>
  );
}
