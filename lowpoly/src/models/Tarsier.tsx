// Low-poly Philippine tarsier (Carlito syrichta): tiny grey-brown body, round head with two enormous orange-brown eyes
// (each about as big as its brain), big thin ears, long thin tail, very long hind legs and long fingers with pads.
// Clinging pose on a vertical branch by default (body upright, hugging the trunk on its -z side).
// head: head rotation in radians (up to ±π, it turns halfway around) · leap: 0 = clinging, 1 = stretched mid-jump
// · call: mouth open (ultrasonic scream) · glow: eyeshine at night · cutaway: shows the eye vs brain size comparison.
import { useMemo } from "react";
import * as THREE from "three";
import { facet, lerp } from "../lib/lowpoly";

const FUR = new THREE.Color("#9a8b78");
const FUR_DARK = new THREE.Color("#7a6b5a");
const SKIN = new THREE.Color("#c9a48f");

export const Tarsier: React.FC<{ t: number; head?: number; leap?: number; call?: number; glow?: number; cutaway?: number }> = ({
  t, head = 0, leap = 0, call = 0, glow = 0, cutaway = 0,
}) => {
  const geo = useMemo(() => ({
    body: facet(new THREE.IcosahedronGeometry(1, 1), 0.07, 4),
    head: facet(new THREE.IcosahedronGeometry(1, 1), 0.04, 5),
  }), []);
  const breathe = 1 + Math.sin(t * 3) * 0.015;
  // legs: bent (clinging) → stretched straight back (leap)
  const thigh = lerp(-1.1, 0.5, leap);
  const shin = lerp(2.2, 0.3, leap);
  return (
    <group>
      {/* body (upright when clinging, horizontal when leaping) */}
      <group rotation={[lerp(-0.15, -1.3, leap), 0, 0]}>
        <mesh geometry={geo.body} scale={[0.17 * breathe, 0.24, 0.15 * breathe]}>
          <meshStandardMaterial color={FUR} flatShading roughness={0.9} />
        </mesh>
        {/* long thin tail with a tuft */}
        <group position={[0, -0.22, -0.05]} rotation={[lerp(0.15, 0.9, leap) + Math.sin(t * 1.3) * 0.05, 0, 0]}>
          <mesh position={[0, -0.32, 0]}>
            <cylinderGeometry args={[0.012, 0.02, 0.64, 5]} />
            <meshStandardMaterial color={FUR_DARK} flatShading />
          </mesh>
          <mesh position={[0, -0.66, 0]} scale={[0.03, 0.08, 0.03]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={FUR_DARK} flatShading />
          </mesh>
        </group>
        {/* very long hind legs */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.1, -0.18, 0.02]} rotation={[thigh, 0, s * 0.15]}>
            <mesh position={[0, -0.1, 0]} scale={[0.05, 0.12, 0.05]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={FUR} flatShading />
            </mesh>
            <group position={[0, -0.2, 0]} rotation={[shin, 0, 0]}>
              <mesh position={[0, -0.1, 0]}>
                <cylinderGeometry args={[0.018, 0.022, 0.22, 5]} />
                <meshStandardMaterial color={FUR} flatShading />
              </mesh>
              <mesh position={[0, -0.24, 0.02]} scale={[0.03, 0.08, 0.02]}>
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color={SKIN} flatShading />
              </mesh>
            </group>
          </group>
        ))}
        {/* arms with long fingers and round pads */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.12, 0.1, 0.06]} rotation={[lerp(-0.6, -2.4, leap), 0, s * 0.3]}>
            <mesh position={[0, -0.08, 0]}>
              <cylinderGeometry args={[0.015, 0.02, 0.16, 5]} />
              <meshStandardMaterial color={FUR} flatShading />
            </mesh>
            {[-1, 0, 1].map((f) => (
              <mesh key={f} position={[f * 0.018, -0.18, 0]} scale={0.014}>
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color={SKIN} flatShading />
              </mesh>
            ))}
          </group>
        ))}
        {/* head: turns almost halfway around on its neck */}
        <group position={[0, 0.31, 0.02]} rotation={[lerp(0, 1.2, leap), head, 0]} scale={1.2}>
          <mesh geometry={geo.head} scale={[0.16, 0.14, 0.14]}>
            <meshStandardMaterial color={FUR} flatShading roughness={0.9} transparent opacity={lerp(1, 0.35, cutaway)} />
          </mesh>
          {/* brain (only seen in the cutaway): about the size of one eye */}
          {cutaway > 0.01 && (
            <mesh position={[0, 0.02, -0.04]} scale={0.072 * cutaway}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#f2a6b4" flatShading />
            </mesh>
          )}
          {/* the two enormous eyes */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.075, 0.015, 0.1]}>
              <mesh scale={0.074}>
                <icosahedronGeometry args={[1, 2]} />
                <meshStandardMaterial color="#c8742a" emissive="#ff9a2a" emissiveIntensity={0.15 + glow * 1.2} roughness={0.15} flatShading />
              </mesh>
              <mesh position={[0, 0, 0.055]} scale={[0.04, 0.04, 0.025]}>
                <icosahedronGeometry args={[1, 1]} />
                <meshBasicMaterial color="#0a0603" />
              </mesh>
              <mesh position={[0.02, 0.025, 0.07]} scale={0.012}>
                <icosahedronGeometry args={[1, 0]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
          {/* big thin ears */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, 0.12, -0.02]} rotation={[0, s * 0.4, s * -0.3]} scale={[0.07, 0.09, 0.012]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color={SKIN} flatShading side={THREE.DoubleSide} />
            </mesh>
          ))}
          {/* tiny nose and mouth (opens for the ultrasonic call) */}
          <mesh position={[0, -0.06, 0.13]} scale={0.012}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#3a2418" />
          </mesh>
          <mesh position={[0, -0.09, 0.12]} scale={[0.03, 0.006 + call * 0.025, 0.01]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial color={call > 0.1 ? "#5a1a22" : "#3a2418"} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
