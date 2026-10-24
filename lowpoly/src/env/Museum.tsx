// Victorian museum room (desert snail short): warm brown backdrop, wooden table with specimen cards (top at y = 0),
// tall glass cabinets with jars and shells, floating dust in the light; plus a washbasin of warm water.
import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { rng } from "../lib/lowpoly";

export const MuseumBackdrop: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <AbsoluteFill style={{ background: "linear-gradient(to bottom, #2e2118 0%, #5a4130 50%, #7a5a3e 100%)",
    filter: `brightness(${1 - dim * 0.55})` }} />
);

export const MuseumLights: React.FC<{ light?: number }> = ({ light = 1 }) => (
  <>
    <fog attach="fog" args={["#5a4130", 6, 16]} />
    <hemisphereLight args={["#ffe9c4", "#4a3222", 0.9 * light]} />
    <directionalLight position={[2, 6, 3]} intensity={2.2 * light} color="#ffe2b0" />
    <directionalLight position={[-3, 2, -2]} intensity={0.4 * light} color="#b9d0ff" />
  </>
);

const wood = "#6b4429";

// specimen card: cream card with "handwriting" lines
export const Card: React.FC<{ pos?: [number, number, number]; yaw?: number; w?: number; d?: number; tint?: string }> = ({
  pos = [0, 0, 0], yaw = 0, w = 1.5, d = 1.0, tint = "#f1e6cc",
}) => (
  <group position={pos} rotation={[0, yaw, 0]}>
    <mesh position={[0, 0.006, 0]}>
      <boxGeometry args={[w, 0.012, d]} />
      <meshStandardMaterial color={tint} roughness={0.9} />
    </mesh>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[-w * 0.08 + (i === 2 ? -w * 0.1 : 0), 0.014, d * 0.32 + i * 0.05]}>
        <boxGeometry args={[w * (i === 2 ? 0.35 : 0.6), 0.002, 0.016]} />
        <meshBasicMaterial color="#4a3b2a" />
      </mesh>
    ))}
  </group>
);

const Cabinet: React.FC<{ pos: [number, number, number]; yaw?: number; seed?: number }> = ({ pos, yaw = 0, seed = 1 }) => {
  const items = useMemo(() => {
    const r = rng(seed);
    return [0.2, 1.0, 1.8].flatMap((y) =>
      Array.from({ length: 4 }, (_, i) => ({ x: -0.55 + i * 0.37 + (r() - 0.5) * 0.08, y, h: 0.2 + r() * 0.25, jar: r() > 0.4,
        c: ["#c9a46a", "#a9b98a", "#d8c8a4", "#b98a6a"][Math.floor(r() * 4)] })));
  }, [seed]);
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.2, -0.05]}>
        <boxGeometry args={[1.7, 3.2, 0.5]} />
        <meshStandardMaterial color={wood} flatShading roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.15, 0.21]}>
        <boxGeometry args={[1.5, 2.9, 0.02]} />
        <meshStandardMaterial color="#2a1c12" />
      </mesh>
      {[0.12, 0.92, 1.72].map((y) => (
        <mesh key={y} position={[0, y, 0.12]}>
          <boxGeometry args={[1.5, 0.04, 0.2]} />
          <meshStandardMaterial color="#8a5c38" flatShading />
        </mesh>
      ))}
      {items.map((it, i) =>
        it.jar ? (
          <mesh key={i} position={[it.x, it.y + it.h / 2, 0.14]}>
            <cylinderGeometry args={[0.1, 0.1, it.h, 7]} />
            <meshStandardMaterial color={it.c} flatShading transparent opacity={0.85} roughness={0.2} />
          </mesh>
        ) : (
          <mesh key={i} position={[it.x, it.y + 0.09, 0.14]} scale={[0.12, 0.09, 0.1]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={it.c} flatShading />
          </mesh>
        ),
      )}
      <mesh position={[0, 1.15, 0.24]}>
        <boxGeometry args={[1.5, 2.9, 0.01]} />
        <meshStandardMaterial color="#cfe6ff" transparent opacity={0.12} roughness={0.05} />
      </mesh>
    </group>
  );
};

export const Dust: React.FC<{ t: number; count?: number; amount?: number }> = ({ t, count = 50, amount = 1 }) => {
  const p = useMemo(() => {
    const r = rng(23);
    return Array.from({ length: count }, () => ({ x: (r() - 0.5) * 4, y: r() * 2.2, z: (r() - 0.5) * 3, w: r() * 6.28 }));
  }, [count]);
  return (
    <>
      {p.map((q, i) => (
        <mesh key={i} position={[q.x + Math.sin(t * 0.3 + q.w) * 0.2, q.y + Math.sin(t * 0.25 + q.w) * 0.15, q.z]} scale={0.012}>
          <tetrahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ffe9b8" transparent opacity={0.7 * amount} />
        </mesh>
      ))}
    </>
  );
};

// table (top at y = 0) + floor + cabinets in front of and behind the table
export const MuseumRoom: React.FC = () => (
  <>
    <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#4a3020" roughness={1} />
    </mesh>
    <mesh position={[0, -0.06, 0]}>
      <boxGeometry args={[5, 0.12, 2.6]} />
      <meshStandardMaterial color={wood} flatShading roughness={0.7} />
    </mesh>
    {[[-2.3, -1.1], [2.3, -1.1], [-2.3, 1.1], [2.3, 1.1]].map(([x, z], i) => (
      <mesh key={i} position={[x, -0.65, z]}>
        <boxGeometry args={[0.12, 1.1, 0.12]} />
        <meshStandardMaterial color="#4f311d" />
      </mesh>
    ))}
    {[-2.0, 0, 2.0].map((x, i) => <Cabinet key={`b${i}`} pos={[x, -1.2, -3.2]} seed={i + 1} />)}
    {[-2.0, 0, 2.0].map((x, i) => <Cabinet key={`f${i}`} pos={[x, -1.2, 4.2]} yaw={Math.PI} seed={i + 5} />)}
    {[-1, 1].map((s) => <Cabinet key={`s${s}`} pos={[s * 4.2, -1.2, 0.5]} yaw={-s * Math.PI / 2} seed={s + 9} />)}
  </>
);

// washbasin with warm water and steam (rim at y ≈ 0.45, water at y ≈ 0.2)
export const Basin: React.FC<{ t: number }> = ({ t }) => {
  const geo = useMemo(() => {
    const pts = [[0, 0], [0.75, 0], [1.0, 0.12], [1.18, 0.35], [1.25, 0.46], [1.2, 0.47], [1.1, 0.36], [0.93, 0.14], [0.7, 0.04], [0, 0.04]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 12).toNonIndexed();
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#e9eef2" flatShading roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.07, 12]} />
        <meshStandardMaterial color="#7cc4d8" transparent opacity={0.6} roughness={0.1} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const k = (t * 0.35 + i / 8) % 1;
        return (
          <mesh key={i} position={[Math.sin(i * 2.3) * 0.6 + Math.sin(t + i) * 0.1, 0.3 + k * 1.2, Math.cos(i * 2.3) * 0.5]}
            scale={0.07 + k * 0.12}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.35 * (1 - k)} />
          </mesh>
        );
      })}
    </>
  );
};

// thought cloud with falling rain drops
export const RainThought: React.FC<{ t: number; s?: number }> = ({ t, s = 1 }) => (
  <group scale={s}>
    {[[0, 0, 0, 0.28], [0.3, 0.05, 0, 0.22], [-0.3, 0.02, 0, 0.22], [0.12, 0.2, 0, 0.22], [-0.15, 0.18, 0, 0.2]].map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]} scale={r}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#c9d3df" flatShading />
      </mesh>
    ))}
    {Array.from({ length: 6 }, (_, i) => {
      const k = (t * 1.6 + i / 6) % 1;
      return (
        <mesh key={`d${i}`} position={[-0.35 + i * 0.14, -0.25 - k * 0.5, 0.05]} scale={[0.025, 0.07, 0.025]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#4aa3e0" transparent opacity={1 - k} />
        </mesh>
      );
    })}
    {[[-0.35, -0.42, 0.06], [-0.5, -0.62, 0.04]].map(([x, y, r], i) => (
      <mesh key={`b${i}`} position={[x - 0.1, y - 0.1, 0]} scale={r}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#c9d3df" flatShading />
      </mesh>
    ))}
  </group>
);
