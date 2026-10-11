// Low-poly droopy sea pen (Umbellula): swollen base buried in mud, long stalk that bends in the current, head of
// polyps — feeding polyps (8 feathery tentacles each) and tiny water-pumping polyps.
// grow 0..1: stalk length · bud 0..1: polyps appear one by one · bend 0..1: head pushed over by the current
// swell 0..1: base bulb · feed/pump: highlight glow on that polyp type · open: tentacles spread.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp, pop, rng, taperedTube } from "../lib/lowpoly";

const STALK = new THREE.Color("#e9d6c8");
const POLYP = new THREE.Color("#ff8a5c");
const TENT = new THREE.Color("#fff1e6");
export const HEIGHT = 2.6;

export type SeaPenProps = {
  t: number;
  grow?: number;
  bud?: number;
  bend?: number;
  swell?: number;
  feed?: number;
  pump?: number;
  open?: number;
  seed?: number;
};

// point + tangent along the bent stalk (pure function, also used to place things at the head)
export const stalkAt = (u: number, grow: number, bend: number, t: number) => {
  const H = HEIGHT * grow;
  const sway = Math.sin(t * 0.8) * 0.05;
  const lean = (bend * 0.9 + sway) * u * u;
  return new THREE.Vector3(Math.sin(lean) * H * u * 0.6, H * u * (1 - 0.12 * bend * u), 0);
};

const Polyp: React.FC<{ t: number; i: number; open: number; glow: number }> = ({ t, i, open, glow }) => (
  <group>
    <mesh position={[0, 0.05, 0]} scale={[0.07, 0.11, 0.07]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={POLYP} emissive={POLYP} emissiveIntensity={0.15 + glow * 0.9} flatShading />
    </mesh>
    {Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2;
      const spread = lerp(0.25, 1.1, open) + Math.sin(t * 2 + i + k) * 0.08;
      return (
        <group key={k} position={[0, 0.14, 0]} rotation={[0, a, spread]}>
          <mesh position={[0, 0.13, 0]}>
            <cylinderGeometry args={[0.008, 0.014, 0.26, 3]} />
            <meshStandardMaterial color={TENT} emissive={TENT} emissiveIntensity={glow * 0.4} flatShading />
          </mesh>
          {/* pinnules: the "feathery" side branches */}
          {[0.07, 0.13, 0.19].map((y, j) =>
            [-1, 1].map((s) => (
              <mesh key={`${j}${s}`} position={[s * 0.025, y, 0]} rotation={[0, 0, s * 0.9]}>
                <boxGeometry args={[0.045, 0.006, 0.006]} />
                <meshStandardMaterial color={TENT} flatShading />
              </mesh>
            )),
          )}
        </group>
      );
    })}
  </group>
);

export const SeaPen: React.FC<SeaPenProps> = ({ t, grow = 1, bud = 1, bend = 0.25, swell = 1, feed = 0, pump = 0, open = 1, seed = 1 }) => {
  const g = Math.max(grow, 0.02);
  const stalk = useMemo(
    () => taperedTube(Array.from({ length: 7 }, (_, j) => stalkAt(j / 6, g, bend, t)), 0.045, 0.028, 18, 5),
    [g, bend, t],
  );
  useEffect(() => () => stalk.dispose(), [stalk]);
  const top = stalkAt(1, g, bend, t);
  const tan = stalkAt(1, g, bend, t).sub(stalkAt(0.95, g, bend, t)).normalize();
  const headQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
  // head droops: polyps hang toward the bend side
  const droop = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -(0.6 + bend * 0.9));
  const polyps = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + r() * 0.3;
      const ring = i === 0 ? 0 : 0.12 + r() * 0.06;
      return { pos: [Math.cos(a) * ring, 0.03 + r() * 0.05, Math.sin(a) * ring] as [number, number, number], tilt: [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7] as [number, number, number] };
    });
  }, [seed]);
  const pumps = useMemo(() => {
    const r = rng(seed + 5);
    return Array.from({ length: 22 }, () => {
      const a = r() * Math.PI * 2;
      const rr = 0.08 + r() * 0.16;
      return [Math.cos(a) * rr, -0.02 - r() * 0.05, Math.sin(a) * rr] as [number, number, number];
    });
  }, [seed]);
  return (
    <group>
      {/* swollen base (peduncle) in the mud */}
      <mesh position={[0, -0.22, 0]} scale={[0.09 + 0.09 * swell, 0.22 + 0.06 * swell, 0.09 + 0.09 * swell]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#d9bfae" flatShading />
      </mesh>
      <mesh geometry={stalk}>
        <meshStandardMaterial color={STALK} flatShading roughness={0.6} />
      </mesh>
      <group position={top} quaternion={headQuat.multiply(droop)}>
        {/* head base */}
        <mesh scale={[0.2, 0.08, 0.2]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#f0a882" flatShading />
        </mesh>
        {polyps.map((p, i) => {
          const s = pop(bud, i / polyps.length * 0.8, i / polyps.length * 0.8 + 0.25);
          if (s <= 0) return null;
          return (
            <group key={i} position={p.pos} rotation={p.tilt} scale={s}>
              <Polyp t={t} i={i} open={open} glow={feed} />
            </group>
          );
        })}
        {pumps.map((p, i) => {
          const s = clamp01(bud * 1.4 - 0.4);
          const pulse = 1 + pump * 0.35 * Math.max(0, Math.sin(t * 6 + i));
          return s > 0 ? (
            <mesh key={i} position={p} scale={0.022 * s * pulse}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#ffffff" emissive="#9fdcff" emissiveIntensity={pump * 0.9} flatShading />
            </mesh>
          ) : null;
        })}
      </group>
    </group>
  );
};
