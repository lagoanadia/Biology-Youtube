// Low-poly great potoo (Nyctibius grandis): mottled grey-brown bark-like plumage, broad flat head, huge gape with a tiny
// hooked bill, big eyes (yellow at night), long tail; perches upright on a broken branch stub.
// eyes: 0 closed (eyelid with a slit) → 1 open · point: 0 relaxed → 1 stretched, bill to the sky (looks like a branch)
// gape: mouth opening 0..1 · fly: wings spread and flapping 0..1 · glow: eyeshine at night.
// Also: Moth (sloth moths / potoo prey), Hawk silhouette, BranchStub.
import { useMemo } from "react";
import * as THREE from "three";
import { facet, lerp, rng } from "../lib/lowpoly";

const BARK = ["#8a7d6d", "#6f6457", "#a39684", "#5e544a", "#b3a793"].map((c) => new THREE.Color(c));

// mottled vertex colours (per facet) so the bird reads as bark
const mottle = (g: THREE.BufferGeometry, seed: number) => {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const r = rng(seed);
  for (let i = 0; i < pos.count; i += 3) {
    const c = BARK[Math.floor(r() * BARK.length)];
    for (let q = 0; q < 3; q++) c.toArray(colors, (i + q) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
};

export const Potoo: React.FC<{ t: number; eyes?: number; point?: number; gape?: number; fly?: number; glow?: number }> = ({
  t, eyes = 0, point = 0, gape = 0, fly = 0, glow = 0,
}) => {
  const geo = useMemo(() => {
    const body = mottle(facet(new THREE.IcosahedronGeometry(1, 1), 0.08, 3), 5);
    const head = mottle(facet(new THREE.IcosahedronGeometry(1, 1), 0.06, 8), 9);
    const tail = mottle(facet(new THREE.ConeGeometry(1, 1, 5, 2), 0.05, 12), 13);
    const wing = mottle(facet(new THREE.IcosahedronGeometry(1, 0), 0.05, 14), 15);
    return { body, head, tail, wing };
  }, []);
  const flap = Math.sin(t * 9) * 0.6 * fly;
  // point: the whole bird stretches thin and tips its bill up to the sky
  const stretch = lerp(1, 1.18, point);
  const thin = lerp(1, 0.82, point);
  const lid = 1 - eyes; // 1 = closed
  return (
    <group scale={[thin, stretch, thin]}>
      {/* body: upright, slightly leaning back */}
      <mesh geometry={geo.body} position={[0, 0, 0]} scale={[0.32, 0.55, 0.3]} rotation={[lerp(-0.12, 0, point), 0, 0]}>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>
      {/* tail hanging down along the branch */}
      <mesh geometry={geo.tail} position={[0, -0.75, -0.06]} rotation={[Math.PI + 0.08, 0, 0]} scale={[0.14, 0.6, 0.08]}>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>
      {/* wings: folded on the sides, spread when flying */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.26, 0.15, -0.04]} rotation={[0, 0, s * lerp(0.08, flap * 0.7, fly)]}>
          <mesh geometry={geo.wing} position={[s * lerp(0.02, 0.45, fly), lerp(-0.25, 0, fly), 0]}
            scale={[lerp(0.08, 0.5, fly), lerp(0.42, 0.06, fly), lerp(0.2, 0.22, fly)]}>
            <meshStandardMaterial vertexColors flatShading roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* head (tips back to point the bill up) */}
      <group position={[0, 0.58, 0.02]} rotation={[lerp(0, -1.05, point), 0, 0]}>
        <mesh geometry={geo.head} scale={[0.27, 0.2, 0.25]}>
          <meshStandardMaterial vertexColors flatShading roughness={0.95} />
        </mesh>
        {/* eyes: big, on the front-sides; eyelid with a slit when closed */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.13, 0.04, 0.17]} rotation={[0, s * 0.45, 0]}>
            <mesh scale={0.085}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#f2b31c" emissive="#ffb000" emissiveIntensity={0.25 + glow * 1.6} roughness={0.2} flatShading />
            </mesh>
            <mesh position={[0, 0, 0.06]} scale={[0.03, 0.05, 0.03]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#120a04" />
            </mesh>
            {/* eyelid: scales down from the top as the eye opens */}
            {lid > 0.03 && (
              <mesh position={[0, lerp(0.09, 0.02, lid), 0.012]} scale={[0.092, 0.092 * lid, 0.092]}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial color="#8a7d6d" flatShading roughness={0.95} />
              </mesh>
            )}
            {/* the slit in the closed eyelid */}
            {lid > 0.5 && (
              <mesh position={[0, 0.0, 0.09]} scale={[0.05, 0.006, 0.01]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#1a1208" />
              </mesh>
            )}
          </group>
        ))}
        {/* tiny hooked bill on top of the huge mouth */}
        <mesh position={[0, -0.02, 0.25]} rotation={[0.9, 0, 0]} scale={[0.03, 0.06, 0.03]}>
          <coneGeometry args={[1, 1, 4]} />
          <meshStandardMaterial color="#2a241c" flatShading />
        </mesh>
        {/* the gape: upper and lower jaw open around a pink mouth */}
        <group position={[0, -0.07, 0.12]}>
          <mesh rotation={[-0.15 + gape * 0.7, 0, 0]} position={[0, -0.04 - gape * 0.1, 0.06]} scale={[0.25, 0.03, 0.18]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#6f6457" flatShading />
          </mesh>
          {gape > 0.02 && (
            <group position={[0, -0.02 * gape, 0.17]}>
              {/* pink rim of the gape */}
              <mesh scale={[0.25, 0.17 * gape + 0.01, 1]}>
                <circleGeometry args={[1, 10]} />
                <meshStandardMaterial color="#e8909a" flatShading side={THREE.DoubleSide} />
              </mesh>
              {/* dark throat */}
              <mesh position={[0, 0, 0.005]} scale={[0.19, 0.12 * gape + 0.005, 1]}>
                <circleGeometry args={[1, 10]} />
                <meshBasicMaterial color="#3a0c14" side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  );
};

// small moth (brown wings that flutter)
export const Moth: React.FC<{ t: number; color?: string; flutter?: number }> = ({ t, color = "#8f7a5a", flutter = 1 }) => {
  const f = Math.sin(t * 30) * 0.7 * flutter;
  return (
    <group>
      <mesh scale={[0.05, 0.05, 0.18]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4a3a28" flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} rotation={[0, 0, s * (0.3 + f)]}>
          <mesh position={[s * 0.16, 0, 0]} scale={[0.17, 0.012, 0.13]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={color} flatShading side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// dark hawk silhouette gliding over (the "danger")
export const Hawk: React.FC<{ t: number }> = ({ t }) => (
  <group rotation={[0, 0, Math.sin(t * 2) * 0.05]}>
    <mesh scale={[0.12, 0.08, 0.5]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#1c1814" flatShading />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.55, 0.02, 0.05]} rotation={[0, s * 0.25, s * 0.08]} scale={[0.55, 0.02, 0.2]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#1c1814" flatShading />
      </mesh>
    ))}
    <mesh position={[0, 0, -0.55]} scale={[0.18, 0.02, 0.14]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#1c1814" flatShading />
    </mesh>
  </group>
);

// a broken branch stub pointing up (the potoo sits on top of one; also shown alone for comparison)
export const BranchStub: React.FC<{ h?: number; r?: number; seed?: number }> = ({ h = 1.4, r = 0.17, seed = 2 }) => {
  const geo = useMemo(() => mottle(facet(new THREE.CylinderGeometry(r * 0.75, r, h, 7, 3), 0.07, seed), seed + 1), [h, r, seed]);
  return (
    <group>
      <mesh geometry={geo} position={[0, -h / 2, 0]}>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
      {/* jagged broken top */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos(i * 2.1) * r * 0.4, 0.06, Math.sin(i * 2.1) * r * 0.4]} scale={[0.05, 0.14 + i * 0.03, 0.05]}>
          <coneGeometry args={[1, 1, 4]} />
          <meshStandardMaterial color="#6f6457" flatShading />
        </mesh>
      ))}
    </group>
  );
};
