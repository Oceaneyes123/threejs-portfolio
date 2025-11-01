"use client";
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

type Props = {
  position?: [number, number, number];
};

export default function Billboard({ position = [0, 2.2, 6] }: Props) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const { camera } = useThree();

  // Board texture canvas size
  const canvasWidth = 1024;
  const canvasHeight = 512;

  // Create a canvas texture with the warning text for the board
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const width = canvasWidth;
    const height = canvasHeight;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // White board background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Thin wood frame
      ctx.strokeStyle = "#8b5a2b";
      ctx.lineWidth = 24;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      // Text
      const fontSize = 76;
      // Line height multiplier (adjust to change spacing between wrapped lines)
      const lineHeightMultiplier = 1.5; // 0.75 * fontSize per line
      const lineHeight = fontSize * lineHeightMultiplier;

      ctx.fillStyle = "#000000";
      ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = "Steering wheel not working properly"
      // Wrap text if needed (simple manual wrap)
      const maxWidth = width - 120;
      const words = text.split(" ");
      let line = "";
      const lines: string[] = [];
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());

      // Vertical centering using line height
      const totalHeight = (lines.length - 1) * lineHeight;
      const startY = height / 2 - totalHeight / 2;
      lines.forEach((ln, i) => {
        ctx.fillText(ln, width / 2, startY + i * lineHeight);
      });
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;

    return { texture: tex, aspect: width / height };
  }, []);

  // Dispose texture on unmount
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // Orient toward camera each frame (simple billboard)
  useFrame(() => {
    if (!meshRef.current) return;
    // Make the billboard face the camera
    meshRef.current.lookAt(camera.position);
  });

  // Determine board size in world units
  const boardHeight = 1.2; // world units
  const boardWidth = boardHeight * aspect;

  // Pole settings
  const poleHeight = 2.0; // world units
  const poleRadius = 0.06;

  // Make both board and pole face camera each frame
  useFrame(() => {
    if (!meshRef.current) return;
    // Face camera: we only want the board's front to look toward camera
    const worldPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(worldPos);
    meshRef.current.lookAt(camera.position.x, camera.position.y, camera.position.z);
    // Keep the pole vertical (avoid tilting)
    meshRef.current.rotation.x = 0;
    meshRef.current.rotation.z = 0;
  });

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[-10, -poleHeight / 2 + 0.05, 0]}>
        <cylinderGeometry args={[poleRadius, poleRadius, poleHeight, 16]} />
        <meshStandardMaterial color="#8b5a2b" metalness={0.1} roughness={0.8} />
      </mesh>

      {/* Board mounted on top of pole */}
      <group ref={meshRef} position={[-10, 0.6, 0]} renderOrder={999}>
        {/* Slight backing so board has depth */}
        <mesh position={[0, 0, -0.01]}> 
          <boxGeometry args={[boardWidth + 0.06, boardHeight + 0.06, 0.02]} />
          <meshStandardMaterial color="#d9d9d9" metalness={0.05} roughness={0.9} />
        </mesh>

        {/* Front white board with text texture */}
        <mesh position={[0, 0, 0.01]}> 
          <planeGeometry args={[boardWidth, boardHeight]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
