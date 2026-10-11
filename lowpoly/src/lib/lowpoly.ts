// Shared low-poly helpers: deterministic randomness, faceted geometry, snappy easing.
import * as THREE from "three";
import { Easing, interpolate } from "remotion";

// Deterministic PRNG (renders must be identical frame to frame, so no Math.random()).
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Hash of a vertex position: shared corners get the same jitter, so facets never crack apart.
const keyOf = (x: number, y: number, z: number) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;

// Displaces every vertex a little along its direction from the centre and returns a NON-indexed geometry,
// so each triangle keeps its own flat normal (visible facets, no smooth shading).
export const facet = (geo: THREE.BufferGeometry, amount: number, seed: number) => {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  const pos = g.attributes.position as THREE.BufferAttribute;
  const cache = new Map<string, number>();
  const r = rng(seed);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = keyOf(v.x, v.y, v.z);
    if (!cache.has(k)) cache.set(k, 1 + (r() - 0.5) * 2 * amount);
    v.multiplyScalar(cache.get(k)!);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
};

// Faceted tube along `points` whose radius tapers from r0 to r1 (octopus arms, legs, antennae).
// Few radial segments + non-indexed geometry = visible flat facets.
export const taperedTube = (points: THREE.Vector3[], r0: number, r1: number, segments = 14, radial = 6) => {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, segments, 1, radial, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const c = curve.getPointAt(u);
    const r = r0 + (r1 - r0) * u;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  const g = geo.toNonIndexed();
  g.computeVertexNormals();
  return g;
};

// Snappy, slightly bouncy ease (the brief: "snappy, slightly bouncy easing").
export const pop = (t: number, from: number, to: number, a = 0, b = 1) =>
  interpolate(t, [from, to], [a, b], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.7)),
  });

// Smooth ease for camera moves (cameras should glide, not bounce).
export const glide = (t: number, from: number, to: number, a: number, b: number) =>
  interpolate(t, [from, to], [a, b], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Rainbow red → violet (hue 0 → 0.78), flat colors only.
export const rainbow = (x: number, light = 0.55) =>
  new THREE.Color().setHSL(((x % 1) + 1) % 1 * 0.78, 1, light);

export const PALETTE = {
  navy: "#0A1530",
  deep: "#13265C",
  glass: "#DDEFFF",
  black: "#02040b",
  cyan: "#5fe7ff",
};
