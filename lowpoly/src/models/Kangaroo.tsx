// Low-poly kangaroo with an evolution dial. evo 0 = small possum-like forest ancestor on all fours (round ears, short
// legs, grey-brown); evo 1 = red kangaroo (upright, huge hind legs and feet, tiny arms, thick tail, long ears, red).
// hop: hop cycle phase (radians, 0 = standing) · hopAmt: 0..1 · spring: glow on the hind-leg tendon · pouch: show the
// pouch opening · cut: pouch cutaway (see inside). Faces +z, feet on y = 0. Height ≈ 1.6 at evo 1, 0.35 at evo 0.
import * as THREE from "three";
import { lerp } from "../lib/lowpoly";

const ANC = new THREE.Color("#6e6253");
const RED = new THREE.Color("#b8653c");
const BELLY_A = new THREE.Color("#a99c86");
const BELLY_R = new THREE.Color("#e2c4a2");

const Seg: React.FC<{ a: THREE.Vector3; b: THREE.Vector3; r: number; color: THREE.Color | string; r2?: number }> = ({ a, b, r, color, r2 }) => {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[r2 ?? r * 0.8, r, a.distanceTo(b), 6]} />
      <meshStandardMaterial color={color} flatShading roughness={0.8} />
    </mesh>
  );
};

export const Kangaroo: React.FC<{ t: number; evo?: number; hop?: number; hopAmt?: number; spring?: number; pouch?: number;
  cut?: number; color?: string }> = ({ t, evo = 1, hop = 0, hopAmt = 0, spring = 0, pouch = 0, cut = 0, color }) => {
  const e = evo;
  const col = color ? new THREE.Color(color) : ANC.clone().lerp(RED, e);
  const belly = BELLY_A.clone().lerp(BELLY_R, e);
  const S = lerp(0.32, 1, e); // overall size
  // hop: crouch on the ground, extend in the air
  const air = Math.max(0, Math.sin(hop)) * hopAmt;
  const crouch = Math.max(0, -Math.sin(hop)) * hopAmt;
  const pitch = lerp(Math.PI / 2 - 0.15, 0.55, e) - air * 0.35; // body angle from vertical (0 = upright)
  const lift = air * 0.45 * S;
  const hipH = lerp(0.12, 0.62, e) * (1 - crouch * 0.25);
  // torso: from hip upward along pitch
  const hip = new THREE.Vector3(0, hipH + lift, 0);
  const dir = new THREE.Vector3(0, Math.cos(pitch), Math.sin(pitch));
  const torsoLen = lerp(0.24, 0.62, e);
  const chest = hip.clone().addScaledVector(dir, torsoLen);
  const neck = chest.clone().addScaledVector(dir, lerp(0.02, 0.08, e)).add(new THREE.Vector3(0, 0.01, 0.02));
  const headPos = neck.clone().add(new THREE.Vector3(0, lerp(0.03, 0.1, e), lerp(0.05, 0.05, e)));
  const breathe = 1 + Math.sin(t * 2) * 0.015;
  // hind legs: thigh, shin, long foot
  const leg = (side: number) => {
    const h = hip.clone().add(new THREE.Vector3(side * lerp(0.07, 0.15, e), -0.02, -0.02));
    const fold = lerp(0.9, 1.0, crouch) - air * 0.4;
    const knee = h.clone().add(new THREE.Vector3(side * 0.02, -lerp(0.06, 0.24, e) * fold, lerp(0.05, 0.22, e) * fold));
    const ankle = new THREE.Vector3(knee.x, lerp(0.03, 0.12, e) + lift * 0.7, knee.z - lerp(0.06, 0.3, e) * (1 - air * 0.3));
    const toe = ankle.clone().add(new THREE.Vector3(0, -lerp(0.02, 0.1, e) + lift * 0.1, lerp(0.07, 0.42, e)));
    toe.y = Math.max(0.015, toe.y);
    return (
      <group key={side}>
        <Seg a={h} b={knee} r={lerp(0.035, 0.13, e)} r2={lerp(0.03, 0.08, e)} color={col} />
        <Seg a={knee} b={ankle} r={lerp(0.025, 0.06, e)} color={col} />
        <Seg a={ankle} b={toe} r={lerp(0.02, 0.05, e)} r2={lerp(0.015, 0.03, e)} color={col.clone().multiplyScalar(0.75)} />
        {spring > 0 && (
          // the Achilles tendon: a glowing spring behind the shin
          <Seg a={knee.clone().add(new THREE.Vector3(0, 0.02, -0.07))} b={ankle.clone().add(new THREE.Vector3(0, 0.02, -0.05))}
            r={0.022} color={new THREE.Color("#ffd34d").multiplyScalar(0.6 + 0.8 * spring * (0.6 + 0.4 * Math.sin(t * 12)))} />
        )}
      </group>
    );
  };
  // front legs: on the ground for the ancestor, tiny arms for the kangaroo
  const arm = (side: number) => {
    const sh = chest.clone().add(new THREE.Vector3(side * lerp(0.06, 0.12, e), -0.04, 0.03));
    const hand = e < 0.5
      ? new THREE.Vector3(sh.x, 0.02 + lift, sh.z + 0.02 + Math.sin(t * 6 + side) * 0.02 * hopAmt)
      : sh.clone().add(new THREE.Vector3(side * 0.02, -lerp(0.12, 0.26, e), lerp(0.04, 0.12, e)));
    return <Seg key={side} a={sh} b={hand} r={lerp(0.022, 0.04, e)} color={col} />;
  };
  // tail: thick, curving down behind to the ground
  const tailPts = [0, 0.33, 0.66, 1].map((u) => hip.clone().add(new THREE.Vector3(
    Math.sin(t * 1.5) * 0.03 * u, -lerp(0.0, hipH - 0.04 + lift, Math.pow(u, 0.8)) * lerp(0.7, 1, e) - air * 0.05 * u,
    -lerp(0.42, 0.95, e) * u)));
  return (
    <group scale={1}>
      {/* torso */}
      <mesh position={hip.clone().add(chest).multiplyScalar(0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)}
        scale={[lerp(0.12, 0.25, e) * breathe, torsoLen * 0.62, lerp(0.11, 0.22, e) * breathe]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={col} flatShading roughness={0.8} />
      </mesh>
      {/* belly (lighter) */}
      <mesh position={hip.clone().add(chest).multiplyScalar(0.5).add(dir.clone().multiplyScalar(-0.02)).add(new THREE.Vector3(0, -0.02, lerp(0.02, 0.1, e)))}
        quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)}
        scale={[lerp(0.09, 0.19, e), torsoLen * 0.55, lerp(0.06, 0.14, e)]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={belly} flatShading roughness={0.8} />
      </mesh>
      {/* pouch opening */}
      {pouch > 0 && (
        <mesh position={hip.clone().addScaledVector(dir, torsoLen * 0.35).add(new THREE.Vector3(0, 0, lerp(0.1, 0.24, e)))}
          rotation={[pitch - Math.PI / 2 + 0.3, 0, 0]} scale={[0.12 * pouch, 0.012, 0.05 * pouch]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#5a2f1c" flatShading />
        </mesh>
      )}
      {cut > 0 && (
        // pouch cutaway: dark warm cavity on the belly where the joey grows
        <mesh position={hip.clone().addScaledVector(dir, torsoLen * 0.22).add(new THREE.Vector3(0, 0, 0.17))} scale={[0.14 * cut, 0.16 * cut, 0.06 * cut]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#3a1c12" emissive="#ff6a3a" emissiveIntensity={0.25} flatShading />
        </mesh>
      )}
      {/* neck */}
      <Seg a={chest.clone().addScaledVector(dir, -0.04)} b={headPos} r={lerp(0.07, 0.1, e)} r2={lerp(0.06, 0.08, e)} color={col} />
      {/* head + snout + ears + eyes */}
      <group position={headPos} rotation={[lerp(0.1, -0.2, e) + air * 0.2, 0, 0]}>
        <mesh scale={[lerp(0.075, 0.11, e), lerp(0.07, 0.1, e), lerp(0.09, 0.12, e)]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={col} flatShading />
        </mesh>
        <mesh position={[0, -0.02, lerp(0.08, 0.13, e)]} scale={[lerp(0.035, 0.055, e), lerp(0.035, 0.05, e), lerp(0.05, 0.09, e)]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={col.clone().multiplyScalar(0.9)} flatShading />
        </mesh>
        <mesh position={[0, -0.02, lerp(0.13, 0.22, e)]} scale={0.018 * S}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#1a1210" />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * lerp(0.05, 0.06, e), lerp(0.06, 0.13, e), lerp(-0.01, -0.03, e)]} rotation={[-0.2, 0, s * lerp(0.4, 0.2, e)]}
              scale={[lerp(0.03, 0.04, e), lerp(0.035, 0.11, e), 0.015]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={col.clone().multiplyScalar(0.85)} flatShading />
            </mesh>
            <mesh position={[s * lerp(0.05, 0.075, e), 0.02, lerp(0.05, 0.06, e)]} scale={lerp(0.016, 0.018, e)}>
              <icosahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#120c08" />
            </mesh>
          </group>
        ))}
      </group>
      {[-1, 1].map((s) => leg(s))}
      {[-1, 1].map((s) => arm(s))}
      {tailPts.slice(1).map((p, i) => (
        <Seg key={i} a={tailPts[i]} b={p} r={lerp(0.05, 0.11, e) * (1 - i * 0.28)} r2={lerp(0.04, 0.09, e) * (1 - (i + 1) * 0.28)} color={col} />
      ))}
    </group>
  );
};

// Newborn joey: pink, jellybean-sized, tiny front arms for crawling (hind legs are just buds)
export const Joey: React.FC<{ t: number; crawl?: number }> = ({ t, crawl = 0 }) => {
  const a = Math.sin(t * 10) * 0.5 * crawl;
  return (
    <group>
      <mesh scale={[0.5, 0.42, 1]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#f2a7a0" emissive="#e07a70" emissiveIntensity={0.15} flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.4, -0.1, 0.55]} rotation={[0.6 + (s > 0 ? a : -a), 0, s * 0.5]} scale={[0.1, 0.35, 0.1]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#eaa098" flatShading />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.18, 0.12, 0.85]} scale={0.06}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#5a2a2a" />
        </mesh>
      ))}
    </group>
  );
};

// A real jellybean, for scale
export const Jellybean: React.FC<{ color?: string }> = ({ color = "#ff4fa0" }) => (
  <mesh scale={[0.45, 0.4, 1]} rotation={[0, 0, 0.15]}>
    <capsuleGeometry args={[0.8, 0.5, 3, 8]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.2} flatShading />
  </mesh>
);
