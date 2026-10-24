// Low-poly big cats from one rig. kind sets size, build, colours and coat pattern:
// tiger (orange, black stripes) · leopard (golden, small rosettes) · jaguar (stockier, big head, rosettes with a dot
// inside) · puma (plain tan, long tail, small head) · cheetah (tall thin legs, solid spots, tear lines) · ancestor
// (grey-tawny, faint spots) · cub = small ancestor-like kitten with a tint.
// walk: gait speed (0 = standing) · roar: jaw open 0..1 · look: head yaw · crouch: 0..1 · Faces +z, feet on y = 0.
import { useMemo } from "react";
import * as THREE from "three";
import { lerp, rng } from "../lib/lowpoly";

export type CatKind = "tiger" | "leopard" | "jaguar" | "puma" | "cheetah" | "ancestor";

type Spec = { L: number; H: number; w: number; head: number; leg: number; tail: number; coat: string; belly: string;
  mark: string; pattern: "stripes" | "rosettes" | "jaguar" | "spots" | "faint" | "none" };

const SPECS: Record<CatKind, Spec> = {
  tiger: { L: 1.75, H: 0.95, w: 0.3, head: 0.24, leg: 0.11, tail: 0.9, coat: "#de8530", belly: "#f3e6cc", mark: "#1b1410", pattern: "stripes" },
  leopard: { L: 1.3, H: 0.7, w: 0.21, head: 0.17, leg: 0.075, tail: 0.85, coat: "#d9b45e", belly: "#f1e4c4", mark: "#2a1d10", pattern: "rosettes" },
  jaguar: { L: 1.38, H: 0.72, w: 0.26, head: 0.21, leg: 0.095, tail: 0.6, coat: "#d4a24c", belly: "#f1e1bd", mark: "#1f150b", pattern: "jaguar" },
  puma: { L: 1.42, H: 0.74, w: 0.2, head: 0.15, leg: 0.08, tail: 0.95, coat: "#b88d5f", belly: "#ecdcc4", mark: "#3a2a1c", pattern: "none" },
  cheetah: { L: 1.3, H: 0.82, w: 0.17, head: 0.13, leg: 0.06, tail: 0.85, coat: "#dcb56a", belly: "#f3e8cc", mark: "#1a120a", pattern: "spots" },
  ancestor: { L: 1.25, H: 0.68, w: 0.21, head: 0.17, leg: 0.08, tail: 0.8, coat: "#a8875e", belly: "#e2d3b8", mark: "#5a4630", pattern: "faint" },
};

const Seg: React.FC<{ a: THREE.Vector3; b: THREE.Vector3; r: number; r2?: number; color: string }> = ({ a, b, r, r2, color }) => {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[r2 ?? r, r, a.distanceTo(b), 6]} />
      <meshStandardMaterial color={color} flatShading roughness={0.85} />
    </mesh>
  );
};

const Y = new THREE.Vector3(0, 1, 0);

// coat marks on the torso ellipsoid (radii a, b, c), in torso-local space
const Marks: React.FC<{ spec: Spec; a: number; b: number; c: number; seed: number }> = ({ spec, a, b, c, seed }) => {
  const items = useMemo(() => {
    const r = rng(seed);
    const out: { p: THREE.Vector3; q: THREE.Quaternion; s: number }[] = [];
    const n = spec.pattern === "faint" ? 18 : spec.pattern === "spots" ? 80 : 60;
    for (let i = 0; i < n * 3 && out.length < n; i++) {
      const u = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
      if (u.length() > 1 || u.length() < 0.2) continue;
      u.normalize();
      if (u.y < -0.35) continue; // keep the belly plain
      const p = new THREE.Vector3(u.x * a, u.y * b, u.z * c);
      const nrm = new THREE.Vector3(p.x / (a * a), p.y / (b * b), p.z / (c * c)).normalize();
      out.push({ p: p.addScaledVector(nrm, 0.004), q: new THREE.Quaternion().setFromUnitVectors(Y, nrm), s: 0.6 + r() * 0.5 });
    }
    return out;
  }, [spec, a, b, c, seed]);
  if (spec.pattern === "none") return null;
  if (spec.pattern === "stripes") {
    return (
      <>
        {Array.from({ length: 11 }, (_, i) => {
          const z = lerp(-c * 0.85, c * 0.7, i / 10);
          const k = Math.sqrt(Math.max(0, 1 - (z / c) ** 2));
          return (
            <mesh key={i} position={[0, 0, z]} rotation={[0, 0, Math.PI * 0.08 * (i % 2 ? 1 : -1)]} scale={[a * k * 1.02, b * k * 1.02, 1]}>
              <torusGeometry args={[1, 0.055, 3, 14, Math.PI * 1.15]} />
              <meshStandardMaterial color={spec.mark} flatShading />
            </mesh>
          );
        })}
      </>
    );
  }
  const sz = spec.pattern === "spots" ? 0.022 : spec.pattern === "faint" ? 0.03 : 0.04;
  return (
    <>
      {items.map((it, i) => (
        <group key={i} position={it.p} quaternion={it.q} scale={it.s}>
          {spec.pattern === "rosettes" || spec.pattern === "jaguar" ? (
            <>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[sz, sz * 0.32, 3, 7]} />
                <meshStandardMaterial color={spec.mark} flatShading />
              </mesh>
              {spec.pattern === "jaguar" && (
                <mesh scale={[sz * 0.35, 0.004, sz * 0.35]}>
                  <icosahedronGeometry args={[1, 0]} />
                  <meshStandardMaterial color={spec.mark} />
                </mesh>
              )}
            </>
          ) : (
            <mesh scale={[sz, 0.004, sz]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={spec.mark} transparent={spec.pattern === "faint"} opacity={spec.pattern === "faint" ? 0.45 : 1} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
};

export const BigCat: React.FC<{ t: number; kind?: CatKind; walk?: number; roar?: number; look?: number; crouch?: number;
  cub?: boolean; tint?: string; seed?: number }> = ({ t, kind = "tiger", walk = 0, roar = 0, look = 0, crouch = 0, cub = false, tint, seed = 4 }) => {
  const base = SPECS[kind];
  const spec = tint ? { ...base, coat: tint } : base;
  const { L, H, w, head, leg, tail } = spec;
  const legH = H * 0.55 * (1 - crouch * 0.35);
  const a = w, b = H * 0.24, c = L * 0.38;
  const bodyY = legH + b * 0.55;
  const ph = t * 7 * walk;
  const bob = walk > 0 ? Math.abs(Math.sin(ph)) * 0.015 : Math.sin(t * 2) * 0.004;
  const legs: [number, number, number][] = [[1, c * 0.62, 0], [-1, c * 0.62, Math.PI], [1, -c * 0.7, Math.PI], [-1, -c * 0.7, 0]];
  const neck = new THREE.Vector3(0, bodyY + b * 0.5, c * 0.85);
  const headP = new THREE.Vector3(0, bodyY + b * 1.05 - crouch * 0.08, c * 1.2);
  const tailPts = Array.from({ length: 6 }, (_, i) => {
    const u = i / 5;
    return new THREE.Vector3(Math.sin(t * 1.6 + u * 2) * 0.06 * u, bodyY + b * 0.3 - u * tail * 0.55 + u * u * tail * 0.35,
      -c * 0.95 - u * tail * 0.75);
  });
  return (
    <group scale={cub ? 0.45 : 1} position={[0, bob, 0]}>
      {/* torso + chest + hips */}
      <group position={[0, bodyY, 0]}>
        <mesh scale={[a, b, c]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={spec.coat} flatShading roughness={0.85} />
        </mesh>
        <mesh position={[0, -b * 0.35, c * 0.1]} scale={[a * 0.85, b * 0.7, c * 0.8]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={spec.belly} flatShading roughness={0.9} />
        </mesh>
        <mesh position={[0, b * 0.1, c * 0.55]} scale={[a * 1.08, b * 1.15, c * 0.45]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={spec.coat} flatShading roughness={0.85} />
        </mesh>
        <Marks spec={spec} a={a * 1.0} b={b * 1.0} c={c * 1.0} seed={seed} />
      </group>
      {/* legs: upper + lower + paw, swinging when walking */}
      {legs.map(([s, z, off], i) => {
        const sw = Math.sin(ph + off) * 0.45 * walk;
        const hip = new THREE.Vector3(s * a * 0.6, bodyY - b * 0.2, z);
        const knee = hip.clone().add(new THREE.Vector3(0, -legH * 0.5, Math.sin(sw) * legH * 0.3 + (i < 2 ? 0.02 : -0.04)));
        const foot = new THREE.Vector3(hip.x, 0.03, z + Math.sin(sw) * legH * 0.45);
        foot.y += Math.max(0, Math.cos(ph + off)) * 0.06 * walk;
        return (
          <group key={i}>
            <Seg a={hip} b={knee} r={leg * 1.25} r2={leg * 1.45} color={spec.coat} />
            <Seg a={knee} b={foot} r={leg * 0.85} r2={leg * 1.1} color={spec.coat} />
            <mesh position={[foot.x, 0.03, foot.z + 0.03]} scale={[leg * 1.2, leg * 0.6, leg * 1.5]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={spec.belly} flatShading />
            </mesh>
          </group>
        );
      })}
      <Seg a={neck} b={headP.clone().add(new THREE.Vector3(0, -head * 0.3, -head * 0.3))} r={head * 0.85} r2={head * 0.75} color={spec.coat} />
      {/* head */}
      <group position={headP} rotation={[crouch * 0.2, look, 0]}>
        <mesh scale={[head, head * 0.8, head * 1.02]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={spec.coat} flatShading roughness={0.85} />
        </mesh>
        {/* muzzle + nose */}
        <mesh position={[0, -head * 0.3, head * 0.72]} scale={[head * 0.48, head * 0.32, head * 0.4]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={spec.belly} flatShading />
        </mesh>
        <mesh position={[0, -head * 0.08, head * 1.15]} scale={[head * 0.18, head * 0.12, head * 0.1]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={kind === "tiger" || kind === "puma" ? "#c4706a" : "#2a1a14"} flatShading />
        </mesh>
        {/* lower jaw: drops open when roaring */}
        <group position={[0, -head * 0.45, head * 0.35]} rotation={[roar * 0.7, 0, 0]}>
          <mesh position={[0, 0, head * 0.35]} scale={[head * 0.42, head * 0.16, head * 0.42]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={spec.belly} flatShading />
          </mesh>
        </group>
        {roar > 0.05 && (
          <mesh position={[0, -head * 0.5, head * 0.65]} scale={[head * 0.32, head * 0.22 * roar, head * 0.2]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#5a1a1a" />
          </mesh>
        )}
        {/* eyes */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * head * 0.42, head * 0.15, head * 0.78]} scale={[head * 0.13, head * 0.1, head * 0.06]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={kind === "puma" || kind === "ancestor" ? "#c9a64a" : "#e0b030"} roughness={0.2} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`p${s}`} position={[s * head * 0.42, head * 0.15, head * 0.83]} scale={[head * 0.04, head * 0.09, head * 0.03]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#111" />
          </mesh>
        ))}
        {/* cheetah tear lines */}
        {kind === "cheetah" &&
          [-1, 1].map((s) => (
            <mesh key={`t${s}`} position={[s * head * 0.3, -head * 0.15, head * 0.85]} rotation={[0, 0, s * 0.25]} scale={[head * 0.05, head * 0.35, head * 0.03]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#1a120a" />
            </mesh>
          ))}
        {/* ears */}
        {[-1, 1].map((s) => (
          <mesh key={`e${s}`} position={[s * head * 0.58, head * 0.66, -head * 0.2]} rotation={[0, 0, -s * 0.4]} scale={[head * 0.2, head * 0.22, head * 0.08]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={kind === "tiger" ? "#2a1d14" : spec.coat} flatShading />
          </mesh>
        ))}
        {/* tiger face stripes */}
        {kind === "tiger" &&
          [-1, 1].map((s) => (
            <mesh key={`fs${s}`} position={[s * head * 0.7, head * 0.0, head * 0.45]} rotation={[0, s * 0.9, 0.3 * s]} scale={[head * 0.04, head * 0.4, head * 0.04]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={spec.mark} />
            </mesh>
          ))}
      </group>
      {/* tail */}
      {tailPts.slice(1).map((p, i) => (
        <Seg key={`tl${i}`} a={tailPts[i]} b={p} r={leg * 0.55 * (1 - i * 0.08)} r2={leg * 0.5 * (1 - (i + 1) * 0.08)}
          color={kind === "tiger" && i % 2 ? spec.mark : i === 4 && kind !== "cheetah" ? (kind === "puma" ? "#3a2a1c" : spec.coat) : spec.coat} />
      ))}
    </group>
  );
};

// river turtle for the jaguar bite: domed shell that splits into pieces as `crack` goes 0 → 1
export const Turtle: React.FC<{ t: number; crack?: number }> = ({ t, crack = 0 }) => (
  <group>
    {Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      const out = crack * 0.08;
      return (
        <mesh key={i} position={[Math.cos(a + 0.5) * out, 0.03 + crack * 0.06 * (i % 2), -Math.sin(a + 0.5) * out]} rotation={[0, 0, 0]}>
          <sphereGeometry args={[0.2, 3, 3, a, Math.PI / 3 - 0.03, 0, Math.PI / 2]} />
          <meshStandardMaterial color={i % 2 ? "#5c6a38" : "#4c5a2e"} flatShading side={THREE.DoubleSide} />
        </mesh>
      );
    })}
    <mesh position={[0, 0.05, 0.24]} scale={[0.06, 0.05, 0.08]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#7a7f4a" flatShading />
    </mesh>
    {[[0.15, 0.13], [-0.15, 0.13], [0.15, -0.13], [-0.15, -0.13]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.02, z + Math.sin(t * 6 + i) * 0.01]} scale={[0.05, 0.02, 0.04]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#7a7f4a" flatShading />
      </mesh>
    ))}
  </group>
);
