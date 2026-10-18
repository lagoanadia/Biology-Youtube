// Reusable rainforest environment (day, dusk or night): CSS sky/haze backdrop, warm key light + green bounce, low-poly
// trunks, branches, leaf clusters, hanging vines and drifting dust/fireflies. Used by the potoo, tarsier and sloth.
import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { facet, rng } from "../lib/lowpoly";

export type Time = "day" | "dusk" | "night";

const SKY: Record<Time, string> = {
  day: "linear-gradient(to bottom, #9fd8c9 0%, #4f9a7a 45%, #1f4d3a 100%)",
  dusk: "linear-gradient(to bottom, #f4a65f 0%, #b8607a 40%, #3a2f5c 75%, #18192e 100%)",
  night: "linear-gradient(to bottom, #0b1236 0%, #16224f 50%, #070a1c 100%)",
};
const FOG: Record<Time, string> = { day: "#5f9f84", dusk: "#6b4a6e", night: "#0b1236" };

export const JungleBackdrop: React.FC<{ time?: Time }> = ({ time = "day" }) => (
  <AbsoluteFill style={{ background: SKY[time] }} />
);

export const JungleLights: React.FC<{ time?: Time; light?: number; fogNear?: number; fogFar?: number }> = ({
  time = "day", light = 1, fogNear = 6, fogFar = 22,
}) => (
  <>
    <fog attach="fog" args={[FOG[time], fogNear, fogFar]} />
    <hemisphereLight args={[time === "night" ? "#5a6cc9" : "#fff3d6", time === "night" ? "#0a1020" : "#2d5a2a",
      (time === "night" ? 0.45 : 0.8) * light]} />
    <directionalLight position={[3, 6, 4]} intensity={(time === "night" ? 0.9 : 2.3) * light}
      color={time === "night" ? "#9fb4ff" : time === "dusk" ? "#ffb070" : "#fff1d0"} />
    <directionalLight position={[-4, 2, -3]} intensity={0.6 * light} color={time === "night" ? "#4a5cff" : "#8fe0a8"} />
  </>
);

const BARK = ["#5b4332", "#6b5039", "#4a3628"];

// Faceted, slightly bent trunk from y=y0 to y=y1
export const Trunk: React.FC<{ x: number; z: number; r?: number; y0?: number; y1?: number; seed?: number; color?: string }> = ({
  x, z, r = 0.35, y0 = -6, y1 = 9, seed = 1, color,
}) => {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(r * 0.8, r, y1 - y0, 7, 6);
    return facet(g, 0.08, seed);
  }, [r, y0, y1, seed]);
  return (
    <mesh geometry={geo} position={[x, (y0 + y1) / 2, z]} rotation={[0, seed, (seed % 3 - 1) * 0.03]}>
      <meshStandardMaterial color={color ?? BARK[seed % 3]} flatShading roughness={0.9} />
    </mesh>
  );
};

// A branch from `from` along direction `dir` (radians around Z), length len
export const Branch: React.FC<{ from: [number, number, number]; angle?: number; yaw?: number; len?: number; r?: number; color?: string }> = ({
  from, angle = 0, yaw = 0, len = 3, r = 0.09, color = "#5b4332",
}) => (
  <group position={from} rotation={[0, yaw, angle]}>
    <mesh position={[len / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[r * 0.6, r, len, 6]} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
  </group>
);

// Cluster of faceted leaf blobs
export const Leaves: React.FC<{ pos: [number, number, number]; size?: number; seed?: number; tint?: string }> = ({
  pos, size = 1, seed = 1, tint,
}) => {
  const blobs = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 6 }, () => ({
      p: [(r() - 0.5) * 1.6, (r() - 0.5) * 0.7, (r() - 0.5) * 1.2] as [number, number, number],
      s: 0.45 + r() * 0.45,
      c: tint ?? ["#2f7a3c", "#3d8f45", "#24622f", "#4aa356"][Math.floor(r() * 4)],
      g: facet(new THREE.IcosahedronGeometry(1, 0), 0.15, Math.floor(r() * 1000)),
    }));
  }, [seed, tint]);
  return (
    <group position={pos} scale={size}>
      {blobs.map((b, i) => (
        <mesh key={i} geometry={b.g} position={b.p} scale={b.s}>
          <meshStandardMaterial color={b.c} flatShading roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

export const Vine: React.FC<{ x: number; z: number; top?: number; len?: number; t: number }> = ({ x, z, top = 6, len = 5, t }) => (
  <group position={[x, top, z]} rotation={[0, 0, Math.sin(t * 0.6 + x) * 0.04]}>
    <mesh position={[0, -len / 2, 0]}>
      <cylinderGeometry args={[0.025, 0.025, len, 4]} />
      <meshStandardMaterial color="#3f6b2c" flatShading />
    </mesh>
  </group>
);

// Background forest: a few trunks and canopy blobs far away (fog does the depth)
export const ForestBack: React.FC<{ seed?: number; z?: number }> = ({ seed = 4, z = -9 }) => {
  const r = rng(seed);
  const trees = Array.from({ length: 7 }, (_, i) => ({ x: -9 + i * 3 + (r() - 0.5) * 1.5, z: z - r() * 4, rr: 0.3 + r() * 0.35 }));
  return (
    <>
      {trees.map((tr, i) => (
        <group key={i}>
          <Trunk x={tr.x} z={tr.z} r={tr.rr} seed={i + seed} />
          <Leaves pos={[tr.x, 6.5 + (i % 3), tr.z]} size={2.2} seed={i + 30} />
        </group>
      ))}
    </>
  );
};

// Floating dust (day) or fireflies (night). Pure function of t.
export const Motes: React.FC<{ t: number; night?: boolean; count?: number; spread?: number }> = ({ t, night = false, count = 40, spread = 6 }) => {
  const m = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: count }, () => ({ x: (r() - 0.5) * spread * 1.6, y: (r() - 0.5) * spread, z: -r() * spread + 1,
      w: r() * 6.28, s: 0.6 + r() }));
  }, [count, spread]);
  return (
    <>
      {m.map((p, i) => {
        const blink = night ? Math.max(0, Math.sin(t * 1.4 * p.s + p.w)) ** 2 : 0.6;
        return (
          <mesh key={i} position={[p.x + Math.sin(t * 0.3 + p.w) * 0.3, p.y + Math.sin(t * 0.5 * p.s + p.w) * 0.2, p.z]}
            scale={night ? 0.025 + blink * 0.02 : 0.015}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={night ? new THREE.Color("#d8ff6a").multiplyScalar(0.3 + blink) : "#fff7d6"} />
          </mesh>
        );
      })}
    </>
  );
};

export const Moon: React.FC<{ pos?: [number, number, number] }> = ({ pos = [-2.5, 5, -12] }) => (
  <mesh position={pos} scale={1.1}>
    <icosahedronGeometry args={[1, 1]} />
    <meshBasicMaterial color="#f4f0d8" fog={false} />
  </mesh>
);
