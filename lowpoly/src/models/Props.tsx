// Supporting low-poly props: jellyfish, red ❌, light ray + spectrum fan, swim ripples.
import { useMemo } from "react";
import * as THREE from "three";
import { facet, rainbow } from "../lib/lowpoly";

export const Jellyfish: React.FC<{ t: number; color?: string }> = ({ t, color = "#ff8fc8" }) => {
  const bell = useMemo(() => {
    const g = new THREE.SphereGeometry(0.55, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    return facet(g, 0.06, 5);
  }, []);
  const pulse = 1 + 0.08 * Math.sin(t * 4);
  return (
    <group>
      <mesh geometry={bell} scale={[pulse, 1 / pulse, pulse]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} flatShading transparent opacity={0.85}
          side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.35, -0.55, Math.sin(a) * 0.35]}
            rotation={[Math.sin(t * 3 + i) * 0.25, 0, Math.cos(t * 2.5 + i) * 0.2]}>
            <cylinderGeometry args={[0.02, 0.006, 1.0, 3]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        );
      })}
    </group>
  );
};

// Flat red ❌ made of two faceted bars (always faces the camera when the parent does).
export const RedX: React.FC<{ size?: number }> = ({ size = 1 }) => (
  <group scale={size}>
    {[1, -1].map((s) => (
      <mesh key={s} rotation={[0, 0, (s * Math.PI) / 4]}>
        <boxGeometry args={[1.25, 0.22, 0.08]} />
        <meshStandardMaterial color="#ff2a3d" emissive="#ff2a3d" emissiveIntensity={0.7} flatShading />
      </mesh>
    ))}
  </group>
);

// A white ray coming down to `hit`, then fanning out into a rainbow (flat triangles, additive glow).
export const LightRay: React.FC<{ hit: [number, number, number]; grow: number; fan: number; length?: number }> = ({
  hit,
  grow,
  fan,
  length = 6,
}) => {
  const L = length * grow;
  return (
    <group position={hit}>
      {grow > 0 && (
        <mesh position={[0, L / 2, 0]}>
          <cylinderGeometry args={[0.03, 0.03, L, 5]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      {fan > 0 &&
        Array.from({ length: 7 }, (_, i) => {
          // seven flat wedges spreading down-and-outwards (red → violet)
          const ang = -0.5 + (i / 6) * 1.0;
          const g = new THREE.BufferGeometry();
          const r = 1.5 * fan;
          const w = 0.075;
          g.setAttribute("position", new THREE.Float32BufferAttribute(
            [0, 0, 0, Math.sin(ang - w) * r, -Math.cos(ang - w) * r, 0, Math.sin(ang + w) * r, -Math.cos(ang + w) * r, 0], 3));
          return (
            <mesh key={i} geometry={g} rotation={[0, -0.5, 0]}>
              <meshBasicMaterial color={rainbow(i / 7, 0.55)} transparent opacity={0.55 * Math.min(1, fan * 1.5)}
                blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
};

// Thin arcs left behind while swimming: born at the jelly's tail, they widen and fade.
export const Ripples: React.FC<{ t: number; emitY: (t: number) => number; every?: number }> = ({ t, emitY, every = 0.45 }) => {
  const rings = [];
  for (let k = 0; k < 5; k++) {
    const born = Math.floor(t / every) * every - k * every;
    if (born < 0) continue;
    const age = t - born;
    const life = age / (every * 5);
    if (life > 1) continue;
    rings.push(
      <mesh key={born.toFixed(2)} position={[0, emitY(born) - 1.15, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.35 + life * 1.1}>
        <torusGeometry args={[1, 0.012, 3, 16, Math.PI * 1.2]} />
        <meshBasicMaterial color="#9fe9ff" transparent opacity={0.55 * (1 - life)} depthWrite={false} />
      </mesh>,
    );
  }
  return <group>{rings}</group>;
};
