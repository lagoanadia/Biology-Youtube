// Low-poly Komodo dragon (Varanus komodoensis): long heavy body on a curved spine, thick tail, sprawling legs with claws,
// flat head with a yellow forked tongue. `baby` = hatchling colours (green-grey with yellow bands and speckles).
// walk: walk cycle 0..1 · tongue: flick amount · lift: head raised. Faces +z, feet on y = 0.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { lerp, rng } from "../lib/lowpoly";

const ADULT = new THREE.Color("#7a6e5c");
const ADULT_DARK = new THREE.Color("#4d4438");
const BELLY = new THREE.Color("#9a8c74");
const BABY = new THREE.Color("#4f5f3a");
const BABY_BAND = new THREE.Color("#d9c24a");

// radius of the body along the spine, u = 0 tail tip … 1 snout
const radiusAt = (u: number) => {
  const pts: [number, number][] = [[0, 0.015], [0.3, 0.085], [0.52, 0.2], [0.62, 0.28], [0.74, 0.28], [0.82, 0.19], [0.87, 0.165], [0.93, 0.15], [0.98, 0.075], [1, 0.03]];
  for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) {
    const [u0, r0] = pts[i - 1]; const [u1, r1] = pts[i];
    return lerp(r0, r1, (u - u0) / (u1 - u0));
  }
  return 0.02;
};

// spine: tail tip at z = -2, snout at z = +1.2; lateral S-curve that travels when walking
const spineAt = (u: number, t: number, walk: number, lift: number) => {
  const z = lerp(-2.0, 1.2, u);
  const tailW = Math.pow(1 - u, 1.6);
  const sway = Math.sin(z * 1.7 - t * 4 * walk) * (0.06 + 0.22 * tailW) * (0.35 + walk);
  const y = lerp(0.07, 0.29, Math.min(1, u * 1.75)) + (u > 0.82 ? (u - 0.82) * lift * 1.4 : 0);
  return new THREE.Vector3(sway, y, z);
};

const bodyGeometry = (t: number, walk: number, lift: number, baby: boolean, seed: number) => {
  const segs = 40;
  const radial = 7;
  const ring: THREE.Vector3[][] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const c = spineAt(u, t, walk, lift);
    const n = spineAt(Math.min(1, u + 0.01), t, walk, lift).sub(spineAt(Math.max(0, u - 0.01), t, walk, lift)).normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(n).normalize();
    const up = n.clone().cross(side).normalize();
    const r = radiusAt(u);
    ring.push(Array.from({ length: radial }, (_, k) => {
      const a = (k / radial) * Math.PI * 2;
      // flattened, wider than tall (lizard cross-section)
      return c.clone().addScaledVector(side, Math.cos(a) * r * 1.15).addScaledVector(up, Math.sin(a) * r * 0.75);
    }));
  }
  const pos: number[] = [];
  const col: number[] = [];
  const rr = rng(seed);
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, u: number, k: number) => {
    pos.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    const belly = Math.sin((k / radial) * Math.PI * 2) < -0.4;
    let cc: THREE.Color;
    if (baby) {
      const band = Math.sin(u * 46) > 0.55 || rr() < 0.08;
      cc = band ? BABY_BAND.clone() : BABY.clone();
    } else {
      cc = (rr() < 0.3 ? ADULT_DARK : ADULT).clone();
    }
    if (belly) cc.lerp(BELLY, baby ? 0.3 : 0.6);
    cc.offsetHSL(0, 0, (rr() - 0.5) * 0.06);
    for (let j = 0; j < 3; j++) col.push(cc.r, cc.g, cc.b);
  };
  for (let i = 0; i < segs; i++) for (let k = 0; k < radial; k++) {
    const a = ring[i][k], b = ring[i][(k + 1) % radial], c = ring[i + 1][k], d = ring[i + 1][(k + 1) % radial];
    tri(a, c, b, i / segs, k);
    tri(b, c, d, i / segs, k);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
};

const Leg: React.FC<{ at: THREE.Vector3; side: number; phase: number; color: THREE.Color; front: boolean }> = ({ at, side, phase, color, front }) => {
  const lift = Math.max(0, Math.sin(phase)) * 0.08;
  const swing = Math.cos(phase) * 0.12;
  const hip = at.clone().add(new THREE.Vector3(side * 0.24, -0.04, 0));
  const knee = hip.clone().add(new THREE.Vector3(side * 0.2, 0.01 + lift, swing * 0.5));
  const foot = new THREE.Vector3(knee.x + side * 0.06, 0.03 + lift * 0.6, knee.z + swing + (front ? 0.06 : -0.06));
  const seg = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return (
      <mesh position={mid} quaternion={q}>
        <cylinderGeometry args={[r * 0.8, r, a.distanceTo(b), 5]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    );
  };
  return (
    <group>
      {seg(hip, knee, 0.095)}
      {seg(knee, foot, 0.075)}
      {/* foot + 4 claws */}
      <mesh position={foot} scale={[0.09, 0.035, 0.11]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {[-1.5, -0.5, 0.5, 1.5].map((c) => (
        <mesh key={c} position={[foot.x + c * 0.04, 0.015, foot.z + 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.013, 0.07, 3]} />
          <meshStandardMaterial color="#e9e1cf" flatShading />
        </mesh>
      ))}
    </group>
  );
};

export const Komodo: React.FC<{ t: number; walk?: number; tongue?: number; lift?: number; baby?: boolean; seed?: number }> = ({
  t, walk = 0, tongue = 0.5, lift = 0, baby = false, seed = 4,
}) => {
  // rebuild the body each frame (the spine moves); round t so stills are deterministic
  const body = useMemo(() => bodyGeometry(t, walk, lift, baby, seed), [t, walk, lift, baby, seed]);
  useEffect(() => () => body.dispose(), [body]);
  const legColor = baby ? BABY : ADULT_DARK;
  const head = spineAt(0.93, t, walk, lift);
  const snout = spineAt(1, t, walk, lift);
  const dir = snout.clone().sub(head).normalize();
  const flick = tongue * Math.max(0, Math.sin(t * 7)) ** 2;
  const tongueQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  const ph = t * 4 * walk * 2;
  return (
    <group>
      <mesh geometry={body}>
        <meshStandardMaterial vertexColors flatShading roughness={0.85} />
      </mesh>
      {/* eyes */}
      {[-1, 1].map((s) => {
        const e = spineAt(0.935, t, walk, lift).add(new THREE.Vector3(s * 0.13, 0.06, 0));
        return (
          <mesh key={s} position={e} scale={0.022}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={baby ? "#2a1a08" : "#1b140d"} />
          </mesh>
        );
      })}
      {/* forked yellow tongue */}
      {flick > 0.05 && (
        <group position={snout} quaternion={tongueQ}>
          <mesh position={[0, -0.01, 0.08 * flick]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.009, 0.009, 0.16 * flick, 3]} />
            <meshStandardMaterial color="#e7c83a" emissive="#7a5a00" emissiveIntensity={0.3} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.015 * flick, -0.01, 0.18 * flick]} rotation={[Math.PI / 2, 0, -s * 0.5]}>
              <cylinderGeometry args={[0.006, 0.003, 0.05 * flick, 3]} />
              <meshStandardMaterial color="#e7c83a" />
            </mesh>
          ))}
        </group>
      )}
      {[0.79, 0.6].map((u, i) =>
        [-1, 1].map((s) => (
          <Leg key={`${i}${s}`} at={spineAt(u, t, walk, lift)} side={s} front={i === 0}
            phase={ph + (i === 0 ? 0 : Math.PI) + (s > 0 ? Math.PI : 0)} color={legColor} />
        )),
      )}
    </group>
  );
};

// Leathery egg; crack 0..1 opens the top shell, empty hides the baby slot.
export const DragonEgg: React.FC<{ crack?: number; wobble?: number; t?: number }> = ({ crack = 0, wobble = 0, t = 0 }) => {
  const shell = "#efe6cf";
  const w = Math.sin(t * 18) * 0.12 * wobble;
  return (
    <group rotation={[0, 0, w]}>
      <mesh position={[0, 0.11, 0]} scale={[0.1, 0.13 * (crack > 0 ? 0.62 : 1), 0.1]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={shell} flatShading roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {crack > 0 && (
        <mesh position={[0.05 * crack, 0.2 + 0.08 * crack, -0.02]} rotation={[0.3 * crack, 0, -1.4 * crack]} scale={[0.1, 0.06, 0.1]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={shell} flatShading side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// X-shaped chromosome (two crossed capsules)
export const Chromosome: React.FC<{ color: string; scale?: number }> = ({ color, scale = 1 }) => (
  <group scale={scale}>
    {[0.45, -0.45].map((r) => (
      <mesh key={r} rotation={[0, 0, r]}>
        <capsuleGeometry args={[0.07, 0.42, 3, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} flatShading />
      </mesh>
    ))}
  </group>
);

// DNA double helix of facets
export const Helix: React.FC<{ t: number; color?: string }> = ({ t, color = "#ff8fd0" }) => (
  <group rotation={[0, t * 1.2, 0]}>
    {Array.from({ length: 18 }, (_, i) => {
      const y = (i - 9) * 0.12;
      const a = i * 0.55;
      return (
        <group key={i} position={[0, y, 0]} rotation={[0, a, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.32, 0, 0]} scale={0.06}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={s > 0 ? color : "#9fdcff"} emissive={s > 0 ? color : "#9fdcff"} emissiveIntensity={0.3} flatShading />
            </mesh>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.6, 3]} />
            <meshStandardMaterial color="#e8f0ff" />
          </mesh>
        </group>
      );
    })}
  </group>
);
