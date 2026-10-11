// Low-poly deep-sea anglerfish: big round female with fang-filled jaw and a glowing lure (esca on a rod),
// tiny male with big eyes and huge nostrils, and abstract immune cells. All face +z; motion from `t`.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { facet, lerp, rng, taperedTube } from "../lib/lowpoly";

const SKIN = new THREE.Color("#6e5662");
const SKIN_DARK = new THREE.Color("#47353d");

export const LURE_GLOW = "#9ff6ff";

export const FemaleAngler: React.FC<{ t: number; glow?: number; mouth?: number; halo?: number; seed?: number }> = ({
  t, glow = 1, mouth = 0.35, halo = 1, seed = 4,
}) => {
  const body = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    g.scale(0.95, 0.82, 1.0);
    return facet(g, 0.08, seed);
  }, [seed]);
  const teeth = useMemo(() => {
    const r = rng(seed + 3);
    return Array.from({ length: 11 }, (_, i) => ({ x: lerp(-0.55, 0.55, i / 10), len: 0.12 + r() * 0.14, tilt: (r() - 0.5) * 0.4 }));
  }, [seed]);
  const sway = Math.sin(t * 1.3) * 0.12;
  const rod = useMemo(
    () => taperedTube([[0, 0.7, 0.35], [0, 1.15, 0.6], [0, 1.3, 1.05], [sway * 0.5, 1.15, 1.45]].map((p) => new THREE.Vector3(...p)), 0.035, 0.015, 10, 5),
    [sway],
  );
  useEffect(() => () => rod.dispose(), [rod]);
  const jaw = 0.15 + mouth * 0.5 + Math.sin(t * 1.1) * 0.04;
  const pulse = glow * (0.75 + 0.25 * Math.sin(t * 3.2));
  return (
    <group>
      <mesh geometry={body}>
        <meshStandardMaterial color={SKIN} flatShading roughness={0.85} />
      </mesh>
      {/* lower jaw, hinged at the back, juts forward */}
      <group position={[0, -0.25, 0.25]} rotation={[jaw, 0, 0]}>
        <mesh position={[0, -0.12, 0.45]} scale={[0.72, 0.18, 0.55]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={SKIN_DARK} flatShading />
        </mesh>
        {teeth.map((th, i) => (
          <mesh key={i} position={[th.x, 0.05, 0.62 + (1 - Math.abs(th.x)) * 0.32]} rotation={[th.tilt, 0, 0]}>
            <coneGeometry args={[0.035, th.len, 4]} />
            <meshStandardMaterial color="#efe9dc" flatShading emissive="#efe9dc" emissiveIntensity={0.15} />
          </mesh>
        ))}
      </group>
      {/* upper teeth */}
      {teeth.slice(1, -1).map((th, i) => (
        <mesh key={i} position={[th.x * 0.9, -0.2, 0.8 + (1 - Math.abs(th.x)) * 0.18]} rotation={[Math.PI + th.tilt, 0, 0]}>
          <coneGeometry args={[0.03, th.len * 0.8, 4]} />
          <meshStandardMaterial color="#efe9dc" flatShading />
        </mesh>
      ))}
      {/* small eyes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.42, 0.28, 0.72]} scale={0.07}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#cfd8c4" emissive="#4a5240" flatShading />
        </mesh>
      ))}
      {/* lure rod + glowing esca */}
      <mesh geometry={rod}>
        <meshStandardMaterial color={SKIN} flatShading />
      </mesh>
      <group position={[sway * 0.5, 1.12, 1.48]}>
        <mesh scale={0.1}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={new THREE.Color(LURE_GLOW).multiplyScalar(0.4 + pulse)} />
        </mesh>
        <mesh scale={0.28 * halo * (0.8 + pulse * 0.4)}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={LURE_GLOW} transparent opacity={0.18 * pulse} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <pointLight intensity={4 * pulse} distance={4} color={LURE_GLOW} />
      </group>
      {/* fins + tail */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.88, -0.15, -0.05]} rotation={[0, s * 0.3, s * (0.6 + Math.sin(t * 2.4 + s) * 0.25)]} scale={[0.25, 0.03, 0.18]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={SKIN_DARK} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0, -1.1]} rotation={[0, Math.sin(t * 2) * 0.35, 0]} scale={[0.04, 0.38, 0.3]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={SKIN_DARK} flatShading />
      </mesh>
    </group>
  );
};

// Tiny male: slim body, big eyes, huge white nostrils. `fused` 0..1 turns him into the female's skin color.
export const MaleAngler: React.FC<{ t: number; fused?: number; swim?: number }> = ({ t, fused = 0, swim = 1 }) => {
  const col = new THREE.Color("#b29c92").lerp(SKIN, fused);
  const wag = Math.sin(t * 9 * swim) * 0.45 * swim * (1 - fused);
  return (
    <group>
      <mesh scale={[0.22, 0.24, 0.5]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={col} flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* eye */}
          <mesh position={[s * 0.13, 0.09, 0.32]} scale={0.075 * (1 - fused * 0.6)}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#101010" />
          </mesh>
          {/* huge nostril */}
          <mesh position={[s * 0.07, 0.0, 0.47]} scale={[0.06, 0.07, 0.05].map((v) => v * (1 - fused * 0.7)) as [number, number, number]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#efe6dc" flatShading />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0, -0.55]} rotation={[0, wag, 0]} scale={[0.02, 0.18, 0.16]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={col} flatShading />
      </mesh>
    </group>
  );
};

// Abstract immune cell: spiky blue ball.
export const ImmuneCell: React.FC<{ t: number; seed?: number; dim?: number }> = ({ t, seed = 1, dim = 0 }) => {
  const spikes = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 10 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
  }, [seed]);
  const color = new THREE.Color("#4fb3ff").lerp(new THREE.Color("#2a3440"), dim);
  return (
    <group rotation={[t * 0.8 + seed, t * 0.6, 0]}>
      <mesh scale={0.22}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35 * (1 - dim)} flatShading />
      </mesh>
      {spikes.map((v, i) => (
        <mesh key={i} position={v.clone().multiplyScalar(0.26).toArray()} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v)}>
          <coneGeometry args={[0.05, 0.16, 4]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  );
};
