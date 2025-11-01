import * as THREE from "three";

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

export default Lights;