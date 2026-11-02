// Low-poly hedgehog family (owner 2026-11-02, "where did the spikes come from").
// kind: "hedgehog" (European hedgehog: brown face, banded spines cream/dark, short legs) · "ancestor" (furry,
// shrew-like insect-eater, longer snout + thin tail) · "moonrat" (gymnure: black body, white head, naked tail, fur)
// · "echidna" (yellow spines with dark tips, long tube snout, no ears) · "porcupine" (bigger, long black/white quills).
// evo: 0 = soft fur … 1 = full spines (hedgehog morph) · curl: 0 = walking … 1 = rolled into a spiky ball
// walk: gait amount · sniff: nose wiggle · xray: show the ring (orbicularis) muscle glowing under the skin.
// Faces +z, feet on y = 0. Hedgehog body length ≈ 0.55.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clamp01, facet, lerp, rng } from "../lib/lowpoly";

export type HogKind = "hedgehog" | "ancestor" | "moonrat" | "echidna" | "porcupine";

type Look = { fur: string; face: string; tipA: string; tipB: string; base: string; len: [number, number]; size: number;
  snout: number; tail: number; ears: boolean; spiny: boolean; cover: number };

const LOOKS: Record<HogKind, Look> = {
  hedgehog: { fur: "#7a5a3c", face: "#8c6a48", tipA: "#efe2c4", tipB: "#3b2a1e", base: "#6b4e34", len: [0.03, 0.075], size: 1,
    snout: 1, tail: 0, ears: true, spiny: true, cover: -0.18 },
  ancestor: { fur: "#6b5a48", face: "#7d6a55", tipA: "#7d6a55", tipB: "#5a4a3a", base: "#5e4e3e", len: [0.03, 0.03], size: 0.9,
    snout: 1.35, tail: 1, ears: true, spiny: false, cover: -0.3 },
  moonrat: { fur: "#2a2522", face: "#e9e4da", tipA: "#3a3330", tipB: "#d8d2c6", base: "#2a2522", len: [0.03, 0.03], size: 1.15,
    snout: 1.45, tail: 1, ears: true, spiny: false, cover: -0.3 },
  echidna: { fur: "#4a3626", face: "#4a3626", tipA: "#e8d27a", tipB: "#1e1612", base: "#e2c86a", len: [0.07, 0.15], size: 1.35,
    snout: 1.9, tail: 0, ears: false, spiny: true, cover: -0.25 },
  porcupine: { fur: "#2a2420", face: "#3a322c", tipA: "#f2efe6", tipB: "#1c1714", base: "#1c1714", len: [0.12, 0.34], size: 1.7,
    snout: 0.9, tail: 0, ears: true, spiny: true, cover: -0.1 },
};

const N = 900;
// fixed directions on the unit sphere (fibonacci) + per-spine random jitter
const DIRS = (() => {
  const r = rng(7);
  const out: { d: THREE.Vector3; j: number; c: number }[] = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    out.push({ d: new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad), j: r(), c: r() });
  }
  return out;
})();

export const Hedgehog: React.FC<{ t: number; kind?: HogKind; evo?: number; curl?: number; walk?: number; sniff?: number;
  xray?: number; spikeColor?: string }> = ({ t, kind = "hedgehog", evo, curl = 0, walk = 0, sniff = 0, xray = 0 }) => {
  const L = LOOKS[kind];
  const e = evo ?? (L.spiny ? 1 : 0);
  const S = L.size;
  const c = clamp01(curl);
  // body ellipsoid → sphere when curled
  const slim = L.spiny ? 1 : 0.8;
  const bs = new THREE.Vector3(lerp(0.17 * slim, 0.2, c), lerp(0.14 * slim, 0.2, c), lerp(0.27, 0.2, c)).multiplyScalar(S);
  const bodyY = lerp(0.13, 0.2, c) * S;
  const ph = t * 10 * walk;
  const bob = Math.abs(Math.sin(ph)) * 0.012 * walk * S;

  const spikes = useRef<THREE.InstancedMesh>(null);
  const baseCol = L.spiny && e > 0.5 ? L.base : L.fur;
  const furGeo = useMemo(() => {
    const g = facet(new THREE.IcosahedronGeometry(1, 2), 0.05, 3);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const cols = new Float32Array(pos.count * 3);
    const r = rng(9);
    const a = new THREE.Color(baseCol), b = new THREE.Color(kind === "moonrat" ? "#d8d2c6" : L.tipA), cc = new THREE.Color();
    for (let i = 0; i < pos.count; i += 3) {
      cc.copy(a).lerp(b, kind === "moonrat" ? (pos.getY(i) > 0.3 && pos.getZ(i) > 0.2 ? 0.9 : r() * 0.25) : r() * 0.35);
      cc.multiplyScalar(0.85 + r() * 0.25);
      for (let q = 0; q < 3; q++) cc.toArray(cols, (i + q) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    return g;
  }, [baseCol, kind]);
  const geo = useMemo(() => new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.7 }), []);
  useLayoutEffect(() => {
    const m = spikes.current;
    if (!m) return;
    const tmp = new THREE.Object3D();
    const col = new THREE.Color();
    const tipA = new THREE.Color(L.tipA), tipB = new THREE.Color(L.tipB), fur = new THREE.Color(L.fur);
    const up = new THREE.Vector3(0, 1, 0);
    // spines get longer + thinner with evo; fur = short stubby tufts
    const len = (L.spiny ? lerp(0.004, L.len[1], e) : 0) * S;
    const thick = lerp(0.03, L.spiny ? 0.009 : 0.03, L.spiny ? e : 0) * S;
    DIRS.forEach(({ d, j, c: cr }, i) => {
      // coverage: back + sides; the face/belly stay bare (all round when curled)
      const face = d.z > 0.62 && d.y < 0.55;
      const vis = !L.spiny ? 0 : c > 0.5 ? 1 : d.y > L.cover && !face ? 1 : 0;
      const p = new THREE.Vector3(d.x * bs.x, d.y * bs.y, d.z * bs.z);
      // normal of the ellipsoid, swept backwards (spines lie flat when relaxed, stand up when curled)
      const n = new THREE.Vector3(d.x / bs.x, d.y / bs.y, d.z / bs.z).normalize();
      const sweep = lerp(L.spiny ? lerp(2.2, 1.1, e) : 2.2, 0.15, c);
      n.add(new THREE.Vector3(0, 0, -sweep)).normalize();
      tmp.position.copy(p);
      tmp.quaternion.setFromUnitVectors(up, n);
      const l = len * (0.75 + j * 0.5) * vis;
      tmp.scale.set(thick * vis, l, thick * vis);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      if (L.spiny) col.copy(cr < 0.5 ? tipA : tipB).lerp(fur, 1 - e);
      else col.copy(cr < 0.6 ? tipA : tipB);
      m.setColorAt(i, col);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  const headK = 1 - c; // head + legs tuck inside when curled
  const snoutL = 0.12 * L.snout * S;
  const nose = Math.sin(t * 18) * 0.008 * sniff * S;
  return (
    <group position={[0, bodyY + bob, 0]}>
      {/* body */}
      <mesh geometry={furGeo} scale={bs.toArray()}>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
      <instancedMesh ref={spikes} args={[geo, mat, N]} />
      {/* x-ray: the ring muscle along the edge of the spiny coat, tightening like a drawstring */}
      {xray > 0 && (
        <mesh renderOrder={10} position={[0, -0.02 * S, 0]} rotation={[Math.PI / 2 + 0.15, 0, 0]} scale={[bs.x * 1.02 * (1 - c * 0.55), bs.z * 1.02 * (1 - c * 0.55), bs.x * 0.5]}>
          <torusGeometry args={[1, 0.16, 6, 28]} />
          <meshBasicMaterial color="#ff4a5a" transparent opacity={xray} depthTest={false} />
        </mesh>
      )}
      {headK > 0.02 && (
        <group scale={headK} position={[0, -0.02 * S, 0]}>
          {/* head */}
          <group position={[0, 0.0, bs.z * 0.92]} rotation={[0.25 + Math.sin(t * 2) * 0.05, Math.sin(t * 1.3) * 0.12 * sniff, 0]}>
            <mesh scale={[0.1 * S, 0.09 * S, 0.1 * S]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color={L.face} flatShading />
            </mesh>
            {/* snout (cone pointing forward) */}
            <mesh position={[0, -0.02 * S, 0.06 * S + snoutL / 2]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[(kind === "echidna" ? 0.016 : kind === "porcupine" ? 0.035 : 0.014) * S, (kind === "echidna" ? 0.026 : 0.05) * S, snoutL, 6]} />
              <meshStandardMaterial color={L.face} flatShading />
            </mesh>
            {/* nose tip */}
            <mesh position={[nose, -0.02 * S, 0.06 * S + snoutL]} scale={(kind === "porcupine" ? 0.03 : 0.018) * S}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#120c0a" roughness={0.3} />
            </mesh>
            {/* eyes */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.055 * S, 0.025 * S, 0.065 * S]} scale={0.016 * S}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial color="#050303" roughness={0.2} />
              </mesh>
            ))}
            {/* small round ears */}
            {L.ears &&
              [-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.07 * S, 0.07 * S, -0.01 * S]} rotation={[0, 0, -s * 0.4]} scale={[0.03 * S, 0.035 * S, 0.015 * S]}>
                  <icosahedronGeometry args={[1, 1]} />
                  <meshStandardMaterial color={kind === "moonrat" ? "#cfc8bb" : "#5a4230"} flatShading />
                </mesh>
              ))}
            {/* moonrat white head blaze */}
            {kind === "moonrat" && (
              <mesh position={[0, 0.03 * S, -0.03 * S]} scale={[0.09 * S, 0.08 * S, 0.12 * S]}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial color="#e9e4da" flatShading />
              </mesh>
            )}
          </group>
          {/* short legs */}
          {[[1, 0.13, 0], [-1, 0.13, Math.PI], [1, -0.13, Math.PI], [-1, -0.13, 0]].map(([s, z, off], i) => {
            const sw = Math.sin(ph + off) * 0.5 * walk;
            return (
              <group key={i} position={[s * bs.x * 0.6, -bs.y * 0.55, z * S * 1.1]} rotation={[sw, 0, 0]}>
                <mesh position={[0, -0.04 * S, 0]} scale={[0.028 * S, 0.06 * S, 0.03 * S]}>
                  <icosahedronGeometry args={[1, 0]} />
                  <meshStandardMaterial color={kind === "moonrat" ? "#3a3330" : L.face} flatShading />
                </mesh>
                <mesh position={[0, -0.085 * S, 0.015 * S]} scale={[0.026 * S, 0.012 * S, 0.04 * S]}>
                  <icosahedronGeometry args={[1, 0]} />
                  <meshStandardMaterial color="#d8b8a0" flatShading />
                </mesh>
              </group>
            );
          })}
          {/* thin tail (ancestor / moonrat) */}
          {L.tail > 0 && (
            <mesh position={[0, -0.02 * S, -bs.z - 0.14 * S]} rotation={[-Math.PI / 2 + 0.25, Math.sin(t * 3) * 0.2, 0]}>
              <cylinderGeometry args={[0.004 * S, 0.014 * S, 0.26 * S, 5]} />
              <meshStandardMaterial color={kind === "moonrat" ? "#c9b8a8" : "#8a7562"} flatShading />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
};

// a beetle (prey / scale reference)
export const Beetle: React.FC<{ t: number; color?: string }> = ({ t, color = "#2a3a2a" }) => (
  <group rotation={[0, Math.sin(t * 2) * 0.3, 0]}>
    <mesh scale={[0.025, 0.015, 0.035]} position={[0, 0.015, 0]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color={color} flatShading metalness={0.4} roughness={0.3} />
    </mesh>
    <mesh scale={0.012} position={[0, 0.012, 0.036]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#111" flatShading />
    </mesh>
  </group>
);

// a human fingertip with its nail (scale reference for "hair is keratin, like your nails"); points along -x
export const Finger: React.FC<{ glow?: number }> = ({ glow = 0 }) => (
  <group>
    <mesh rotation={[0, 0, Math.PI / 2]} position={[0.25, 0, 0]}>
      <cylinderGeometry args={[0.075, 0.08, 0.5, 8]} />
      <meshStandardMaterial color="#e2a98a" flatShading />
    </mesh>
    <mesh position={[0, 0, 0]} scale={[0.09, 0.075, 0.075]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#e2a98a" flatShading />
    </mesh>
    {/* nail on top of the tip */}
    <mesh position={[0.03, 0.068, 0]} rotation={[0, 0, 0.12]} scale={[0.1, 0.014, 0.062]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#f7dcd2" emissive="#7dd6ff" emissiveIntensity={glow * 0.6} flatShading roughness={0.3} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} position={[0.36, 0.0, 0]} scale={[1, 1, 1]}>
      <torusGeometry args={[0.078, 0.008, 4, 10]} />
      <meshStandardMaterial color="#c98f72" flatShading />
    </mesh>
  </group>
);
