// Bright shallow seagrass reef (seahorse short): turquoise gradient, blue fog, sun rays, sandy floor, swaying seagrass
// blades, a few colourful corals and drifting particles.
import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { rng } from "../lib/lowpoly";

export const ReefBackdrop: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <AbsoluteFill style={{ background: "linear-gradient(to bottom, #8fe0f2 0%, #3fb2d6 35%, #1f7fa8 75%, #155d80 100%)",
    filter: `brightness(${1 - dim * 0.6})` }} />
);

export const ReefLights: React.FC<{ light?: number; fogNear?: number; fogFar?: number }> = ({ light = 1, fogNear = 4, fogFar = 16 }) => (
  <>
    <fog attach="fog" args={["#2f97bf", fogNear, fogFar]} />
    <hemisphereLight args={["#dff7ff", "#3a6a5a", 0.9 * light]} />
    <directionalLight position={[2, 8, 3]} intensity={2.2 * light} color="#fffbe8" />
    <directionalLight position={[-3, 1, -2]} intensity={0.4 * light} color="#7fd6ff" />
  </>
);

export const Seagrass: React.FC<{ t: number; count?: number; spread?: number; seed?: number; tall?: number }> = ({
  t, count = 60, spread = 7, seed = 3, tall = 1,
}) => {
  const blades = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({ x: (r() - 0.5) * spread, z: -r() * spread * 0.9 + 1.2, h: (0.8 + r() * 1.4) * tall,
      w: r() * 6.28, c: r() > 0.5 ? "#5fa83f" : "#4b8f34" }))
      .filter((b) => !(Math.abs(b.x) < 0.75 && b.z > -0.7)); // keep the stage in the middle clear
  }, [count, spread, seed, tall]);
  return (
    <>
      {blades.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 0.02, b.z]} rotation={[Math.sin(t * 1.2 + b.w) * 0.12, b.w, Math.cos(t * 0.9 + b.w) * 0.1]}
          scale={[0.05, b.h, 0.01]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={b.c} flatShading />
        </mesh>
      ))}
    </>
  );
};

export const ReefFloor: React.FC<{ t: number }> = ({ t }) => {
  const corals = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 10 }, () => ({ x: (r() - 0.5) * 8, z: -1 - r() * 6, s: 0.2 + r() * 0.35,
      c: ["#ff7a8a", "#ffb347", "#c38bff", "#ff5fa2"][Math.floor(r() * 4)], k: r() > 0.5 }));
  }, []);
  const motes = useMemo(() => {
    const r = rng(14);
    return Array.from({ length: 50 }, () => ({ x: (r() - 0.5) * 6, y: r() * 3, z: -r() * 5 + 1.5, w: r() * 6.28 }));
  }, []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#e2cf9c" roughness={1} />
      </mesh>
      {corals.map((c, i) => (
        <mesh key={i} position={[c.x, c.s * 0.6, c.z]} scale={[c.s, c.s * (c.k ? 1.6 : 0.8), c.s]}>
          {c.k ? <coneGeometry args={[0.6, 1.2, 5]} /> : <icosahedronGeometry args={[1, 0]} />}
          <meshStandardMaterial color={c.c} flatShading />
        </mesh>
      ))}
      {motes.map((m, i) => (
        <mesh key={`m${i}`} position={[m.x + Math.sin(t * 0.3 + m.w) * 0.2, m.y + Math.sin(t * 0.25 + m.w) * 0.1, m.z]} scale={0.012}>
          <tetrahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#e8fbff" transparent opacity={0.7} />
        </mesh>
      ))}
      {[-2, -0.6, 0.8, 2.2].map((x, i) => (
        <mesh key={`r${i}`} position={[x + Math.sin(t * 0.3 + i) * 0.2, 3, -2 - i * 0.6]} rotation={[0, 0, 0.2 - i * 0.08]}>
          <planeGeometry args={[0.5, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false}
            side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
};
