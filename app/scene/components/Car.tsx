import { useGLTF } from "@react-three/drei";
import { useRef, useEffect, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";

function Car() {
  const { scene } = useGLTF("/assets/car3.glb");
  const carRef = useRef<any>(null);

  // Helper to find wheels in the GLTF scene (must be above useEffect and useFrame)
  const getWheelMeshes = useCallback((): {
    frontLeft: any;
    frontRight: any;
    rearLeft: any;
    rearRight: any;
  } => {
    if (!scene) return { frontLeft: null, frontRight: null, rearLeft: null, rearRight: null };
    // Try to find by name (adjust as needed for your model)
    const frontLeft = scene.getObjectByName("wheel_fl") || scene.getObjectByName("Wheel_FL");
    const frontRight = scene.getObjectByName("wheel_fr") || scene.getObjectByName("Wheel_FR");
    const rearLeft = scene.getObjectByName("wheel_rl") || scene.getObjectByName("Wheel_RL");
    const rearRight = scene.getObjectByName("wheel_rr") || scene.getObjectByName("Wheel_RR");
    return { frontLeft, frontRight, rearLeft, rearRight };
  }, [scene]);
  const [input, setInput] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
  });
  // Car state
  const velocity = useRef(0);
  const steering = useRef(0);
  const maxSteer = Math.PI / 6;
  const maxSpeed = 12;
  const acceleration = 18;
  const brakeDecel = 30;
  const friction = 6;
  const bounds = {
    minX: -30,
    maxX: 30,
    minZ: -30,
    maxZ: 30,
  };
  // Wheel visual state
  const [wheelRotation, setWheelRotation] = useState(0);
  const [frontSteer, setFrontSteer] = useState(0);
  // Keyboard events
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      setInput((i) => ({
        ...i,
        forward: i.forward || e.key === "w" || e.key === "ArrowUp",
        backward: i.backward || e.key === "s" || e.key === "ArrowDown",
        left: i.left || e.key === "a" || e.key === "ArrowLeft",
        right: i.right || e.key === "d" || e.key === "ArrowRight",
        brake: i.brake || e.key === " ",
      }));
    };
    const up = (e: KeyboardEvent) => {
      setInput((i) => ({
        ...i,
        forward: e.key === "w" || e.key === "ArrowUp" ? false : i.forward,
        backward: e.key === "s" || e.key === "ArrowDown" ? false : i.backward,
        left: e.key === "a" || e.key === "ArrowLeft" ? false : i.left,
        right: e.key === "d" || e.key === "ArrowRight" ? false : i.right,
        brake: e.key === " " ? false : i.brake,
      }));
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Car movement and wheel animation
  useFrame((_, delta) => {
    const car = carRef.current;
    if (!car) return;
    // Get current transform
    const pos = car.translation();
    const rot = car.rotation();
    // Update steering
    if (input.left) steering.current = Math.max(steering.current - delta * 2, -maxSteer);
    else if (input.right) steering.current = Math.min(steering.current + delta * 2, maxSteer);
    else steering.current *= 0.85;
    setFrontSteer(steering.current);
    // Acceleration/brake
    let accel = 0;
    if (input.forward) accel += acceleration;
    if (input.backward) accel -= acceleration * 0.7;
    if (input.brake) {
      if (Math.abs(velocity.current) > 0.1) {
        accel -= Math.sign(velocity.current) * brakeDecel;
      }
    }
    // Friction
    if (!input.forward && !input.backward) {
      if (Math.abs(velocity.current) > 0.1) {
        accel -= Math.sign(velocity.current) * friction;
      } else {
        velocity.current = 0;
      }
    }
    // Update velocity
    velocity.current += accel * delta;
    velocity.current = Math.max(Math.min(velocity.current, maxSpeed), -maxSpeed * 0.5);
    // Move car
    let angle = rot.y || 0;
    if (Math.abs(velocity.current) > 0.01) {
      angle += steering.current * (velocity.current >= 0 ? 1 : -1) * delta * 1.5;
    }
    // Calculate new position
    let dx = Math.sin(angle) * velocity.current * delta;
    let dz = Math.cos(angle) * velocity.current * delta;
    let newX = pos.x + dx;
    let newZ = pos.z + dz;
    // Clamp to bounds
    newX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
    newZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, newZ));
    // Prevent leaving plane (y)
    const newY = 0;
    // Set transform
    car.setNextKinematicTranslation({ x: newX, y: newY, z: newZ });
    car.setNextKinematicRotation({ x: 0, y: angle, z: 0, w: 1 });
    // Animate wheels
    setWheelRotation((r) => r + velocity.current * delta * 2.5);
  });

  // Apply wheel visual rotation
  useEffect(() => {
    const { frontLeft, frontRight, rearLeft, rearRight } = getWheelMeshes();
    if (frontLeft) {
      frontLeft.rotation.y = frontSteer;
      frontLeft.rotation.x = wheelRotation;
    }
    if (frontRight) {
      frontRight.rotation.y = frontSteer;
      frontRight.rotation.x = wheelRotation;
    }
    if (rearLeft) rearLeft.rotation.x = wheelRotation;
    if (rearRight) rearRight.rotation.x = wheelRotation;
  }, [wheelRotation, frontSteer, getWheelMeshes]);

  return (
    <RigidBody
      ref={carRef}
      type="kinematicPosition"
      position={[2, 0, 3]}
      rotation={[0, Math.PI / 3, 0]}
      colliders="hull"
      restitution={0}
      friction={1.6}
      canSleep={false}
    >
      <primitive object={scene} scale={1} castShadow />
    </RigidBody>
  );
}

export default Car;