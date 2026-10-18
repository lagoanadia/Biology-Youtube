// Giant Apolemia siphonophore (Ningaloo Canyons, 2020) coiled in its flat spiral feeding posture: swimming bells at the
// head of a long translucent stem, clusters of polyps (cormidia) all along it, and a curtain of thin stinging tentacles
// hanging below (the "drift net"). Plus a low-poly blue whale for the size comparison.
// coil: 0 = loose wavy string · 1 = tight spiral · trace: 0..1 glowing tracer along the outer ring · glow: tentacles light
// up · reach: tentacle length factor.
import { useMemo } from "react";
import * as THREE from "three";
import { facet, lerp, rng } from "../lib/lowpoly";

const STEM = new THREE.Color("#f3d9c4");
const CORM = new THREE.Color("#ff9a5c");
const BELL = new THREE.Color("#cfefff");
const TENT = new THREE.Color("#ffd9c9");
const N = 140; // cormidia along the stem
const TURNS = 2.6;

// point along the stem (u = 0 head/centre … 1 outer end)
export const siphonPoint = (u: number, coil: number, t: number) => {
  const a = u * TURNS * Math.PI * 2;
  const r = lerp(0.25, 2.0, Math.sqrt(u));
  const spiral = new THREE.Vector3(Math.cos(a) * r, Math.sin(u * 30) * 0.02, Math.sin(a) * r);
  const loose = new THREE.Vector3(lerp(-3, 3, u), Math.sin(u * 9 + t * 0.5) * 0.25, Math.sin(u * 5 + t * 0.4) * 0.6);
  return loose.lerp(spiral, coil);
};

export const GiantSiphon: React.FC<{ t: number; coil?: number; trace?: number; glow?: number; reach?: number }> = ({
  t, coil = 1, trace = 0, glow = 0, reach = 1,
}) => {
  const tent = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: N * 2 }, () => ({ len: 0.25 + r() * 0.55, ph: r() * 6.28 }));
  }, []);
  const cq = Math.round(coil * 30) / 30; // geometry cached per coil step (no per-frame rebuild)
  const tq = coil >= 1 ? 0 : t; // the loose string drifts; the coiled spiral holds still
  const stem = useMemo(() => {
    const pts = Array.from({ length: 220 }, (_, i) => siphonPoint(i / 219, cq, tq));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.018, 4, false);
  }, [cq, tq]);
  const lines = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 2 * 2 * 2 * 3), 3));
    return g;
  }, []);
  // tentacles: one line segment pair each (cheap), swaying slowly
  const seg = (lines.attributes.position as THREE.BufferAttribute).array as Float32Array;
  let k = 0;
  for (let i = 0; i < N; i++) {
    const p = siphonPoint((i + 0.5) / N, cq, tq);
    for (let j = 0; j < 2; j++) {
      const tt = tent[i * 2 + j];
      const L = tt.len * reach;
      const sx = Math.sin(t * 0.7 + tt.ph) * 0.06;
      const pts = [p, p.clone().add(new THREE.Vector3(sx * 0.5, -L * 0.5, j * 0.03)), p.clone().add(new THREE.Vector3(sx, -L, j * 0.05))];
      for (let q = 0; q < 2; q++) {
        pts[q].toArray(seg, k);
        pts[q + 1].toArray(seg, k + 3);
        k += 6;
      }
    }
  }
  (lines.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  void k;
  const tentColor = TENT.clone().lerp(new THREE.Color("#7ff6ff"), glow);
  return (
    <group>
      <mesh geometry={stem}>
        <meshStandardMaterial color={STEM} emissive={STEM} emissiveIntensity={0.25} transparent opacity={0.85} flatShading />
      </mesh>
      {/* swimming bells at the head of the colony (centre of the spiral) */}
      {Array.from({ length: 8 }, (_, i) => {
        const p = siphonPoint(0, cq, tq);
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[p.x + Math.cos(a) * 0.09, p.y + 0.04 + (i % 2) * 0.04, p.z + Math.sin(a) * 0.09]} scale={0.06}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={BELL} transparent opacity={0.7} flatShading />
          </mesh>
        );
      })}
      {/* cormidia: orange polyp clusters along the stem */}
      {Array.from({ length: N }, (_, i) => {
        const p = siphonPoint((i + 0.5) / N, cq, tq);
        return (
          <mesh key={i} position={p.toArray()} scale={0.035 + (i % 3) * 0.008}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={CORM} emissive={CORM} emissiveIntensity={0.3 + glow * 0.5} flatShading />
          </mesh>
        );
      })}
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={tentColor} transparent opacity={0.55 + glow * 0.35} />
      </lineSegments>
      {/* glowing tracer that runs along the outer ring (the 47 m estimate) */}
      {trace > 0 && <Tracer trace={trace} coil={cq} />}
    </group>
  );
};

// glowing tracer along the outer ring; geometry cached per 1/60 step of `trace`
const Tracer: React.FC<{ trace: number; coil: number }> = ({ trace, coil }) => {
  const q = Math.max(1, Math.round(trace * 60)) / 60;
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
    Array.from({ length: 80 }, (_, i) => siphonPoint(lerp(0.62, 0.62 + 0.38 * q, i / 79), coil, 0).add(new THREE.Vector3(0, 0.03, 0)))),
  160, 0.035, 5, false), [q, coil]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color="#ffd34d" />
    </mesh>
  );
};

// Low-poly blue whale: long blue-grey body, small dorsal fin far back, slim flippers, broad flukes.
const WHALE: [number, number][] = [[0, -3], [0.12, -2.7], [0.3, -2], [0.48, -1], [0.55, 0], [0.55, 0.9], [0.5, 1.6], [0.38, 2.2], [0.2, 2.6], [0, 2.75]];
export const BlueWhale: React.FC<{ t: number; swim?: number }> = ({ t, swim = 1 }) => {
  const body = useMemo(() => {
    const g = new THREE.LatheGeometry(WHALE.map(([r, z]) => new THREE.Vector2(r, z)), 9);
    g.rotateX(Math.PI / 2);
    g.scale(1, 0.8, 1);
    const f = facet(g, 0.02, 4);
    const pos = f.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color("#4f6f8f");
    const belly = new THREE.Color("#9fb4c6");
    for (let i = 0; i < pos.count; i += 3) {
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      for (let q = 0; q < 3; q++) (cy < -0.18 ? belly : top).toArray(colors, (i + q) * 3);
    }
    f.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return f;
  }, []);
  const beat = Math.sin(t * 1.4) * 0.25 * swim;
  return (
    <group>
      <mesh geometry={body}>
        <meshStandardMaterial vertexColors flatShading roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.42, -1.6]} rotation={[-0.5, 0, 0]} scale={[0.02, 0.14, 0.18]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4f6f8f" flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.5, -0.25, 1.3]} rotation={[0, s * 0.5, s * 0.6]} scale={[0.5, 0.03, 0.14]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#5c7c9c" flatShading />
        </mesh>
      ))}
      <group position={[0, 0, -2.95]} rotation={[beat, 0, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.4, 0, -0.15]} rotation={[0, s * 0.5, 0]} scale={[0.5, 0.03, 0.2]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#4f6f8f" flatShading />
          </mesh>
        ))}
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.33, 0.12, 2.05]} scale={0.05}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#0b0f16" />
        </mesh>
      ))}
    </group>
  );
};
