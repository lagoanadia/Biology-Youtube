// Low-poly deep-sea octopus (Graneledone-like: warty purple mantle, turns pale while brooding).
// Local frame: she clings to a rock wall behind her (−z), facing +z, arms cupped forward over her eggs.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { facet, rng, taperedTube } from "../lib/lowpoly";

export type OctopusProps = {
  t: number;
  pale?: number; // 0 = deep purple, 1 = almost white (brooding for years)
  cup?: number; // 1 = arms cupped over the eggs, 0 = arms relaxed/spread (swimming babies, crawling)
  push?: number; // 0..1 one arm reaches out to `pushTarget` and flicks
  pushTarget?: [number, number, number];
  swim?: number; // 0..1 arms trail behind and pulse (babies)
  seed?: number;
};

const PURPLE = new THREE.Color("#8e4fa3");
const PALE = new THREE.Color("#efe3ee");
const PUSH_ARM = 6;

const armPoints = (k: number, t: number, cup: number, swim: number, push: number, target: THREE.Vector3) => {
  const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
  const d = new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.85 - 0.25, 0);
  const z = new THREE.Vector3(0, 0, 1);
  const w = (j: number) => Math.sin(t * 1.4 + k * 0.9 + j * 0.8) * 0.035 * (1 + j * 0.4);
  // cupped pose: out, forward, then curling back over the eggs
  const cupPts = [
    d.clone().multiplyScalar(0.07),
    d.clone().multiplyScalar(0.4).addScaledVector(z, 0.12),
    d.clone().multiplyScalar(0.64).addScaledVector(z, 0.32),
    d.clone().multiplyScalar(0.56).addScaledVector(z, 0.56),
    d.clone().multiplyScalar(0.3).addScaledVector(z, 0.66),
  ];
  // relaxed pose: arms spread out like a star
  const relaxPts = [0.07, 0.4, 0.72, 1.0, 1.25].map((r, j) => d.clone().multiplyScalar(r).addScaledVector(z, 0.05 + j * 0.02));
  // swimming: arms trail downward behind the mantle, pulsing
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  const swimPts = [0.07, 0.25, 0.42, 0.58, 0.72].map((r, j) =>
    new THREE.Vector3(d.x * (0.1 + r * 0.25 * pulse), -r * 1.1, d.y * 0.15 + 0.05 * j * 0),
  );
  let pts = cupPts.map((p, j) => p.clone().lerp(relaxPts[j], 1 - cup).lerp(swimPts[j], swim));
  if (k === PUSH_ARM && push > 0) {
    const base = pts[0];
    const reach = [0.25, 0.5, 0.75, 1].map((u) =>
      base.clone().lerp(target, u).add(new THREE.Vector3(0, Math.sin(u * Math.PI) * 0.12, 0)),
    );
    pts = pts.map((p, j) => (j === 0 ? p : p.clone().lerp(reach[j - 1], push)));
  }
  return pts.map((p, j) => (j === 0 ? p : p.add(new THREE.Vector3(w(j), w(j + 3), w(j + 5) * 0.5))));
};

export const Octopus: React.FC<OctopusProps> = ({
  t,
  pale = 0,
  cup = 1,
  push = 0,
  pushTarget = [0.8, -0.4, 0.4],
  swim = 0,
  seed = 2,
}) => {
  const mantle = useMemo(() => facet(new THREE.IcosahedronGeometry(1, 2), 0.09, seed), [seed]);
  const warts = useMemo(() => {
    const r = rng(seed + 1);
    return Array.from({ length: 22 }, () => {
      const v = new THREE.Vector3(r() - 0.5, r() * 0.9, r() - 0.2).normalize();
      return { v, s: 0.018 + r() * 0.022 };
    });
  }, [seed]);
  const color = PURPLE.clone().lerp(PALE, pale);
  const dark = color.clone().multiplyScalar(0.72);
  const target = new THREE.Vector3(...pushTarget);
  const breathe = 1 + 0.04 * Math.sin(t * 2.1);
  const arms = Array.from({ length: 8 }, (_, k) =>
    taperedTube(armPoints(k, t, cup, swim, push, target), 0.055, 0.008, 16, 6),
  );
  useEffect(() => () => arms.forEach((g) => g.dispose()), [arms]); // geometry is rebuilt every frame
  const mat = <meshStandardMaterial color={color} flatShading roughness={0.75} emissive={color} emissiveIntensity={0.08} />;
  return (
    <group>
      {/* mantle: bulbous, tilted out from the rock */}
      <group position={[0, 0.27, 0.02]} rotation={[0.35 - swim * 0.35, 0, 0]} scale={[0.23 * breathe, 0.34, 0.21 * breathe]}>
        <mesh geometry={mantle}>{mat}</mesh>
        {warts.map((w, i) => (
          <mesh key={i} position={w.v.toArray()} scale={[w.s / 0.23, w.s / 0.34, w.s / 0.21]}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={dark} flatShading />
          </mesh>
        ))}
      </group>
      {/* head + eyes */}
      <mesh position={[0, 0.03, 0.17]} scale={[0.19, 0.14, 0.15]}>
        <icosahedronGeometry args={[1, 1]} />
        {mat}
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.13, 0.08, 0.29]}>
          <mesh scale={0.055}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#f3e7b5" flatShading />
          </mesh>
          <mesh position={[0, 0, 0.045]} scale={[0.035, 0.012, 0.02]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#120a14" />
          </mesh>
        </group>
      ))}
      {arms.map((g, k) => (
        <mesh key={k} geometry={g}>
          <meshStandardMaterial color={k % 2 ? color : dark} flatShading roughness={0.75} emissive={color} emissiveIntensity={0.06} />
        </mesh>
      ))}
    </group>
  );
};
