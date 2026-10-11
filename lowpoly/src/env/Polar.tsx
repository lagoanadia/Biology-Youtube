// Reusable Antarctic surface environment: overcast sky backdrop, fog, cold daylight, faceted water surface with
// small swell + optional travelling "push wave" (the wave the orcas make). Heights are a pure function of (x, z, t).
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";

export const POLAR = { skyTop: "#7f9db6", skyLow: "#dfe9f0", water: "#2a6f8e", deep: "#123a52", ice: "#f3f8fc" };

export const PolarBackdrop: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${POLAR.skyTop} 0%, ${POLAR.skyLow} 60%, ${POLAR.skyLow} 100%)` }} />
);

export const PolarLights: React.FC = () => (
  <>
    <fog attach="fog" args={[POLAR.skyLow, 14, 42]} />
    <ambientLight intensity={0.55} color="#dbe8f2" />
    <directionalLight position={[-4, 8, 5]} intensity={1.6} color="#ffffff" />
    <directionalLight position={[5, 2, -6]} intensity={0.6} color="#9fd4ff" />
  </>
);

// A travelling wave: crest moving along `dir` (unit, xz) from `from` (distance along dir) at `speed`.
export type PushWave = { dirX: number; dirZ: number; pos: number; amp: number; width?: number };

export const waveHeight = (x: number, z: number, t: number, push?: PushWave[]) => {
  let y = 0.05 * Math.sin(x * 0.9 + t * 1.1) + 0.04 * Math.sin(z * 1.3 - t * 0.8) + 0.025 * Math.sin((x + z) * 2.1 + t * 1.7);
  for (const p of push ?? []) {
    const along = x * p.dirX + z * p.dirZ - p.pos;
    const w = p.width ?? 0.9;
    y += p.amp * Math.exp(-(along * along) / (w * w));
  }
  return y;
};

export const Water: React.FC<{ t: number; push?: PushWave[]; size?: number; segments?: number; center?: [number, number] }> = ({
  t, push, size = 90, segments = 90, center = [0, 0],
}) => {
  const base = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [size, segments]);
  const geo = useMemo(() => {
    const g = base.clone();
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + center[0];
      const z = pos.getZ(i) + center[1];
      pos.setY(i, waveHeight(x, z, t, push));
    }
    const f = g.toNonIndexed();
    f.computeVertexNormals();
    g.dispose();
    return f;
  }, [base, t, push, center]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[center[0], 0, center[1]]}>
      <meshStandardMaterial color={POLAR.water} flatShading roughness={0.35} metalness={0.1} transparent opacity={0.88} />
    </mesh>
  );
};
