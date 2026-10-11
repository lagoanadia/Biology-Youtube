// Low-poly comb jelly (ctenophore): faceted glassy body + 8 comb rows of flat paddle plates.
// Reusable: every look/motion is a prop, all animation comes from `t` (seconds), never from a clock.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { clamp01, facet, lerp, PALETTE, pop, rainbow, rng } from "../lib/lowpoly";

export const RX = 0.72; // body radii (walnut / oval)
export const RY = 1.05;
export const RZ = 0.62;
const ROWS = 8;
const PLATES = 20;
const CHUNK_X = RX * 0.42; // faces beyond this (on the cut side) form the missing chunk

export type CombJellyProps = {
  t: number; // seconds, drives the comb wave
  rainbow?: number; // 0 = glass white combs, 1 = full rainbow waves
  rowRainbow?: number[]; // per-row override of `rainbow` (rainbow spreading row by row)
  rowsLit?: number[]; // per-row white highlight 0..1 (rows lighting up one after another)
  beat?: number; // paddle beating amplitude 0..1
  beatSpeed?: number; // waves per second
  light?: number; // overhead light 0..1: at 0 the rainbow vanishes, only a dim glassy outline is left
  sync?: boolean; // all rows beat in phase (fused animal moving "as one")
  cut?: 0 | 1 | -1; // missing faceted chunk on the +x (1) or -x (-1) side
  knit?: number; // 0..1 chunk triangles fly back and knit the body together
  opacity?: number;
  seed?: number;
};

type Plate = { pos: THREE.Vector3; quat: THREE.Quaternion; w: number; row: number; i: number; inChunk: boolean };

const ellipsoidPoint = (theta: number, phi: number) =>
  new THREE.Vector3(RX * Math.cos(theta) * Math.cos(phi), RY * Math.sin(theta), RZ * Math.cos(theta) * Math.sin(phi));

const usePlates = (cut: number) =>
  useMemo(() => {
    const plates: Plate[] = [];
    for (let row = 0; row < ROWS; row++) {
      const phi = ((row + 0.5) * Math.PI * 2) / ROWS;
      for (let i = 0; i < PLATES; i++) {
        // top (aboral pole) → bottom, i = 0 at the top so waves travel DOWN the rows
        const theta = THREE.MathUtils.lerp(1.2, -1.05, i / (PLATES - 1));
        const p = ellipsoidPoint(theta, phi);
        const normal = new THREE.Vector3(p.x / (RX * RX), p.y / (RY * RY), p.z / (RZ * RZ)).normalize();
        const down = ellipsoidPoint(theta - 0.01, phi).sub(p).normalize(); // along the row
        const across = new THREE.Vector3().crossVectors(normal, down).normalize();
        const basis = new THREE.Matrix4().makeBasis(across, normal, down);
        plates.push({
          pos: p.add(normal.clone().multiplyScalar(0.005)),
          quat: new THREE.Quaternion().setFromRotationMatrix(basis),
          w: 0.045 + 0.085 * Math.cos(theta),
          row,
          i,
          inChunk: cut !== 0 && p.x * cut > CHUNK_X - 0.05 && Math.abs(p.y) < 0.8,
        });
      }
    }
    return plates;
  }, [cut]);

// Body split into the kept part and the "chunk" triangles (each triangle animated on its own when knitting).
const useBody = (cut: number, seed: number) =>
  useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(1, 6); // 980 triangles
    ico.scale(RX, RY, RZ);
    const body = facet(ico, 0.045, seed);
    const src = body.attributes.position.array as Float32Array;
    const kept: number[] = [];
    const chunk: number[] = [];
    for (let f = 0; f < src.length; f += 9) {
      const cx = (src[f] + src[f + 3] + src[f + 6]) / 3;
      const cy = (src[f + 1] + src[f + 4] + src[f + 7]) / 3;
      const target = cut !== 0 && cx * cut > CHUNK_X && Math.abs(cy) < 0.75 ? chunk : kept;
      for (let k = 0; k < 9; k++) target.push(src[f + k]);
    }
    const keptGeo = new THREE.BufferGeometry();
    keptGeo.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
    keptGeo.computeVertexNormals();
    const r = rng(seed + 7);
    const scatter = Array.from({ length: chunk.length / 9 }, () =>
      new THREE.Vector3(cut * (0.6 + r() * 0.9), (r() - 0.5) * 1.6, (r() - 0.5) * 1.2),
    );
    return { keptGeo, edges: new THREE.EdgesGeometry(keptGeo, 1), chunk, scatter, triangles: body.attributes.position.count / 3 };
  }, [cut, seed]);

export const CombJelly: React.FC<CombJellyProps> = ({
  t,
  rainbow: rb = 1,
  rowRainbow,
  rowsLit,
  beat = 0.6,
  beatSpeed = 1.6,
  light = 1,
  sync = false,
  cut = 0,
  knit = 0,
  opacity = 1,
  seed = 3,
}) => {
  const plates = usePlates(cut);
  const { keptGeo, edges, chunk, scatter } = useBody(cut, seed);

  // chunk triangles: scattered (invisible) at knit=0, snapped into place one after another as knit → 1
  const chunkGeo = useMemo(() => {
    if (!chunk.length) return null;
    const out = new Float32Array(chunk.length);
    const n = chunk.length / 9;
    for (let j = 0; j < n; j++) {
      const k = pop(knit, (j / n) * 0.6, (j / n) * 0.6 + 0.4);
      const off = scatter[j].clone().multiplyScalar(1 - k);
      const s = lerp(0.2, 1, clamp01(k)); // triangles grow while flying in
      const cx = (chunk[j * 9] + chunk[j * 9 + 3] + chunk[j * 9 + 6]) / 3;
      const cy = (chunk[j * 9 + 1] + chunk[j * 9 + 4] + chunk[j * 9 + 7]) / 3;
      const cz = (chunk[j * 9 + 2] + chunk[j * 9 + 5] + chunk[j * 9 + 8]) / 3;
      for (let v = 0; v < 3; v++) {
        const b = j * 9 + v * 3;
        out[b] = cx + (chunk[b] - cx) * s + off.x;
        out[b + 1] = cy + (chunk[b + 1] - cy) * s + off.y;
        out[b + 2] = cz + (chunk[b + 2] - cz) * s + off.z;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    g.computeVertexNormals();
    return g;
  }, [chunk, scatter, knit]);

  useEffect(() => () => chunkGeo?.dispose(), [chunkGeo]);
  const glass = new THREE.Color(PALETTE.glass);
  const bodyOpacity = opacity * lerp(0.08, 0.2, light);
  return (
    <group>
      <mesh geometry={keptGeo} renderOrder={1}>
        <meshStandardMaterial color={PALETTE.glass} flatShading transparent opacity={bodyOpacity} roughness={0.25}
          metalness={0.1} emissive={PALETTE.deep} emissiveIntensity={0.35 * light} depthWrite={false} side={THREE.FrontSide} />
      </mesh>
      {/* facet edges: the "glassy outline" that stays visible when the light is off */}
      <lineSegments geometry={edges} renderOrder={2}>
        <lineBasicMaterial color={PALETTE.cyan} transparent opacity={opacity * lerp(0.34, 0.24, light)} depthWrite={false} />
      </lineSegments>
      {chunkGeo && knit > 0 && (
        <mesh geometry={chunkGeo} renderOrder={1}>
          <meshStandardMaterial color={PALETTE.glass} flatShading transparent opacity={bodyOpacity * clamp01(knit * 3)}
            emissive={PALETTE.cyan} emissiveIntensity={0.6 * (1 - knit)} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* gut: slim faceted core so the body reads as a translucent animal */}
      <mesh position={[0, -0.1, 0]} scale={[0.13, 0.55, 0.1]} renderOrder={0}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffc9b5" flatShading transparent opacity={opacity * lerp(0.05, 0.18, light)} depthWrite={false} />
      </mesh>
      {plates.map((pl, idx) => {
        if (pl.inChunk && knit < 0.95) return null;
        const phase = t * beatSpeed * Math.PI * 2 - pl.i * 0.55 - (sync ? 0 : pl.row * 0.9);
        const flick = beat * (0.25 + 0.75 * Math.max(0, Math.sin(phase))) * 1.1; // power stroke, slow recovery
        const amt = (rowRainbow?.[pl.row] ?? rb) * light;
        const hue = rainbow(t * 0.55 - pl.i / PLATES + (sync ? 0 : pl.row * 0.07), 0.5 + 0.08 * Math.sin(phase));
        const lit = rowsLit?.[pl.row] ?? 0;
        const color = glass.clone().lerp(hue.clone().multiplyScalar(0.35), amt);
        const emissive = hue.clone().multiplyScalar(amt * 1.15).add(new THREE.Color(1, 1, 1).multiplyScalar(lit * 0.9));
        return (
          <group key={idx} position={pl.pos} quaternion={pl.quat}>
            <group rotation={[flick, 0, 0]}>
              {/* hinge at the base of the plate: the box sits half its height above the pivot */}
              <mesh position={[0, 0.025, 0]}>
                <boxGeometry args={[pl.w, 0.05, 0.012]} />
                <meshStandardMaterial color={color} emissive={emissive} flatShading transparent
                  opacity={opacity * lerp(0.35, 1, Math.max(light, lit))} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};
