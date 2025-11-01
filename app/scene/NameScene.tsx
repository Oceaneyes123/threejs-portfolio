"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Text3D, Center, SoftShadows, KeyboardControls, useKeyboardControls } from "@react-three/drei";
import type { KeyboardControlsEntry } from "@react-three/drei";
import type { RapierRigidBody } from "@react-three/rapier";
import { Physics, RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";
import { Suspense, useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
// Joystick library will be loaded dynamically on mobile inside useEffect

type Props = {
  name?: string;
};

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

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        castShadow
        position={[5, 8, 5]}
        intensity={1.2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <hemisphereLight intensity={0.3} groundColor={new THREE.Color("#ffc38a")} />
    </>
  );
}

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
        <CarWithWheels />
              <Ground />
          <Props />
            </Physics>
            <Environment preset="sunset" />
          </Suspense>
          <OrbitControls enablePan={false} minDistance={4} maxDistance={30} maxPolarAngle={Math.PI / 2.1} />
        </Canvas>
      </KeyboardControls>
    </div>
  );
}

// (Removed ThickText in favor of real Text3D extrusion)

// Extruded Text3D letters with convex hull colliders
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
    <group position={[-totalWidth / 2, 1.4, 0]}>
      {letters.map((ch, idx) => {
        if (ch === " ") return null; // skip spaces
        return (
          <RigidBody
            key={`${ch}-${idx}`}
            colliders="hull"
            restitution={0.3}
            friction={0.8}
            mass={2.5}
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
                <meshToonMaterial color="#ffffff" />
              </Text3D>
            </Center>
          </RigidBody>
        );
      })}
    </group>
  );
}

// A simple drivable car with fixed wheels (no rotation)
function CarWithWheels() {
  const chassis = useRef<RapierRigidBody | null>(null);
  const forward = useKeyboardControls<Controls>((s) => s.forward);
  const backward = useKeyboardControls<Controls>((s) => s.backward);
  const left = useKeyboardControls<Controls>((s) => s.left);
  const right = useKeyboardControls<Controls>((s) => s.right);
  const dir = new THREE.Vector3();
  
  // parameters - improved for better physics
  const turnSpeed = 5; // increased turning speed
  const maxSpeed = 15; // increased max speed
  const brakingForce = 0.95; // friction when not accelerating
  
  // Boundary limits to keep car on the plane (plane is 50x50, collider is 25x25)
  const boundaryLimit = 23; // Keep car within bounds

  useFrame((_, dt) => {
    const rb = chassis.current;
    if (!rb) return;

    // Current velocities and position
    const lin = rb.linvel();
    const pos = rb.translation();

    // Apply boundary constraints - keep car on the plane
    if (Math.abs(pos.x) > boundaryLimit || Math.abs(pos.z) > boundaryLimit) {
      // Push car back towards center if it goes too far
      const pushX = pos.x > boundaryLimit ? -1 : pos.x < -boundaryLimit ? 1 : 0;
      const pushZ = pos.z > boundaryLimit ? -1 : pos.z < -boundaryLimit ? 1 : 0;
      
      if (pushX !== 0 || pushZ !== 0) {
        rb.applyImpulse({ x: pushX * 20 * dt, y: 0, z: pushZ * 20 * dt }, true);
        // Also clamp position
        rb.setTranslation({ 
          x: Math.max(-boundaryLimit, Math.min(boundaryLimit, pos.x)), 
          y: pos.y, 
          z: Math.max(-boundaryLimit, Math.min(boundaryLimit, pos.z)) 
        }, true);
      }
    }

    // Compute forward direction from current orientation
    const rot = rb.rotation();
    const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    dir.set(0, 0, -1).applyQuaternion(quat).normalize();

    // Combine keyboard and joystick inputs
    const forwardInput = (forward ? 1 : 0) + joystickState.forward;
    const backwardInput = (backward ? 1 : 0) + joystickState.backward;
    const leftInput = (left ? 1 : 0) + joystickState.left;
    const rightInput = (right ? 1 : 0) + joystickState.right;

    // Acceleration/Braking
    const torque = Math.min(forwardInput, 1) - Math.min(backwardInput, 1);
    const speed = Math.hypot(lin.x, lin.z);
    
    if (torque !== 0 && speed < maxSpeed) {
      // Apply force to chassis (wheels will follow via joints)
      const forceAmount = torque * 500 * dt;
      rb.applyImpulse({ x: dir.x * forceAmount, y: 0, z: dir.z * forceAmount }, true);
    } else if (torque === 0 && speed > 0.1) {
      // Apply braking when no input
      rb.setLinvel({ x: lin.x * brakingForce, y: lin.y, z: lin.z * brakingForce }, true);
    }

    // Turning by applying yaw torque proportional to input & current speed
    const steer = Math.min(leftInput, 1) - Math.min(rightInput, 1);
    if (steer !== 0 && speed > 0.3) {
      // Scale turning with speed for more realistic handling
      const turnMultiplier = Math.min(speed / 5, 1);
      rb.applyTorqueImpulse({ x: 0, y: steer * turnSpeed * turnMultiplier * dt, z: 0 }, true);
    }

    // Keep the chassis stable
    rb.setLinearDamping(0.1);
    rb.setAngularDamping(0.2);
  });

  // Define a single chassis start position and place wheels relative to it
  // Chassis positioned so bottom is at Y=0 (ground is at Y=0)
  const CHASSIS_START: [number, number, number] = [0, 0.5, 6];
  const wheelPositions: Array<[number, number, number]> = [
    [-0.9, -0.5, -0.5],
    [0.9, -0.5, -0.5],
    [-0.9, -0.5, 0.5],
    [0.9, -0.5, 0.5],
  ];

  return (
    <group>
      {/* Chassis with fixed wheels */}
      <RigidBody
        ref={chassis}
        colliders={false}
        canSleep={false}
        restitution={0.1}
        friction={1.5}
        mass={20}
        position={CHASSIS_START}
        linearDamping={0.1}
        angularDamping={0.2}
        lockRotations={false}
      >
        <group castShadow receiveShadow>
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[2.2, 0.6, 1.2]} />
            <meshToonMaterial color="#ff5c39" />
          </mesh>
          <mesh castShadow position={[-0.2, 0.45, 0]}>
            <boxGeometry args={[1.2, 0.5, 1.0]} />
            <meshToonMaterial color="#ff856b" />
          </mesh>
          
          {/* Wheels fixed to chassis - facing forward */}
          {wheelPositions.map((pos, i) => (
            <group key={i} position={pos} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <mesh castShadow>
                <cylinderGeometry args={[0.3, 0.3, 0.35, 20]} />
                <meshToonMaterial color="#333" />
              </mesh>
              {/* Add tire tread for visual detail */}
              <mesh castShadow position={[0, 0.001, 0]}>
                <cylinderGeometry args={[0.31, 0.31, 0.25, 20]} />
                <meshToonMaterial color="#1a1a1a" />
              </mesh>
            </group>
          ))}
        </group>
        <CuboidCollider args={[1.1, 0.5, 0.6]} position={[0, 0, 0]} />
        {/* Wheel colliders */}
        {wheelPositions.map((pos, i) => (
          <CylinderCollider key={i} args={[0.175, 0.3]} position={pos} rotation={[Math.PI / 2, 0, 0]} friction={3.0} restitution={0.05} />
        ))}
      </RigidBody>
    </group>
  );
}



// Simple toon-shaded props
function Props() {
  return (
    <group>
      {/* Trees (fixed) */}
      {[
        [-6, -3],
        [-8, 2],
        [7, -4],
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
