// Low-poly deep-sea crustaceans: king crab (lithodid) and red shrimp (pandalid). Walk/swim cycles from `t`.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { facet, rng, taperedTube } from "../lib/lowpoly";

// Legs: 2-segment, lifted in a walk cycle. Built in the crab's local frame (+x = right, +z = forward).
const legGeo = (side: number, i: number, t: number, walk: number, scale: number) => {
  const phase = t * 7 * walk + i * 2.1 + (side > 0 ? Math.PI : 0);
  const lift = Math.max(0, Math.sin(phase)) * 0.05 * walk;
  const swing = Math.cos(phase) * 0.05 * walk;
  const z0 = (i - 1) * 0.07;
  const base = new THREE.Vector3(side * 0.12, 0, z0);
  const knee = new THREE.Vector3(side * 0.3, 0.1 + lift, z0 + swing + (i - 1) * 0.05);
  const foot = new THREE.Vector3(side * 0.42, -0.12 + lift * 0.5, z0 + swing * 1.4 + (i - 1) * 0.1);
  return taperedTube([base, base.clone().lerp(knee, 0.5).setY(0.08 + lift), knee, foot].map((v) => v.multiplyScalar(scale)),
    0.022 * scale, 0.008 * scale, 8, 5);
};

export const Crab: React.FC<{ t: number; walk?: number }> = ({ t, walk = 1 }) => {
  const shell = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    g.scale(0.17, 0.08, 0.15);
    return facet(g, 0.12, 21);
  }, []);
  const spikes = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 12 }, () => [(r() - 0.5) * 0.24, 0.06 + r() * 0.02, (r() - 0.5) * 0.2] as const);
  }, []);
  const legs = [-1, 1].flatMap((side) => [0, 1, 2].map((i) => legGeo(side, i, t, walk, 1)));
  useEffect(() => () => legs.forEach((g) => g.dispose()), [legs]);
  const red = "#d2492a";
  const bob = Math.abs(Math.sin(t * 7 * walk)) * 0.012 * walk;
  return (
    <group position={[0, bob, 0]}>
      <mesh geometry={shell}>
        <meshStandardMaterial color={red} flatShading roughness={0.6} />
      </mesh>
      {spikes.map((p, i) => (
        <mesh key={i} position={p as unknown as [number, number, number]} scale={0.022}>
          <coneGeometry args={[0.6, 1.6, 4]} />
          <meshStandardMaterial color="#b83a20" flatShading />
        </mesh>
      ))}
      {legs.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={i % 2 ? red : "#e06a3c"} flatShading />
        </mesh>
      ))}
      {/* claws */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.1, 0.0, 0.16]} rotation={[0.2, s * -0.4, 0]}>
          <mesh position={[0, 0, 0.06]} scale={[0.045, 0.035, 0.09]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={red} flatShading />
          </mesh>
          <mesh position={[0, 0, 0.15]} rotation={[0, 0, 0]} scale={[0.03, 0.02, 0.05]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#f08a5a" flatShading />
          </mesh>
        </group>
      ))}
      {/* eyes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.04, 0.07, 0.15]} scale={0.018}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      ))}
    </group>
  );
};

// Shrimp: arched body of shrinking segments, tail fan, two long antennae. Faces +z.
export const Shrimp: React.FC<{ t: number; swim?: number }> = ({ t, swim = 1 }) => {
  const flick = Math.sin(t * 9) * 0.08 * swim;
  const antennae = [-1, 1].map((s) =>
    taperedTube(
      [0, 0.25, 0.5, 0.75, 1].map(
        (u) => new THREE.Vector3(s * (0.02 + u * 0.12), 0.03 + u * 0.08 + Math.sin(t * 2 + u * 3 + s) * 0.03 * u, 0.12 + u * 0.55),
      ),
      0.006, 0.0015, 10, 3,
    ),
  );
  useEffect(() => () => antennae.forEach((g) => g.dispose()), [antennae]);
  const segs = 6;
  return (
    <group>
      {Array.from({ length: segs }, (_, i) => {
        const a = (i / segs) * 1.3 + flick * i * 0.3; // arched body, tail curls
        const z = 0.1 - Math.sin(a) * 0.22;
        const y = -0.02 - (1 - Math.cos(a)) * 0.16;
        const s = 1 - i * 0.11;
        return (
          <mesh key={i} position={[0, y, z]} rotation={[-a, 0, 0]} scale={[0.055 * s, 0.05 * s, 0.05]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={i % 2 ? "#e2503f" : "#f06a55"} flatShading />
          </mesh>
        );
      })}
      {/* tail fan */}
      <mesh position={[0, -0.27, -0.14]} rotation={[-1.9 - flick, 0, 0]} scale={[0.07, 0.01, 0.05]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#f58a72" flatShading />
      </mesh>
      {/* head + eye */}
      <mesh position={[0, 0.0, 0.17]} scale={[0.05, 0.045, 0.07]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#f06a55" flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.035, 0.03, 0.2]} scale={0.014}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      ))}
      {antennae.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#f5a090" flatShading />
        </mesh>
      ))}
      {/* small legs */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, -0.07 - i * 0.012, 0.12 - i * 0.04]} rotation={[0.3 + Math.sin(t * 10 + i) * 0.3 * swim, 0, 0]}>
          <boxGeometry args={[0.07, 0.07, 0.006]} />
          <meshStandardMaterial color="#f08a72" flatShading />
        </mesh>
      ))}
    </group>
  );
};
