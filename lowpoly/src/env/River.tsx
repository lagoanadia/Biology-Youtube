// Murky Amazon flood water (pink river dolphin) and a shallow pond (star-nosed mole): tea-brown gradient, short
// green-brown fog, soft god rays from the surface, drifting silt and a wavy faceted surface seen from below.
import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { rng } from "../lib/lowpoly";

export const RiverBackdrop: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <AbsoluteFill style={{ background: "linear-gradient(to bottom, #8fa86a 0%, #5d6b3a 30%, #3a3a22 70%, #1c1a10 100%)",
    filter: `brightness(${1 - dim * 0.6})` }} />
);

export const RiverLights: React.FC<{ light?: number; fogNear?: number; fogFar?: number }> = ({ light = 1, fogNear = 2.5, fogFar = 13 }) => (
  <>
    <fog attach="fog" args={["#4b5230", fogNear, fogFar]} />
    <ambientLight intensity={0.35 * light} color="#d9e0b0" />
    <directionalLight position={[1, 8, 2]} intensity={2.0 * light} color="#fff2c8" />
    <directionalLight position={[-3, -1, -3]} intensity={0.5 * light} color="#9fbf6a" />
  </>
);

export const GodRays: React.FC<{ t: number; amount?: number }> = ({ t, amount = 1 }) => (
  <>
    {[-2, -0.8, 0.5, 1.8].map((x, i) => (
      <mesh key={i} position={[x + Math.sin(t * 0.3 + i) * 0.2, 2.8, -1.5 - i * 0.5]} rotation={[0, 0, 0.18 - i * 0.07]}>
        <planeGeometry args={[0.5, 7]} />
        <meshBasicMaterial color="#fff4c2" transparent opacity={0.09 * amount} blending={THREE.AdditiveBlending}
          depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    ))}
  </>
);

export const Silt: React.FC<{ t: number; count?: number; spread?: number }> = ({ t, count = 60, spread = 6 }) => {
  const p = useMemo(() => {
    const r = rng(19);
    return Array.from({ length: count }, () => ({ x: (r() - 0.5) * spread * 1.5, y: (r() - 0.5) * spread, z: -r() * spread + 1.5,
      w: r() * 6.28, s: 0.01 + r() * 0.02 }));
  }, [count, spread]);
  return (
    <>
      {p.map((q, i) => (
        <mesh key={i} position={[q.x + Math.sin(t * 0.25 + q.w) * 0.25, q.y + Math.sin(t * 0.2 + q.w) * 0.15, q.z]} scale={q.s}>
          <tetrahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#c9c08a" />
        </mesh>
      ))}
    </>
  );
};

// Water surface seen from below (faceted, waves are a pure function of t)
export const Surface: React.FC<{ t: number; y?: number; size?: number; color?: string }> = ({ t, y = 3.2, size = 30, color = "#b9c98a" }) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(size, size, 24, 24).toNonIndexed(), [size]);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const yy = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.9 + t * 1.1) * 0.08 + Math.cos(yy * 1.1 + t * 0.8) * 0.08);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <mesh geometry={geo} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color={color} flatShading side={THREE.DoubleSide} transparent opacity={0.85} />
    </mesh>
  );
};

// Muddy bottom with a few stones
export const Riverbed: React.FC<{ y?: number; color?: string }> = ({ y = -2.2, color = "#3b3020" }) => {
  const stones = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 14 }, () => ({ x: (r() - 0.5) * 12, z: -r() * 8 + 2, s: 0.1 + r() * 0.3 }));
  }, []);
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, s.s * 0.4, s.z]} scale={[s.s, s.s * 0.6, s.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#5a4c36" flatShading />
        </mesh>
      ))}
    </group>
  );
};
