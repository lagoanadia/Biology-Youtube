// Low-poly egg clutch on a rock wall: teardrop capsules hanging from short stalks.
// grow = development (size), embryo = dark eyes visible inside, empty = torn open capsules after hatching.
import { useMemo } from "react";
import * as THREE from "three";
import { rng } from "../lib/lowpoly";

const profile = (open: boolean) => {
  const p = [
    [0.004, 0], [0.012, -0.02], [0.03, -0.05], [0.042, -0.09], [0.04, -0.125], [0.028, -0.155], [0.0, -0.17],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return open ? p.slice(0, 5) : p; // empty capsule: bottom torn away
};

export type EggsProps = { t: number; grow?: number; embryo?: number; empty?: number; count?: number; seed?: number };

export const Eggs: React.FC<EggsProps> = ({ t, grow = 1, embryo = 0, empty = 0, count = 42, seed = 4 }) => {
  const full = useMemo(() => new THREE.LatheGeometry(profile(false), 6), []);
  const torn = useMemo(() => new THREE.LatheGeometry(profile(true), 6), []);
  const eggs = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      return { x: Math.cos(a) * d * 0.3, y: Math.sin(a) * d * 0.17, tilt: (r() - 0.5) * 0.5, roll: r() * 6, s: 0.85 + r() * 0.3 };
    });
  }, [count, seed]);
  const size = 0.6 + 0.4 * grow;
  return (
    <group>
      {eggs.map((e, i) => {
        const sway = Math.sin(t * 1.1 + i) * 0.04;
        return (
          <group key={i} position={[e.x, e.y, 0.02 + Math.abs(e.x) * -0.1]} rotation={[0.55 + e.tilt * 0.4 + sway, e.roll, e.tilt]}
            scale={e.s * size}>
            {/* stalk */}
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.004, 0.006, 0.04, 3]} />
              <meshStandardMaterial color="#cfe8c8" flatShading />
            </mesh>
            {empty < 1 && (
              <mesh geometry={full}>
                <meshStandardMaterial color="#f4f0dc" flatShading transparent opacity={0.82 * (1 - empty)}
                  emissive="#d8d2b0" emissiveIntensity={0.18} />
              </mesh>
            )}
            {empty > 0 && (
              <mesh geometry={torn}>
                <meshStandardMaterial color="#e8f1f6" flatShading transparent opacity={0.4 * empty} side={THREE.DoubleSide}
                  depthWrite={false} />
              </mesh>
            )}
            {embryo > 0 && empty < 1 && (
              // the embryo's two dark eyes, visible through the capsule late in development
              [-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.013, -0.1, 0.03]} scale={0.009 * embryo}>
                  <icosahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial color="#1a1020" />
                </mesh>
              ))
            )}
          </group>
        );
      })}
    </group>
  );
};
