// Low-poly barn owl: upright pear-shaped body, white heart-shaped face disc with a buff rim, black eyes, pale beak,
// golden-buff back and wings with grey speckles, white belly, long white legs. Plus a fluffy chick and an egg.
// flap: 0 = wings folded, 1 = wings spread (flapping is driven by the caller) · tilt: head tilt · look: head yaw ·
// mood: 0 normal, 1 sad (head down). Faces +z, feet on y = 0, ≈0.9 tall.
import { rng } from "../lib/lowpoly";

const BUFF = "#d9a35a";
const GREY = "#9a948c";
const WHITE = "#f4efe6";

const Wing: React.FC<{ side: 1 | -1; flap: number }> = ({ side, flap }) => (
  <group position={[side * 0.17, 0.52, -0.02]} rotation={[0, 0, side * (0.1 + flap * 1.35)]}>
    <group position={[side * 0.02, -0.12, 0]} rotation={[0.1, 0, 0]}>
      <mesh position={[side * flap * 0.2, 0, 0]} scale={[0.07 + flap * 0.25, 0.26 - flap * 0.08, 0.15]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={BUFF} flatShading roughness={0.9} />
      </mesh>
      {/* flight feathers */}
      {flap > 0.2 &&
        [0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[side * (0.3 + i * 0.07) * flap, -0.05 - i * 0.02, 0]} rotation={[0, 0, side * (0.2 + i * 0.12)]}
            scale={[0.04, 0.16, 0.02]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={i % 2 ? GREY : BUFF} flatShading />
          </mesh>
        ))}
    </group>
  </group>
);

export const Owl: React.FC<{ t: number; flap?: number; tilt?: number; look?: number; mood?: number; seed?: number }> = ({
  t, flap = 0, tilt = 0, look = 0, mood = 0, seed = 1,
}) => {
  const r = rng(seed);
  const breathe = Math.sin(t * 2) * 0.005;
  return (
    <group>
      {/* body */}
      <mesh position={[0, 0.46, 0]} scale={[0.2, 0.28 + breathe, 0.17]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={BUFF} flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.42, 0.06]} scale={[0.17, 0.24, 0.13]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={WHITE} flatShading roughness={0.9} />
      </mesh>
      {/* speckles on the back */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (r() - 0.5) * 2.2 + Math.PI;
        const y = 0.35 + r() * 0.3;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.19, y, Math.cos(a) * 0.16]} scale={0.012}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={i % 3 ? "#ffffff" : "#5a4a3a"} />
          </mesh>
        );
      })}
      <Wing side={1} flap={flap} />
      <Wing side={-1} flap={flap} />
      {/* tail */}
      <mesh position={[0, 0.24, -0.14]} rotation={[-0.5, 0, 0]} scale={[0.1, 0.12, 0.03]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={BUFF} flatShading />
      </mesh>
      {/* legs + toes */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.07, 0.11, 0.02]} scale={[0.03, 0.12, 0.03]}>
            <cylinderGeometry args={[1, 0.8, 1, 5]} />
            <meshStandardMaterial color={WHITE} flatShading />
          </mesh>
          {[-0.4, 0, 0.4].map((a, j) => (
            <mesh key={j} position={[s * 0.07 + Math.sin(a) * 0.04, 0.01, 0.04 + Math.cos(a) * 0.03]} rotation={[Math.PI / 2, 0, a]}
              scale={[0.008, 0.05, 0.008]}>
              <cylinderGeometry args={[1, 1, 1, 4]} />
              <meshStandardMaterial color="#7a6a5a" />
            </mesh>
          ))}
        </group>
      ))}
      {/* head */}
      <group position={[0, 0.78 - mood * 0.04, 0.02]} rotation={[mood * 0.35, look, tilt]}>
        <mesh scale={[0.17, 0.15, 0.15]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={BUFF} flatShading roughness={0.9} />
        </mesh>
        {/* heart-shaped face: buff rim + white disc made of two lobes */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.06, 0.0, 0.1]} rotation={[0, 0, s * 0.35]} scale={[0.085, 0.13, 0.03]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#c98f4a" flatShading />
            </mesh>
            <mesh position={[s * 0.055, -0.005, 0.12]} rotation={[0, 0, s * 0.35]} scale={[0.07, 0.115, 0.025]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color={WHITE} flatShading roughness={0.7} />
            </mesh>
            <mesh position={[s * 0.05, 0.015, 0.145]} scale={[0.02, mood > 0.5 ? 0.008 : 0.022, 0.01]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshBasicMaterial color="#0d0d0d" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.04, 0.15]} rotation={[0.3, 0, 0]} scale={[0.014, 0.035, 0.02]}>
          <coneGeometry args={[1, 1, 4]} />
          <meshStandardMaterial color="#e8d2b8" />
        </mesh>
      </group>
    </group>
  );
};

// fluffy white chick (≈0.3 tall)
export const OwlChick: React.FC<{ t: number; seed?: number }> = ({ t, seed = 0 }) => (
  <group rotation={[0, Math.sin(t * 1.5 + seed) * 0.3, Math.sin(t * 2 + seed) * 0.06]}>
    <mesh position={[0, 0.12, 0]} scale={[0.11, 0.12, 0.1]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#fbf8f2" flatShading />
    </mesh>
    <mesh position={[0, 0.26, 0.01]} scale={[0.085, 0.075, 0.075]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#fbf8f2" flatShading />
    </mesh>
    <mesh position={[0, 0.255, 0.065]} scale={[0.06, 0.055, 0.02]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#f0d8c8" flatShading />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.025, 0.265, 0.082]} scale={0.011}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#111" />
      </mesh>
    ))}
  </group>
);

export const Nest: React.FC<{ chicks?: number; t: number }> = ({ chicks = 0, t }) => (
  <group>
    <mesh position={[0, 0.03, 0]} scale={[0.42, 0.06, 0.32]}>
      <cylinderGeometry args={[1, 0.85, 1, 9]} />
      <meshStandardMaterial color="#c9a85e" flatShading />
    </mesh>
    {Array.from({ length: chicks }, (_, i) => (
      <group key={i} position={[(i - (chicks - 1) / 2) * 0.17, 0.05, (i % 2) * 0.07]} scale={0.95}>
        <OwlChick t={t} seed={i} />
      </group>
    ))}
  </group>
);

