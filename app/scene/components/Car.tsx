import { useFrame } from "@react-three/fiber";
import { useGLTF, useKeyboardControls } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";

type Controls = "forward" | "backward" | "left" | "right";

function Car() {
  const { scene } = useGLTF("/assets/car3.glb");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const carRef = useRef<any>(null); // RigidBody imperative API
  const [, get] = useKeyboardControls<Controls>();

  useFrame(() => {
    if (!carRef.current) return;
    const { forward, backward, left, right } = get();

    // Get current velocity
    const currentVelocity = carRef.current.linvel();
    const velocityVector = new THREE.Vector3(currentVelocity.x, currentVelocity.y, currentVelocity.z);
    const currentSpeed = velocityVector.length();

    // Get car's forward direction (based on rotation)
    const quaternion = carRef.current.rotation();
    const carDirection = new THREE.Vector3(0, 0, -1);
    carDirection.applyQuaternion(new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
    carDirection.y = 0; // Keep movement on horizontal plane
    carDirection.normalize();

    // Calculate velocity direction relative to car facing
    const velocityDirection = velocityVector.clone().normalize();
    const dotProduct = carDirection.dot(velocityDirection);
    const isMovingForward = dotProduct > 0;

    // Physics constants
    const maxSpeed = 15;
    const acceleration = 2.5;
    const brakeForce = 4.0; // Stronger braking when opposite direction
    const naturalDeceleration = 1.2; // Slower deceleration when no input
    const turnSpeed = 0.04;
    const minTurnSpeed = 0.5; // Minimum speed required for turning

    const force = new THREE.Vector3();

    // Forward/Backward movement
    if (forward) {
      if (isMovingForward && currentSpeed < maxSpeed) {
        // Accelerate forward
        force.add(carDirection.clone().multiplyScalar(acceleration));
      } else if (!isMovingForward && currentSpeed > 0.1) {
        // Braking (moving backward but pressing forward)
        force.add(carDirection.clone().multiplyScalar(brakeForce));
      } else if (currentSpeed < maxSpeed) {
        // Start moving forward
        force.add(carDirection.clone().multiplyScalar(acceleration));
      }
    } else if (backward) {
      if (!isMovingForward && currentSpeed < maxSpeed) {
        // Accelerate backward
        force.add(carDirection.clone().multiplyScalar(-acceleration));
      } else if (isMovingForward && currentSpeed > 0.1) {
        // Braking (moving forward but pressing backward)
        force.add(carDirection.clone().multiplyScalar(-brakeForce));
      } else if (currentSpeed < maxSpeed) {
        // Start moving backward
        force.add(carDirection.clone().multiplyScalar(-acceleration));
      }
    } else {
      // Natural deceleration when no input
      if (currentSpeed > 0.1) {
        const decelerationForce = velocityVector.clone().normalize().multiplyScalar(-naturalDeceleration);
        force.add(decelerationForce);
      }
    }

    // Apply movement force
    if (force.length() > 0) {
      carRef.current.addForce({ x: force.x, y: force.y, z: force.z }, true);
    }

    // Turning - only works when car has some speed
    if (currentSpeed > minTurnSpeed) {
      const turnRate = turnSpeed * Math.min(currentSpeed / maxSpeed, 1.0);
      
      if (left) {
        const rapierRot = carRef.current.rotation();
        const currentRot = new THREE.Quaternion(rapierRot.x, rapierRot.y, rapierRot.z, rapierRot.w);
        const deltaRot = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), 
          isMovingForward ? turnRate : -turnRate // Reverse turning when moving backward
        );
        currentRot.multiply(deltaRot);
        carRef.current.setRotation({ x: currentRot.x, y: currentRot.y, z: currentRot.z, w: currentRot.w }, true);
      }
      if (right) {
        const rapierRot = carRef.current.rotation();
        const currentRot = new THREE.Quaternion(rapierRot.x, rapierRot.y, rapierRot.z, rapierRot.w);
        const deltaRot = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), 
          isMovingForward ? -turnRate : turnRate // Reverse turning when moving backward
        );
        currentRot.multiply(deltaRot);
        carRef.current.setRotation({ x: currentRot.x, y: currentRot.y, z: currentRot.z, w: currentRot.w }, true);
      }
    }

    // Prevent flipping: stabilize rotation on X and Z axes
    const rapierRot = carRef.current.rotation();
    const currentRot = new THREE.Quaternion(rapierRot.x, rapierRot.y, rapierRot.z, rapierRot.w);
    const euler = new THREE.Euler().setFromQuaternion(currentRot, 'YXZ');
    
    // Limit tilt angles to prevent flipping
    const maxTilt = 0.3; // radians (~17 degrees)
    euler.x = Math.max(-maxTilt, Math.min(maxTilt, euler.x));
    euler.z = Math.max(-maxTilt, Math.min(maxTilt, euler.z));
    
    const stabilizedRot = new THREE.Quaternion().setFromEuler(euler);
    carRef.current.setRotation({ 
      x: stabilizedRot.x, 
      y: stabilizedRot.y, 
      z: stabilizedRot.z, 
      w: stabilizedRot.w 
    }, true);

    // Boundary constraints - keep car within the 50x50 plane
    const position = carRef.current.translation();
    const boundaryForce = 5.0; // Increased force for better containment
    const boundaryDistance = 20; // Larger buffer zone
    const maxDistance = 24; // Hard limit - teleport back if exceeded
    
    const boundaryForceVector = new THREE.Vector3();
    
    // Check if car is beyond hard limit and teleport back
    if (Math.abs(position.x) > maxDistance || Math.abs(position.z) > maxDistance) {
      const clampedX = Math.max(-maxDistance, Math.min(maxDistance, position.x));
      const clampedZ = Math.max(-maxDistance, Math.min(maxDistance, position.z));
      carRef.current.setTranslation({ x: clampedX, y: position.y, z: clampedZ }, true);
      // Also reset velocity to prevent bouncing
      carRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    } else {
      // Apply gentle force when approaching boundary
      if (position.x > boundaryDistance) {
        boundaryForceVector.x = -boundaryForce;
      } else if (position.x < -boundaryDistance) {
        boundaryForceVector.x = boundaryForce;
      }
      
      if (position.z > boundaryDistance) {
        boundaryForceVector.z = -boundaryForce;
      } else if (position.z < -boundaryDistance) {
        boundaryForceVector.z = boundaryForce;
      }
      
      if (boundaryForceVector.length() > 0) {
        carRef.current.addForce({ x: boundaryForceVector.x, y: 0, z: boundaryForceVector.z }, true);
      }
    }
  });

  return (
    <RigidBody
      ref={carRef}
      mass={15}
      position={[-3, 0.5, 7]}
      colliders="hull"
      restitution={0.2}
      friction={1.2}
      linearDamping={0.8}
      angularDamping={2.0}
    >
      <primitive object={scene} scale={1} castShadow />
    </RigidBody>
  );
}

export default Car;