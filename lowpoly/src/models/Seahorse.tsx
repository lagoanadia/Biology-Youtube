// Low-poly seahorse: upright S-shaped ringed body, head bent forward with a long tube snout and a little crown, small
// fluttering back fin, tail curled into a spiral. Male: brood pouch on the belly.
// pouch: 0..1 swelling · xray: pouch turns see-through (eggs / embryos inside) · eggs: 0..1 how many are inside ·
// push: labor contraction (body pumps forward) · bright: courtship brightening · female: no pouch.
// Faces +z, ≈1.2 tall, tail curl bottom ≈ y 0.
import { useMemo } from "react";
import * as THREE from "three";
import { clamp01, rng, taperedTube } from "../lib/lowpoly";

const SPINE: [number, number][] = [
  // [y, z] from the neck down the back, belly, then the tail
  [1.0, -0.02], [0.9, -0.06], [0.78, -0.04], [0.64, 0.02], [0.5, 0.04], [0.38, 0.02], [0.27, -0.03], [0.18, -0.04],
];

export const Seahorse: React.FC<{ t: number; pouch?: number; xray?: number; eggs?: number; push?: number; bright?: number;
  female?: boolean; color?: string }> = ({ t, pouch = 0, xray = 0, eggs = 0, push = 0, bright = 0, female = false, color }) => {
  const base = new THREE.Color(color ?? (female ? "#e9a23b" : "#e6c13a"));
  const col = base.clone().lerp(new THREE.Color("#fff3b0"), bright * 0.6);
  const dark = base.clone().multiplyScalar(0.62);
  const sway = Math.sin(t * 1.4) * 0.03;
  // body + tail: tail continues from the hip as a tightening spiral
  const pts = useMemo(() => {
    const p = SPINE.map(([y, z]) => new THREE.Vector3(0, y, z));
    // tail: a tightening spiral that starts at the hip, goes down, forward and up
    const c = new THREE.Vector3(0, 0.08, 0.1);
    const a0 = Math.atan2(-0.14, 0.1);
    for (let i = 1; i <= 16; i++) {
      const ang = a0 - i * 0.45;
      const rr = 0.17 * (1 - i / 20);
      p.push(new THREE.Vector3(0, c.y + Math.cos(ang) * rr, c.z + Math.sin(ang) * rr));
    }
    return p;
  }, []);
  const body = useMemo(() => taperedTube(pts, 0.105, 0.012, 48, 7), [pts]);
  const rings = pts.slice(1, 14);
  const pr = 0.09 + pouch * 0.07;
  const r = rng(5);
  return (
    <group rotation={[sway + push * 0.25, 0, 0]}>
      <mesh geometry={body}>
        <meshStandardMaterial color={col} flatShading roughness={0.6} />
      </mesh>
      {/* bony rings */}
      {rings.map((p, i) => (
        <mesh key={i} position={p} rotation={[Math.PI / 2 + (i < 7 ? 0.2 : -0.4), 0, 0]} scale={(i < 7 ? 1.05 : 0.9 - i * 0.04) * 0.105}>
          <torusGeometry args={[1, 0.12, 3, 8]} />
          <meshStandardMaterial color={dark} flatShading />
        </mesh>
      ))}
      {/* head: bent forward, long snout, crown, eye */}
      <group position={[0, 1.05, 0.02]} rotation={[0.2, 0, 0]}>
        <mesh scale={[0.085, 0.1, 0.12]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={col} flatShading roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.05, 0.17]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.045, 0.22, 6]} />
          <meshStandardMaterial color={col} flatShading />
        </mesh>
        <mesh position={[0, -0.09, 0.27]} scale={0.032}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={dark} flatShading />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[(i - 1.5) * 0.025, 0.11, -0.02 - (i % 2) * 0.02]} scale={[0.02, 0.05, 0.02]}>
            <coneGeometry args={[1, 1, 4]} />
            <meshStandardMaterial color={dark} flatShading />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.07, 0.02, 0.04]} scale={0.03}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[s * 0.088, 0.02, 0.05]} scale={0.017}>
              <icosahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#111" />
            </mesh>
          </group>
        ))}
      </group>
      {/* back fin (flutters fast) + tiny side fins */}
      <mesh position={[0, 0.55, -0.1]} rotation={[0, Math.sin(t * 22) * 0.5, 0]} scale={[0.01, 0.12, 0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#fff6c8" transparent opacity={0.75} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.09, 0.86, 0.02]} rotation={[0, s * 0.6 + Math.sin(t * 20 + s) * 0.5, 0]} scale={[0.04, 0.035, 0.005]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#fff6c8" transparent opacity={0.75} />
        </mesh>
      ))}
      {/* brood pouch (male) with eggs inside */}
      {!female && (
        <group position={[0, 0.36, 0.08 + pouch * 0.04]}>
          <mesh scale={[pr * 1.05, pr * 1.25, pr]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={base.clone().lerp(new THREE.Color("#fff0c8"), 0.35)} flatShading roughness={0.5}
              transparent={xray > 0} opacity={1 - xray * 0.6} depthWrite={xray < 0.5} />
          </mesh>
          {xray > 0 &&
            Array.from({ length: 18 }, (_, i) => {
              const k = clamp01(eggs * 18 - i);
              const p = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(pr * 0.6 * Math.sqrt(r()));
              return k > 0 ? (
                <mesh key={i} position={p} scale={0.022 * k}>
                  <icosahedronGeometry args={[1, 0]} />
                  <meshStandardMaterial color="#ff8a2a" emissive="#ff6a00" emissiveIntensity={0.4} />
                </mesh>
              ) : null;
            })}
        </group>
      )}
      {female && (
        <mesh position={[0, 0.3, 0.07]} rotation={[0.9, 0, 0]} scale={[0.015, 0.06, 0.015]}>
          <cylinderGeometry args={[1, 1, 1, 5]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      )}
    </group>
  );
};
