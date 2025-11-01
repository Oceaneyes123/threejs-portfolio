import { useGLTF } from "@react-three/drei";
import { useRef, useEffect, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";

function Car({ joystickState }: { joystickState?: { forward: number; backward: number; left: number; right: number } }) {
  const { scene } = useGLTF("/assets/car3.glb");
  const carRef = useRef<any>(null);

  const getWheelMeshes = useCallback(() => {
    if (!scene) return { frontLeft: null, frontRight: null, rearLeft: null, rearRight: null };
    const frontLeft = scene.getObjectByName("wheel_fl") || scene.getObjectByName("Wheel_FL");
    const frontRight = scene.getObjectByName("wheel_fr") || scene.getObjectByName("Wheel_FR");
    const rearLeft = scene.getObjectByName("wheel_rl") || scene.getObjectByName("Wheel_RL");
    const rearRight = scene.getObjectByName("wheel_rr") || scene.getObjectByName("Wheel_RR");
    return { frontLeft, frontRight, rearLeft, rearRight };
  }, [scene]);

  const [input, setInput] = useState({ forward: false, backward: false, left: false, right: false, brake: false });
  const velocity = useRef(0);
  const steering = useRef(0); // wheel angle (-maxSteer..+maxSteer)
  const maxSteer = Math.PI / 4; // 45deg
  const steerSpeed = 3.5;
  const steerCenteringSpeed = 6.0;
  const maxSpeed = 12;
  const acceleration = 18;
  const brakeDecel = 30;
  const friction = 6;
  const turnSpeed = 2.6; // yaw responsiveness multiplier

  const bounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
  const [wheelRotation, setWheelRotation] = useState(0);
  const [frontSteer, setFrontSteer] = useState(0);

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

  // helper: quaternion -> yaw (rotation about Y)
  const quatToYaw = (q: { x: number; y: number; z: number; w: number }) => {
    const { x, y, z, w } = q;
    // yaw (Y) = atan2(2*(w*y + x*z), 1 - 2*(y*y + z*z))
    return Math.atan2(2 * (w * y + x * z), 1 - 2 * (y * y + z * z));
  };

  useFrame((_, delta) => {
    const car = carRef.current;
    if (!car) return;

    const pos = car.translation(); // {x,y,z}
    const rot = car.rotation(); // quaternion {x,y,z,w}
    let yaw = quatToYaw(rot);

    // Steering input: left -> positive steer, right -> negative steer
    if (input.left) steering.current = Math.min(steering.current + steerSpeed * delta, maxSteer);
    else if (input.right) steering.current = Math.max(steering.current - steerSpeed * delta, -maxSteer);
    else {
      // center steering smoothly
      if (Math.abs(steering.current) > 0.001) {
        const sign = Math.sign(steering.current);
        steering.current -= sign * steerCenteringSpeed * delta;
        if (Math.sign(steering.current) !== sign) steering.current = 0;
      } else steering.current = 0;
    }

    // Add joystick steering
    steering.current = Math.max(-maxSteer, Math.min(maxSteer, steering.current + (joystickState?.right ?? 0) * steerSpeed * delta * 10));
    steering.current = Math.max(-maxSteer, Math.min(maxSteer, steering.current - (joystickState?.left ?? 0) * steerSpeed * delta * 10));

    setFrontSteer(steering.current);

    // accel / brake / friction
    let accel = 0;
    if (input.forward) accel += acceleration;
    if (input.backward) accel -= acceleration * 0.7;
    if (input.brake) {
      if (Math.abs(velocity.current) > 0.1) accel -= Math.sign(velocity.current) * brakeDecel;
    }
    if (!input.forward && !input.backward && !input.brake) {
      if (Math.abs(velocity.current) > 0.1) accel -= Math.sign(velocity.current) * friction;
      else velocity.current = 0;
    }

    // Add joystick acceleration
    accel += (joystickState?.forward ?? 0) * acceleration;
    accel -= (joystickState?.backward ?? 0) * acceleration * 0.7;

    velocity.current += accel * delta;
    velocity.current = Math.max(Math.min(velocity.current, maxSpeed), -maxSpeed * 0.5);

    // turning: compute factor so there's still some turning at low/zero speed (allows 360°)
    const effectiveSpeed = Math.max(Math.abs(velocity.current), 0.4); // lower bound so you can rotate when stopped
    const speedFactor = effectiveSpeed / maxSpeed; // 0.033..1
    // if going backward, turning direction often reverses; use sign of velocity
    const velocitySign = velocity.current === 0 ? 1 : Math.sign(velocity.current);
    const yawDelta = steering.current * velocitySign * speedFactor * turnSpeed * delta;
    yaw += yawDelta;

    // move forward by yaw
    const dx = Math.sin(yaw) * velocity.current * delta;
    const dz = Math.cos(yaw) * velocity.current * delta;
    let newX = pos.x + dx;
    let newZ = pos.z + dz;
    newX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
    newZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, newZ));
    const newY = 0;

    // quaternion from yaw
    const half = yaw / 2;
    const qx = 0;
    const qy = Math.sin(half);
    const qz = 0;
    const qw = Math.cos(half);

    car.setNextKinematicTranslation({ x: newX, y: newY, z: newZ });
    car.setNextKinematicRotation({ x: qx, y: qy, z: qz, w: qw });

    setWheelRotation((r) => r + velocity.current * delta * 2.5);
  });

  useEffect(() => {
    const { frontLeft, frontRight, rearLeft, rearRight } = getWheelMeshes();
    // flip visual steer depending on model orientation; adjust sign if it looks inverted
    const steerVisual = frontSteer;
    if (frontLeft) {
      frontLeft.rotation.y = steerVisual;
      frontLeft.rotation.x = wheelRotation;
    }
    if (frontRight) {
      frontRight.rotation.y = steerVisual;
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
