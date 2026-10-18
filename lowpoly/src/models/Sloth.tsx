// Low-poly brown-throated three-toed sloth (Bradypus variegatus): shaggy grey-brown fur with green algae patches,
// round face with a pale mask, dark eye stripes and a "smile", long arms with three long curved claws, short tail.
// Default pose: hanging/climbing on a vertical trunk (the trunk is on its -z side, the sloth hugs it).
// climb: 0..1 climbing cycle phase (arms/legs alternate) · algae: green tint of the fur 0..1 · chew: jaw motion
// · squat: 0 = climbing pose, 1 = sitting at the base of the tree (the weekly poop trip).
import { useMemo } from "react";
import * as THREE from "three";
import { facet, lerp, rng } from "../lib/lowpoly";

const FUR = ["#8c7c66", "#7a6b57", "#9a8a72", "#6f6150"].map((c) => new THREE.Color(c));
const ALGAE = new THREE.Color("#6f8f4a");

const shaggy = (g: THREE.BufferGeometry, seed: number, algae: number) => {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const r = rng(seed);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    c.copy(FUR[Math.floor(r() * FUR.length)]);
    if (r() < 0.55) c.lerp(ALGAE, algae * (0.5 + r() * 0.5));
    for (let q = 0; q < 3; q++) c.toArray(colors, (i + q) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
};

const Limb: React.FC<{ from: [number, number, number]; rot: [number, number, number]; len: number; algae: number; seed: number }> = ({
  from, rot, len, algae, seed,
}) => {
  const geo = useMemo(() => shaggy(facet(new THREE.CylinderGeometry(0.06, 0.08, len, 6, 2), 0.1, seed), seed, algae), [len, seed, algae]);
  return (
    <group position={from} rotation={rot}>
      <mesh geometry={geo} position={[0, -len / 2, 0]}>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
      {/* three long curved claws */}
      {[-1, 0, 1].map((k) => (
        <mesh key={k} position={[k * 0.03, -len - 0.07, 0.03]} rotation={[0.6, 0, 0]} scale={[0.012, 0.11, 0.012]}>
          <coneGeometry args={[1, 1, 4]} />
          <meshStandardMaterial color="#e8dcc0" flatShading />
        </mesh>
      ))}
    </group>
  );
};

export const Sloth: React.FC<{ t: number; climb?: number; algae?: number; chew?: number; squat?: number }> = ({
  t, climb = 0, algae = 0.5, chew = 0, squat = 0,
}) => {
  const aq = Math.round(algae * 10) / 10;
  const geo = useMemo(() => ({
    body: shaggy(facet(new THREE.IcosahedronGeometry(1, 1), 0.12, 3), 4, aq),
    head: shaggy(facet(new THREE.IcosahedronGeometry(1, 1), 0.06, 7), 8, aq * 0.6),
  }), [aq]);
  const a = Math.sin(climb * Math.PI * 2) * 0.35; // alternating reach
  return (
    <group>
      {/* body: hugging the trunk (lean in), or sitting when squat */}
      <group rotation={[lerp(-0.25, 0.1, squat), 0, 0]}>
        <mesh geometry={geo.body} scale={[0.32, 0.42, 0.26]}>
          <meshStandardMaterial vertexColors flatShading roughness={1} />
        </mesh>
        {/* arms reach up and around the trunk */}
        <Limb from={[-0.24, 0.25, -0.05]} rot={[lerp(-2.6 + a, -0.4, squat), 0, lerp(-0.35, -0.6, squat)]} len={0.55} algae={aq} seed={11} />
        <Limb from={[0.24, 0.25, -0.05]} rot={[lerp(-2.6 - a, -0.4, squat), 0, lerp(0.35, 0.6, squat)]} len={0.55} algae={aq} seed={12} />
        {/* legs grip lower down */}
        <Limb from={[-0.18, -0.3, -0.05]} rot={[lerp(-0.6 - a, -1.4, squat), 0, -0.3]} len={0.4} algae={aq} seed={13} />
        <Limb from={[0.18, -0.3, -0.05]} rot={[lerp(-0.6 + a, -1.4, squat), 0, 0.3]} len={0.4} algae={aq} seed={14} />
        {/* head, looking back over the shoulder at the camera (+z) */}
        <group position={[0, 0.43, 0.06]} rotation={[0.1, Math.sin(t * 0.5) * 0.15, 0]}>
          <mesh geometry={geo.head} scale={[0.18, 0.16, 0.16]}>
            <meshStandardMaterial vertexColors flatShading roughness={1} />
          </mesh>
          {/* pale face mask */}
          <mesh position={[0, -0.01, 0.1]} scale={[0.14, 0.11, 0.07]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#e6dcc6" flatShading />
          </mesh>
          {/* dark eye stripes + eyes */}
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.06, 0.02, 0.155]} rotation={[0, 0, s * -0.35]} scale={[0.05, 0.018, 0.01]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#2a1f16" />
              </mesh>
              <mesh position={[s * 0.05, 0.02, 0.165]} scale={0.014}>
                <icosahedronGeometry args={[1, 0]} />
                <meshBasicMaterial color="#0a0604" />
              </mesh>
            </group>
          ))}
          {/* nose and the famous "smile" */}
          <mesh position={[0, -0.025, 0.17]} scale={[0.022, 0.016, 0.012]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#1a120c" />
          </mesh>
          <mesh position={[0, -0.06 - chew * 0.01, 0.16]} rotation={[0, 0, Math.PI]} scale={[0.035, 0.035, 0.01]}>
            <torusGeometry args={[1, 0.18, 3, 10, Math.PI]} />
            <meshBasicMaterial color="#3a2a1e" />
          </mesh>
        </group>
        {/* stubby tail */}
        <mesh position={[0, -0.42, -0.08]} scale={[0.05, 0.06, 0.05]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7a6b57" flatShading />
        </mesh>
      </group>
    </group>
  );
};
