// Low-poly star-nosed mole (Condylura cristata): dark velvety body, tiny eyes, big shovel front paws with claws, long
// thick tail, and the pink "star" of 22 fleshy tentacles (11 per side) around the nostrils.
// tap: tentacle flicker 0..1 (they touch up to 12 objects per second) · sniff: bubble blown out of the nose 0..1
// (underwater sniffing) · dig: front paws stroke · glow: highlight the star (touch sensors).
import { useMemo } from "react";
import * as THREE from "three";
import { facet, lerp } from "../lib/lowpoly";

const FUR = new THREE.Color("#2b2522");
const PINK = new THREE.Color("#f08c9e");
const PALM = new THREE.Color("#d9a39a");

export const StarMole: React.FC<{ t: number; tap?: number; sniff?: number; dig?: number; glow?: number; swim?: number }> = ({
  t, tap = 0, sniff = 0, dig = 0, glow = 0, swim = 0,
}) => {
  const body = useMemo(() => {
    const g = facet(new THREE.IcosahedronGeometry(1, 1), 0.06, 5);
    g.scale(0.26, 0.2, 0.42);
    return g;
  }, []);
  // 22 tentacles: two rings of 11 around the nose, the bottom pair shortest
  const tentacles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const side = i < 11 ? -1 : 1;
        const k = i % 11; // 0 = top … 10 = bottom
        const a = lerp(0.25, Math.PI - 0.15, k / 10); // from top round to bottom on each side
        const len = k >= 9 ? 0.04 : lerp(0.09, 0.065, k / 10);
        return { side, a, len, ph: i * 1.7 };
      }),
    [],
  );
  const paw = Math.sin(t * 9) * 0.5 * dig + Math.sin(t * 5) * 0.3 * swim;
  return (
    <group>
      <mesh geometry={body}>
        <meshStandardMaterial color={FUR} flatShading roughness={0.7} />
      </mesh>
      {/* head taper */}
      <mesh position={[0, 0.0, 0.38]} rotation={[Math.PI / 2, 0, 0]} scale={[0.13, 0.2, 0.11]}>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color={FUR} flatShading roughness={0.7} />
      </mesh>
      {/* tiny eyes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.07, 0.05, 0.38]} scale={0.011}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      ))}
      {/* the star */}
      <group position={[0, -0.005, 0.5]}>
        <mesh scale={[0.035, 0.03, 0.02]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={PINK} emissive={PINK} emissiveIntensity={glow * 0.6} flatShading />
        </mesh>
        {tentacles.map((tt, i) => {
          const flick = tap * Math.sin(t * 40 + tt.ph) * 0.25;
          const dir = new THREE.Vector3(Math.sin(tt.a) * tt.side, Math.cos(tt.a), 0.35 + flick).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          return (
            <mesh key={i} position={dir.clone().multiplyScalar(0.025 + tt.len / 2).toArray()} quaternion={q}>
              <cylinderGeometry args={[0.011, 0.016, tt.len, 5]} />
              <meshStandardMaterial color={PINK} emissive="#ff5a7a" emissiveIntensity={glow} flatShading />
            </mesh>
          );
        })}
      </group>
      {/* big shovel front paws, palms out */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.2, -0.12, 0.22]} rotation={[paw * s, s * 0.6, s * 0.4]}>
          <mesh position={[s * 0.06, -0.02, 0.05]} rotation={[0, 0, s * 0.3]} scale={[0.1, 0.03, 0.09]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={PALM} flatShading />
          </mesh>
          {[-1, 0, 1].map((c) => (
            <mesh key={c} position={[s * 0.06 + c * 0.03, -0.03, 0.14]} rotation={[1.4, 0, 0]} scale={[0.008, 0.05, 0.008]}>
              <coneGeometry args={[1, 1, 4]} />
              <meshStandardMaterial color="#e9e0cf" flatShading />
            </mesh>
          ))}
        </group>
      ))}
      {/* back feet */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.16, -0.16, -0.3]} scale={[0.06, 0.02, 0.08]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={PALM} flatShading />
        </mesh>
      ))}
      {/* long thick tail */}
      <mesh position={[0, -0.02, -0.55]} rotation={[Math.PI / 2 + 0.2, Math.sin(t * 4) * 0.2 * swim, 0]}>
        <cylinderGeometry args={[0.03, 0.045, 0.3, 6]} />
        <meshStandardMaterial color={FUR} flatShading />
      </mesh>
      {/* the sniffing bubble: blown out over the prey, then sucked back */}
      {sniff > 0.02 && (
        <mesh position={[0, -0.04, 0.56 + sniff * 0.03]} scale={0.02 + sniff * 0.05}>
          <icosahedronGeometry args={[1, 2]} />
          <meshPhysicalMaterial color="#dff6ff" transparent opacity={0.55} roughness={0} clearcoat={1} flatShading />
        </mesh>
      )}
    </group>
  );
};

// small worm / larva prey
export const Worm: React.FC<{ t: number; color?: string }> = ({ t, color = "#d98a8a" }) => (
  <group>
    {Array.from({ length: 6 }, (_, i) => (
      <mesh key={i} position={[Math.sin(t * 4 + i * 0.8) * 0.01, 0, i * 0.022]} scale={0.014}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    ))}
  </group>
);
