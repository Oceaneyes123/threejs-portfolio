"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, SoftShadows, KeyboardControls } from "@react-three/drei";
import type { KeyboardControlsEntry } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Suspense, useMemo, useEffect } from "react";
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

export default function NameScene({ name = process.env.NEXT_PUBLIC_DISPLAY_NAME || "JEZREL DAVE" }: Props) {
  const keyboardMap = useMemo<KeyboardControlsEntry<Controls>[]>(
    () => [
      { name: "forward", keys: ["ArrowUp", "KeyW"] },
      { name: "backward", keys: ["ArrowDown", "KeyS"] },
      { name: "left", keys: ["ArrowLeft", "KeyA"] },
      { name: "right", keys: ["ArrowRight", "KeyD"] },
    ],
    []
  );

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

  return (
    <div style={{ width: "100%", height: "100dvh", background: "linear-gradient(180deg,#ff9255 0%,#ffb884 100%)" }}>
  <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: [8, 5, 10], fov: 50 }}>
          <color attach="background" args={["#ffb884"]} />
          <SoftShadows size={42} samples={16} focus={0.8} />
          <Lights />
          <Suspense fallback={null}>
            <Physics gravity={[0, -9.81, 0]}>
              <Letters3D name={name} />
              <Ground />
              <Trees />
              <Rocks />
              <Car />
            </Physics>
            <Environment preset="sunset" />
          </Suspense>
          <OrbitControls enablePan={false} minDistance={4} maxDistance={30} maxPolarAngle={Math.PI / 2.1} />
        </Canvas>
      </KeyboardControls>
    </div>
  );
}
