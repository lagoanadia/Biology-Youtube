// Low-poly Antarctic animals: orca (black/white facets, eye patch, saddle, tall dorsal fin), seals (Weddell: dark
// grey with pale spots; crabeater: pale blond) and a breakable ice floe. All face +z; motion comes from `t`.
import { useMemo } from "react";
import * as THREE from "three";
import { facet, rng } from "../lib/lowpoly";

const BLACK = new THREE.Color("#15191e");
const WHITE = new THREE.Color("#f4f6f8");
const GREY = new THREE.Color("#9aa4ad");

// Body from a lathe profile (r, along-axis), turned so its length runs along z (nose at +z), with per-facet colors.
const latheBody = (profile: [number, number][], segments: number, colorOf: (c: THREE.Vector3) => THREE.Color, seed: number) => {
  const len = profile[profile.length - 1][1];
  const lathe = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  lathe.rotateX(Math.PI / 2);
  lathe.translate(0, 0, -len / 2);
  const g = facet(lathe, 0.03, seed);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Vector3();
  for (let f = 0; f < pos.count; f += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.add(new THREE.Vector3().fromBufferAttribute(pos, f + k));
    c.divideScalar(3);
    const col = colorOf(c);
    for (let k = 0; k < 3; k++) col.toArray(colors, (f + k) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
};

const ORCA_PROFILE: [number, number][] = [
  [0, 0], [0.07, 0.08], [0.17, 0.45], [0.31, 0.95], [0.41, 1.45], [0.43, 1.85], [0.37, 2.2], [0.25, 2.5], [0.1, 2.7], [0, 2.76],
];

export const Orca: React.FC<{ t: number; swim?: number; seed?: number }> = ({ t, swim = 1, seed = 1 }) => {
  const body = useMemo(
    () =>
      latheBody(ORCA_PROFILE, 10, (c) => {
        if (c.z > 0.45 && c.z < 0.95 && c.y > 0.0 && c.y < 0.24 && Math.abs(c.x) > 0.2) return WHITE; // eye patch
        if ((c.y < -0.24 && Math.abs(c.x) < 0.28 && c.z > -0.6) || (c.z > 0.95 && c.y < -0.06)) return WHITE; // belly + chin
        if (c.z > -0.45 && c.z < -0.05 && c.y > 0.24) return GREY; // saddle patch
        return BLACK;
      }, seed),
    [seed],
  );
  const dorsal = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.32, 0);
    s.lineTo(0.22, 0);
    s.lineTo(-0.12, 0.95);
    s.lineTo(-0.2, 0.9);
    s.lineTo(-0.32, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false });
    g.translate(0, 0, -0.025);
    g.rotateY(Math.PI / 2);
    return g;
  }, []);
  const beat = Math.sin(t * 5 * swim) * 0.35 * swim;
  return (
    <group rotation={[beat * 0.12, 0, 0]}>
      <mesh geometry={body}>
        <meshStandardMaterial vertexColors flatShading roughness={0.45} />
      </mesh>
      <mesh geometry={dorsal} position={[0, 0.36, 0.05]}>
        <meshStandardMaterial color={BLACK} flatShading />
      </mesh>
      {/* pectoral fins */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.4, -0.22, 0.65]} rotation={[0.2, s * 0.5, s * 0.6]} scale={[0.36, 0.04, 0.2]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={BLACK} flatShading />
        </mesh>
      ))}
      {/* tail flukes */}
      <group position={[0, 0, -1.36]} rotation={[beat, 0, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.24, 0, -0.12]} rotation={[0, s * 0.5, 0]} scale={[0.32, 0.03, 0.16]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={BLACK} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const SEAL_PROFILE: [number, number][] = [[0, 0], [0.08, 0.06], [0.2, 0.3], [0.27, 0.62], [0.25, 0.92], [0.16, 1.12], [0.1, 1.22], [0, 1.26]];

export const Seal: React.FC<{ t: number; kind?: "weddell" | "crabeater"; seed?: number }> = ({ t, kind = "weddell", seed = 3 }) => {
  const base = kind === "weddell" ? new THREE.Color("#55606c") : new THREE.Color("#d8caa9");
  const body = useMemo(() => latheBody(SEAL_PROFILE, 8, (c) => (c.y < -0.12 ? base.clone().lerp(WHITE, 0.25) : base.clone()), seed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, kind]);
  const spots = useMemo(() => {
    const r = rng(seed + 9);
    return Array.from({ length: kind === "weddell" ? 16 : 0 }, () => {
      const a = (r() - 0.5) * 2.2;
      const z = (r() - 0.5) * 0.8;
      return { p: [Math.sin(a) * 0.235, Math.cos(a) * 0.205, z] as [number, number, number], s: 0.018 + r() * 0.02 };
    });
  }, [seed, kind]);
  const breathe = 1 + 0.025 * Math.sin(t * 1.5 + seed);
  return (
    <group scale={[breathe, 1, 1]}>
      <mesh geometry={body} position={[0, 0.22, 0]}>
        <meshStandardMaterial vertexColors flatShading roughness={0.6} />
      </mesh>
      {spots.map((s, i) => (
        <mesh key={i} position={[s.p[0], s.p[1] + 0.22, s.p[2]]} scale={s.s}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#b9c3cc" flatShading />
        </mesh>
      ))}
      {/* eyes + nose at the head (+z) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.07, 0.31, 0.52]} scale={0.03}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#0b0d10" />
        </mesh>
      ))}
      {/* flippers */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.27, 0.06, 0.2]} rotation={[0, 0, s * 0.5]} scale={[0.12, 0.03, 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={base.clone().multiplyScalar(0.8)} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.18, -0.68]} rotation={[0, 0, Math.sin(t * 2 + seed) * 0.2]} scale={[0.2, 0.03, 0.1]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={base.clone().multiplyScalar(0.8)} flatShading />
      </mesh>
    </group>
  );
};

// Ice floe: irregular slab split into 3 sectors; `crack` 0..1 pushes the pieces apart.
export const IceFloe: React.FC<{ radius?: number; crack?: number; seed?: number }> = ({ radius = 1.6, crack = 0, seed = 6 }) => {
  const pieces = useMemo(() => {
    const r = rng(seed);
    const n = 12;
    const rim = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const rr = radius * (0.78 + r() * 0.32);
      return new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr);
    });
    const cuts = [0, 4, 8]; // 3 sectors
    return cuts.map((c, k) => {
      const end = cuts[(k + 1) % 3] || n;
      const shape = new THREE.Shape();
      shape.moveTo(0.05 * (r() - 0.5), 0.05 * (r() - 0.5));
      for (let i = c; i <= end; i++) shape.lineTo(rim[i % n].x, rim[i % n].y);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      g.translate(0, -0.12, 0);
      const mid = ((c + (end - c) / 2) / n) * Math.PI * 2;
      return { g: g.toNonIndexed(), dir: new THREE.Vector3(Math.cos(mid), 0, -Math.sin(mid)), spin: (r() - 0.5) * 0.4 };
    });
  }, [radius, seed]);
  return (
    <group>
      {pieces.map((p, i) => (
        <mesh key={i} geometry={p.g} position={p.dir.clone().multiplyScalar(crack * 0.55).toArray()}
          rotation={[p.spin * crack * 0.3, p.spin * crack, -p.spin * crack * 0.3]}>
          <meshStandardMaterial attach="material-0" color="#f4f9fd" flatShading roughness={0.7} />
          <meshStandardMaterial attach="material-1" color="#a9d2ea" flatShading roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};
