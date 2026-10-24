// Old wooden barn loft at night (barn owl short): plank floor and walls, a rafter beam, hay bales, an open window with
// a moonlit night sky behind it, and floating dust in a moonbeam.
import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { rng } from "../lib/lowpoly";

export const BarnBackdrop: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(to bottom, #141a33 0%, #24305a 55%, #3a3a52 100%)" }} />
);

export const BarnLights: React.FC<{ light?: number }> = ({ light = 1 }) => (
  <>
    <fog attach="fog" args={["#2a2638", 6, 16]} />
    <hemisphereLight args={["#c9d6ff", "#4a3424", 0.75 * light]} />
    <directionalLight position={[-3, 4, 4]} intensity={1.6 * light} color="#cfe0ff" />
    <pointLight position={[1.5, 1.6, 1.2]} intensity={2.5 * light} distance={6} color="#ffcf8a" />
  </>
);

const PLANK = ["#6b4a30", "#5e4129", "#74513a"];

// walls behind (z = -1.6) and to the left (x = -2.2), floor at y = 0; window in the back wall at x ≈ 1.2
export const BarnLoft: React.FC<{ t: number }> = ({ t }) => {
  const dust = useMemo(() => {
    const r = rng(41);
    return Array.from({ length: 40 }, () => ({ x: (r() - 0.5) * 3, y: r() * 2.4, z: (r() - 0.5) * 2, w: r() * 6.28 }));
  }, []);
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={`f${i}`} position={[0, -0.02, -1.6 + i * 0.45]}>
          <boxGeometry args={[8, 0.04, 0.43]} />
          <meshStandardMaterial color={PLANK[i % 3]} flatShading />
        </mesh>
      ))}
      {/* back wall with a window hole */}
      {Array.from({ length: 16 }, (_, i) => {
        const x = -3.6 + i * 0.48;
        const inWindow = x > 0.6 && x < 1.9;
        return inWindow ? (
          <group key={`w${i}`}>
            <mesh position={[x, 0.45, -1.6]}>
              <boxGeometry args={[0.46, 0.9, 0.08]} />
              <meshStandardMaterial color={PLANK[i % 3]} flatShading />
            </mesh>
            <mesh position={[x, 2.75, -1.6]}>
              <boxGeometry args={[0.46, 0.7, 0.08]} />
              <meshStandardMaterial color={PLANK[i % 3]} flatShading />
            </mesh>
          </group>
        ) : (
          <mesh key={`w${i}`} position={[x, 1.55, -1.6]}>
            <boxGeometry args={[0.46, 3.1, 0.08]} />
            <meshStandardMaterial color={PLANK[i % 3]} flatShading />
          </mesh>
        );
      })}
      {/* moon + stars outside the window */}
      <mesh position={[1.35, 1.85, -4]} scale={0.22}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff6d8" />
      </mesh>
      {[[0.8, 1.4], [1.7, 1.2], [1.1, 2.2], [1.9, 2.1], [0.75, 2.05]].map(([x, y], i) => (
        <mesh key={`s${i}`} position={[x, y, -4]} scale={0.02}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* side wall */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={`l${i}`} position={[-2.4, 1.55, -1.4 + i * 0.48]}>
          <boxGeometry args={[0.08, 3.1, 0.46]} />
          <meshStandardMaterial color={PLANK[(i + 1) % 3]} flatShading />
        </mesh>
      ))}
      {/* rafter beam + hay bales */}
      <mesh position={[0, 2.6, -0.4]}>
        <boxGeometry args={[6, 0.18, 0.18]} />
        <meshStandardMaterial color="#4f3522" flatShading />
      </mesh>
      {[[-1.7, 0.25, -1.1], [-1.6, 0.75, -1.15], [-0.9, 0.25, -1.15]].map(([x, y, z], i) => (
        <mesh key={`h${i}`} position={[x, y, z]}>
          <boxGeometry args={[0.8, 0.5, 0.5]} />
          <meshStandardMaterial color={i % 2 ? "#d7b45e" : "#cfa94f"} flatShading />
        </mesh>
      ))}
      {/* moonbeam with dust */}
      <mesh position={[0.9, 1.3, -0.6]} rotation={[0.5, 0, -0.25]}>
        <planeGeometry args={[1.0, 4]} />
        <meshBasicMaterial color="#cfe0ff" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false}
          side={THREE.DoubleSide} />
      </mesh>
      {dust.map((d, i) => (
        <mesh key={`d${i}`} position={[d.x + Math.sin(t * 0.3 + d.w) * 0.15, d.y + Math.sin(t * 0.25 + d.w) * 0.1, d.z]} scale={0.01}>
          <tetrahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#e8eeff" transparent opacity={0.6} />
        </mesh>
      ))}
    </>
  );
};
