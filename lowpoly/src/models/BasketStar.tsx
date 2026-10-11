// Low-poly basket star (Gorgonocephalus): pentagonal disc + 5 arms that fork again and again (recursive tree).
// open: 0 = coiled tight like a ball, 1 = arms up and out in a bowl-shaped net facing the current.
// writhe: snake-like wiggle. grow: how many branching levels are visible (0..1, for the "split again and again" beat).
// roll: one arm (index 0) rolls in toward the mouth.
import { useMemo } from "react";
import * as THREE from "three";
import { facet, lerp } from "../lib/lowpoly";

const COLOR_A = new THREE.Color("#d98a4a");
const COLOR_B = new THREE.Color("#f2c08a");
export const DEPTH = 5;

type BranchProps = {
  t: number;
  level: number;
  len: number;
  rad: number;
  open: number;
  writhe: number;
  grow: number;
  roll: number;
  arm: number;
  path: number;
};

const Branch: React.FC<BranchProps> = ({ t, level, len, rad, open, writhe, grow, roll, arm, path }) => {
  // reveal levels one after another
  const show = Math.min(1, Math.max(0, grow * (DEPTH + 1) - level));
  if (show <= 0) return null;
  const w = Math.sin(t * 2.2 + level * 1.3 + arm * 1.7 + path * 0.9) * 0.22 * writhe;
  const curlOpen = 0.16; // gentle outward-up curve in the net
  const curlClosed = 0.95; // tight coil
  // negative = curls up/inward (net edge lifts; closed arms coil up over the disc)
  const curl = -(lerp(curlClosed, curlOpen, open) + (arm === 0 ? roll * 0.75 : 0)) + w;
  const L = len * show;
  const color = COLOR_A.clone().lerp(COLOR_B, level / DEPTH);
  return (
    <group rotation={[curl, 0, w * 0.6]}>
      <mesh position={[0, L / 2, 0]}>
        <cylinderGeometry args={[rad * 0.75, rad, L, 4]} />
        <meshStandardMaterial color={color} flatShading roughness={0.7} />
      </mesh>
      {level < DEPTH &&
        [-1, 1].map((s) => (
          <group key={s} position={[0, L, 0]} rotation={[0, 0, s * lerp(0.28, 0.5, open)]}>
            <Branch t={t} level={level + 1} len={len * 0.78} rad={rad * 0.72} open={open} writhe={writhe} grow={grow}
              roll={roll} arm={arm} path={path * 2 + (s > 0 ? 1 : 0)} />
          </group>
        ))}
    </group>
  );
};

export const BasketStar: React.FC<{ t: number; open?: number; writhe?: number; grow?: number; roll?: number }> = ({
  t, open = 1, writhe = 0.4, grow = 1, roll = 0,
}) => {
  const disc = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.28, 0.32, 0.12, 5, 1);
    return facet(g, 0.05, 7);
  }, []);
  return (
    <group>
      <mesh geometry={disc}>
        <meshStandardMaterial color="#c9763c" flatShading roughness={0.7} />
      </mesh>
      {/* five radial ridges on the disc */}
      {Array.from({ length: 5 }, (_, k) => (
        <mesh key={k} rotation={[0, (k / 5) * Math.PI * 2, 0]} position={[0, 0.07, 0]}>
          <boxGeometry args={[0.05, 0.03, 0.5]} />
          <meshStandardMaterial color="#e9a565" flatShading />
        </mesh>
      ))}
      {Array.from({ length: 5 }, (_, k) => (
        // each arm leaves the disc edge horizontally, then tilts up into the bowl (open) or curls over (closed)
        <group key={k} rotation={[0, (k / 5) * Math.PI * 2, 0]}>
          <group position={[0, 0, 0.28]} rotation={[-lerp(0.15, 0.55, open), 0, 0]}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <Branch t={t} level={0} len={0.42} rad={0.06} open={open} writhe={writhe} grow={grow} roll={roll} arm={k} path={0} />
            </group>
          </group>
        </group>
      ))}
    </group>
  );
};

// Macro props: one thick branch segment covered in hooks, and a copepod (tiny crustacean prey).
export const HookedBranch: React.FC<{ t: number; grip?: number }> = ({ t, grip = 0 }) => (
  <group>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.22, 0.25, 4, 7]} />
      <meshStandardMaterial color="#e09a5c" flatShading />
    </mesh>
    {Array.from({ length: 14 }, (_, i) =>
      [0, 1, 2, 3].map((r) => {
        const a = (r / 4) * Math.PI * 2 + i * 0.4;
        return (
          <group key={`${i}-${r}`} position={[-1.8 + i * 0.27, Math.cos(a) * 0.24, Math.sin(a) * 0.24]} rotation={[a, 0, 0]}>
            {/* hook: a cone that bends over like a claw when it grips */}
            <mesh position={[0, 0.08, 0]} rotation={[0, 0, (0.3 + grip * 0.9) * (i % 2 ? 1 : -1) * 0.6 + Math.sin(t * 3 + i) * 0.05]}>
              <coneGeometry args={[0.035, 0.16, 4]} />
              <meshStandardMaterial color="#fff2dc" flatShading />
            </mesh>
          </group>
        );
      }),
    )}
  </group>
);

export const Copepod: React.FC<{ t: number; kick?: number }> = ({ t, kick = 1 }) => (
  <group>
    <mesh scale={[0.12, 0.12, 0.28]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#e8f4ff" emissive="#7fb8e6" emissiveIntensity={0.35} flatShading transparent opacity={0.9} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.18, 0.02, 0.22]} rotation={[0, 0, s * (1.2 + Math.sin(t * 12 * kick) * 0.25 * kick)]}>
        <cylinderGeometry args={[0.008, 0.004, 0.42, 3]} />
        <meshStandardMaterial color="#d8ecff" flatShading />
      </mesh>
    ))}
    <mesh position={[0, 0.06, 0.24]} scale={0.025}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#ff4a4a" />
    </mesh>
  </group>
);
