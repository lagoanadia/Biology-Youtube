// Reusable warm, dry environment for reptiles: sunny sky backdrop, warm key light, faceted sand ground with rocks,
// a zoo enclosure (back wall + heat lamp) and a small tropical island in a turquoise sea (Komodo-like).
import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { facet, rng } from "../lib/lowpoly";

export type Sky = "day" | "warm" | "zoo";

const SKY: Record<Sky, string> = {
  day: "linear-gradient(to bottom, #6fb6e6 0%, #b8e1f2 55%, #f1e7c8 100%)",
  warm: "linear-gradient(to bottom, #f2b36b 0%, #f5d59a 45%, #e9c98e 100%)",
  zoo: "linear-gradient(to bottom, #3a3128 0%, #5a4a38 55%, #6e5b44 100%)",
};
const FOG: Record<Sky, string> = { day: "#cfe6ef", warm: "#efd29a", zoo: "#5a4a38" };

export const IslandBackdrop: React.FC<{ sky?: Sky }> = ({ sky = "day" }) => <AbsoluteFill style={{ background: SKY[sky] }} />;

export const IslandLights: React.FC<{ sky?: Sky; light?: number; fogNear?: number; fogFar?: number }> = ({
  sky = "day", light = 1, fogNear = 8, fogFar = 30,
}) => (
  <>
    <fog attach="fog" args={[FOG[sky], fogNear, fogFar]} />
    <hemisphereLight args={["#fff4dc", sky === "zoo" ? "#5a4026" : "#c9a874", 0.95 * light]} />
    <directionalLight position={[3, 7, 4]} intensity={2.4 * light} color={sky === "zoo" ? "#ffcf8a" : "#fff1d0"} />
    <directionalLight position={[-4, 2, -3]} intensity={0.5 * light} color="#bfe3ff" />
  </>
);

// faceted sand ground (y≈0) with a few rocks
export const Sand: React.FC<{ size?: number; color?: string; seed?: number; rocks?: number }> = ({ size = 16, color = "#d9c08e", seed = 3, rocks = 6 }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, 24, 24);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const r = rng(seed);
    for (let i = 0; i < pos.count; i++) pos.setY(i, (r() - 0.5) * 0.06);
    const f = g.toNonIndexed();
    f.computeVertexNormals();
    return f;
  }, [size, seed]);
  const stones = useMemo(() => {
    const r = rng(seed + 4);
    return Array.from({ length: rocks }, () => ({
      p: [(r() - 0.5) * size * 0.5, 0, -1.5 - r() * size * 0.3] as [number, number, number],
      s: 0.25 + r() * 0.55,
      g: facet(new THREE.IcosahedronGeometry(1, 0), 0.2, Math.floor(r() * 100)),
    }));
  }, [size, seed, rocks]);
  return (
    <>
      <mesh geometry={geo}>
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      {stones.map((st, i) => (
        <mesh key={i} geometry={st.g} position={[st.p[0], st.s * 0.4, st.p[2]]} scale={[st.s * 1.3, st.s * 0.8, st.s]}>
          <meshStandardMaterial color={i % 2 ? "#8c7e6a" : "#a19479"} flatShading roughness={0.95} />
        </mesh>
      ))}
    </>
  );
};

// zoo enclosure: rock wall behind, a log, and a glowing heat lamp
export const ZooEnclosure: React.FC<{ t: number }> = ({ t }) => {
  const wall = useMemo(() => {
    const g = new THREE.BoxGeometry(14, 4, 0.6, 14, 6, 1);
    return facet(g, 0.04, 9);
  }, []);
  return (
    <>
      <mesh geometry={wall} position={[0, 2, -3.5]}>
        <meshStandardMaterial color="#8a7660" flatShading roughness={0.95} />
      </mesh>
      <mesh position={[-1.6, 0.18, -1.6]} rotation={[0, 0.5, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.2, 2.2, 7]} />
        <meshStandardMaterial color="#6b5039" flatShading />
      </mesh>
      {/* heat lamp */}
      <group position={[0.8, 3.2, -1.8]}>
        <mesh>
          <coneGeometry args={[0.35, 0.4, 8, 1, true]} />
          <meshStandardMaterial color="#3b3b3b" flatShading side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.12, 0]} scale={0.14}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={new THREE.Color("#ffb347").multiplyScalar(1 + 0.08 * Math.sin(t * 3))} />
        </mesh>
        <pointLight position={[0, -0.4, 0]} intensity={4} distance={6} color="#ffb347" />
      </group>
    </>
  );
};

// a small sandy island with palms in a turquoise sea (the sea surface sits at y = -0.05)
export const LoneIsland: React.FC<{ t: number; radius?: number }> = ({ t, radius = 2.4 }) => {
  const island = useMemo(() => {
    const g = new THREE.CylinderGeometry(radius * 0.85, radius * 1.15, 0.5, 10, 2);
    return facet(g, 0.08, 6);
  }, [radius]);
  const sea = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 60, 30, 30);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const waves = useMemo(() => {
    const g = sea.clone();
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, 0.05 * Math.sin(x * 0.8 + t * 1.2) + 0.04 * Math.sin(z * 1.1 - t));
    }
    const f = g.toNonIndexed();
    f.computeVertexNormals();
    g.dispose();
    return f;
  }, [sea, t]);
  return (
    <>
      <mesh geometry={waves} position={[0, -0.1, 0]}>
        <meshStandardMaterial color="#2fb6c4" flatShading roughness={0.3} transparent opacity={0.92} />
      </mesh>
      <mesh geometry={island} position={[0, -0.2, 0]}>
        <meshStandardMaterial color="#e4cf9b" flatShading roughness={1} />
      </mesh>
      {[[-1.2, -0.8, 0.3], [1.0, -1.1, -0.2], [0.2, -1.7, 0.1]].map(([x, z, lean], i) => (
        <Palm key={i} pos={[x, 0, z]} lean={lean} t={t + i} />
      ))}
    </>
  );
};

export const Palm: React.FC<{ pos: [number, number, number]; lean?: number; t: number; height?: number }> = ({ pos, lean = 0.2, t, height = 2.2 }) => (
  <group position={pos} rotation={[0, 0, lean]}>
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[0.06, 0.1, height, 6]} />
      <meshStandardMaterial color="#8b6a45" flatShading />
    </mesh>
    {Array.from({ length: 7 }, (_, i) => (
      <mesh key={i} position={[0, height, 0]} rotation={[0.9 + Math.sin(t * 1.3 + i) * 0.06, (i / 7) * Math.PI * 2, 0]}>
        <boxGeometry args={[0.16, 0.02, 1.1]} />
        <meshStandardMaterial color={i % 2 ? "#3f8f3a" : "#4fa547"} flatShading />
      </mesh>
    ))}
  </group>
);
