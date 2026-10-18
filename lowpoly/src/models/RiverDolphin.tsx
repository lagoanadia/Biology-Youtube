// Low-poly Amazon river dolphin / boto (Inia geoffrensis): long thin beak, bulging melon (forehead), small eyes, low
// ridge instead of a tall dorsal fin, big paddle-like flippers, pink-grey body. Neck vertebrae are not fused, so the
// head can bend up to ~90°.
// pink: 0 grey → 1 pink · neck: head bend (radians, + = to the left) · swim: tail beat · scars: pale scratch marks
import { useMemo } from "react";
import * as THREE from "three";
import { facet, rng } from "../lib/lowpoly";

const GREY = new THREE.Color("#8d8f99");
const PINK = new THREE.Color("#f0a3b4");
const BELLY = new THREE.Color("#f6d3dc");

// body profile [radius, z]: tail (−1.2) → neck (0.45)
const BODY: [number, number][] = [[0.02, -1.25], [0.08, -1.1], [0.16, -0.8], [0.25, -0.45], [0.3, -0.1], [0.3, 0.2], [0.26, 0.45]];
// head profile [radius, z]: neck (0) → melon → long thin beak (0.75)
const HEAD: [number, number][] = [[0.24, 0], [0.26, 0.12], [0.22, 0.24], [0.1, 0.32], [0.06, 0.5], [0.045, 0.68], [0, 0.76]];

const paint = (g: THREE.BufferGeometry, pink: number, seed: number) => {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const r = rng(seed);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    c.copy(GREY).lerp(PINK, pink * (0.75 + r() * 0.25));
    if (cy < -0.1) c.lerp(BELLY, 0.5 * pink + 0.2);
    for (let q = 0; q < 3; q++) c.toArray(colors, (i + q) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
};

const lathe = (prof: [number, number][], seed: number) => {
  const g = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 9);
  g.rotateX(Math.PI / 2);
  g.scale(1, 0.92, 1);
  return facet(g, 0.03, seed);
};

export const RiverDolphin: React.FC<{ t: number; pink?: number; neck?: number; swim?: number; scars?: number }> = ({
  t, pink = 1, neck = 0, swim = 1, scars = 0,
}) => {
  const pq = Math.round(pink * 10) / 10;
  const geo = useMemo(() => ({ body: paint(lathe(BODY, 3), pq, 4), head: paint(lathe(HEAD, 5), pq, 6) }), [pq]);
  const beat = Math.sin(t * 3.2) * 0.3 * swim;
  const scarLines = useMemo(() => {
    const r = rng(41);
    return Array.from({ length: 9 }, () => ({ x: (r() - 0.5) * 0.4, y: 0.1 + r() * 0.2, z: -0.5 + r() * 0.9, rz: (r() - 0.5) * 1.2 }));
  }, []);
  return (
    <group rotation={[0, beat * 0.12, 0]}>
      <mesh geometry={geo.body}>
        <meshStandardMaterial vertexColors flatShading roughness={0.45} />
      </mesh>
      {/* pale scratch scars on the back (where the pink comes from) */}
      {scars > 0.01 &&
        scarLines.map((s, i) => (
          <mesh key={i} position={[s.x, s.y + 0.08, s.z]} rotation={[-Math.PI / 2, 0, s.rz]} scale={[0.14 * scars, 0.012, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#ffe4ea" side={THREE.DoubleSide} />
          </mesh>
        ))}
      {/* low dorsal ridge instead of a tall fin */}
      <mesh position={[0, 0.27, -0.25]} rotation={[-0.3, 0, 0]} scale={[0.02, 0.06, 0.32]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={GREY.clone().lerp(PINK, pq)} flatShading />
      </mesh>
      {/* big paddle flippers */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.3, -0.12, 0.2]} rotation={[0.2, s * 0.5, s * (0.5 + Math.sin(t * 2 + s) * 0.15)]} scale={[0.28, 0.025, 0.14]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={GREY.clone().lerp(PINK, pq)} flatShading />
        </mesh>
      ))}
      {/* tail flukes */}
      <group position={[0, 0, -1.22]} rotation={[beat, 0, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.16, 0, -0.06]} rotation={[0, s * 0.5, 0]} scale={[0.2, 0.02, 0.09]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={GREY.clone().lerp(PINK, pq)} flatShading />
          </mesh>
        ))}
      </group>
      {/* flexible neck: the head bends on its own */}
      <group position={[0, 0.02, 0.43]} rotation={[0, neck, 0]}>
        <mesh geometry={geo.head}>
          <meshStandardMaterial vertexColors flatShading roughness={0.45} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.2, 0.04, 0.2]} scale={0.022}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#141016" />
          </mesh>
        ))}
        {/* blowhole */}
        <mesh position={[0, 0.235, 0.05]} scale={[0.03, 0.01, 0.02]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#5a3a44" />
        </mesh>
      </group>
    </group>
  );
};

// small silver fish (prey)
export const Fish: React.FC<{ t: number; color?: string }> = ({ t, color = "#c9d3c0" }) => (
  <group rotation={[0, Math.sin(t * 8) * 0.15, 0]}>
    <mesh scale={[0.05, 0.08, 0.2]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} flatShading metalness={0.4} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0, -0.22]} rotation={[0, 0, Math.PI / 4]} scale={[0.01, 0.07, 0.07]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  </group>
);
