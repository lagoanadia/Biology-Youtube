// Low-poly owlfish (Pseudobathylagus milleri): stout dark blacksmelt body, silvery belly, eyes almost as big as the
// head (eyeGlow lights them up when they "catch light"), plus a simple low-poly owl for the comparison beat.
import { useMemo } from "react";
import * as THREE from "three";
import { facet } from "../lib/lowpoly";

const BODY = new THREE.Color("#3b3440");
const BELLY = new THREE.Color("#9aa3b8");

const PROFILE: [number, number][] = [[0, 0], [0.05, 0.1], [0.14, 0.4], [0.24, 0.8], [0.29, 1.1], [0.28, 1.35], [0.22, 1.55], [0.1, 1.7], [0, 1.74]];

export const Owlfish: React.FC<{ t: number; swim?: number; eyeGlow?: number; seed?: number }> = ({ t, swim = 1, eyeGlow = 0, seed = 2 }) => {
  const body = useMemo(() => {
    const lathe = new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 9);
    lathe.rotateX(Math.PI / 2);
    lathe.translate(0, 0, -0.87);
    lathe.scale(0.85, 1.15, 1);
    const g = facet(lathe, 0.03, seed);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let f = 0; f < pos.count; f += 3) {
      const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
      const col = cy < -0.12 ? BELLY : BODY;
      for (let k = 0; k < 3; k++) col.toArray(colors, (f + k) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [seed]);
  const wag = Math.sin(t * 6 * swim) * 0.35 * swim;
  return (
    <group rotation={[0, wag * 0.08, 0]}>
      <mesh geometry={body}>
        <meshStandardMaterial vertexColors flatShading roughness={0.5} metalness={0.2} />
      </mesh>
      {/* huge eyes: dark lens + iridescent ring, almost as big as the head */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.2, 0.06, 0.55]} rotation={[0, s * 0.35, 0]}>
          <mesh scale={[0.06, 0.2, 0.2]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#c9d8e8" emissive="#6fb8ff" emissiveIntensity={0.25 + eyeGlow * 1.2} flatShading metalness={0.5} roughness={0.2} />
          </mesh>
          <mesh position={[s * 0.035, 0, 0]} scale={[0.04, 0.13, 0.13]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#05070c" emissive="#1c3a66" emissiveIntensity={eyeGlow * 0.8} flatShading metalness={0.6} roughness={0.1} />
          </mesh>
        </group>
      ))}
      {/* small mouth */}
      <mesh position={[0, -0.08, 0.86]} scale={[0.07, 0.02, 0.03]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#0d0b10" />
      </mesh>
      {/* fins */}
      <mesh position={[0, 0.3, -0.1]} scale={[0.015, 0.16, 0.2]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={BODY} flatShading />
      </mesh>
      <mesh position={[0, 0.22, -0.55]} scale={[0.012, 0.06, 0.06]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={BODY} flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.24, -0.15, 0.3]} rotation={[0, s * 0.6, s * (0.4 + Math.sin(t * 4 + s) * 0.2)]} scale={[0.12, 0.012, 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={BELLY} flatShading />
        </mesh>
      ))}
      <group position={[0, 0, -0.88]} rotation={[0, wag, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, s * 0.1, -0.1]} rotation={[s * 0.5, 0, 0]} scale={[0.012, 0.14, 0.1]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={BODY} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Simple low-poly owl (for "like an owl hunting at night")
export const Owl: React.FC<{ t: number }> = ({ t }) => (
  <group rotation={[0, Math.sin(t * 0.8) * 0.3, 0]}>
    <mesh scale={[0.42, 0.55, 0.38]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#8a6a4a" flatShading />
    </mesh>
    <mesh position={[0, 0.55, 0.02]} scale={[0.36, 0.3, 0.32]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#9c7a56" flatShading />
    </mesh>
    {/* facial disc + big yellow eyes */}
    {[-1, 1].map((s) => (
      <group key={s}>
        <mesh position={[s * 0.15, 0.58, 0.27]} scale={[0.13, 0.13, 0.05]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#e8d9bf" flatShading />
        </mesh>
        <mesh position={[s * 0.15, 0.58, 0.31]} scale={[0.09, 0.09, 0.03]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#ffc93c" emissive="#ffb000" emissiveIntensity={0.6} flatShading />
        </mesh>
        <mesh position={[s * 0.15, 0.58, 0.34]} scale={0.045}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#0b0b0b" />
        </mesh>
        {/* ear tufts */}
        <mesh position={[s * 0.22, 0.85, 0]} rotation={[0, 0, -s * 0.4]} scale={[0.06, 0.16, 0.05]}>
          <coneGeometry args={[1, 1, 4]} />
          <meshStandardMaterial color="#6e5238" flatShading />
        </mesh>
        {/* wings */}
        <mesh position={[s * 0.4, 0.0, -0.02]} rotation={[0, 0, s * 0.15]} scale={[0.1, 0.42, 0.28]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6e5238" flatShading />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 0.5, 0.33]} rotation={[Math.PI, 0, 0]} scale={[0.04, 0.08, 0.04]}>
      <coneGeometry args={[1, 1, 4]} />
      <meshStandardMaterial color="#e2b04a" flatShading />
    </mesh>
  </group>
);
