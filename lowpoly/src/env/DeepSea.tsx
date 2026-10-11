// Reusable deep-sea environment: gradient backdrop (CSS, behind the transparent canvas), fog, key light
// from above, cyan rim light and drifting low-poly marine snow.
import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { PALETTE, rng } from "../lib/lowpoly";

// near-black at the bottom → dark navy at the top
export const DeepSeaBackdrop: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(to top, ${PALETTE.black} 0%, ${PALETTE.navy} 55%, ${PALETTE.deep} 100%)`,
      filter: `brightness(${1 - dim * 0.55})`,
    }}
  />
);

export const DeepSeaLights: React.FC<{ light?: number; rim?: number }> = ({ light = 1, rim = 1 }) => (
  <>
    <fog attach="fog" args={[PALETTE.navy, 4, 16]} />
    <ambientLight intensity={0.12 + 0.18 * light} color="#9fc3ff" />
    {/* one soft light from above */}
    <directionalLight position={[0.6, 6, 2]} intensity={2.2 * light} color="#ffffff" />
    {/* cool cyan rim light from behind */}
    <directionalLight position={[-3, 1, -4]} intensity={1.6 * rim} color={PALETTE.cyan} />
    <directionalLight position={[3, -1, -3]} intensity={0.7 * rim} color={PALETTE.cyan} />
  </>
);

// Small faceted particles drifting slowly down and sideways. Positions are a pure function of t.
export const MarineSnow: React.FC<{ t: number; count?: number; spread?: number; seed?: number }> = ({
  t,
  count = 70,
  spread = 6,
  seed = 11,
}) => {
  const flakes = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({
      x: (r() - 0.5) * spread * 1.4,
      y: (r() - 0.5) * spread * 2,
      z: -r() * spread,
      s: 0.012 + r() * 0.03,
      v: 0.05 + r() * 0.12,
      w: r() * Math.PI * 2,
    }));
  }, [count, spread, seed]);
  const geo = useMemo(() => new THREE.TetrahedronGeometry(1, 0), []);
  const h = spread * 2;
  return (
    <group>
      {flakes.map((f, i) => {
        const y = ((((f.y - t * f.v + h / 2) % h) + h) % h) - h / 2;
        return (
          <mesh key={i} geometry={geo} position={[f.x + Math.sin(t * 0.4 + f.w) * 0.15, y, f.z + 1]}
            rotation={[t * 0.3 + f.w, t * 0.2, 0]} scale={f.s}>
            <meshStandardMaterial color="#cfe6ff" emissive="#4c6fa8" emissiveIntensity={0.4} flatShading />
          </mesh>
        );
      })}
    </group>
  );
};
