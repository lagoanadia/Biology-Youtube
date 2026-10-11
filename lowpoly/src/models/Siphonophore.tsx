// Low-poly Christmas tree siphonophore (Forskalia): gold gas float on top (the "star"), a spiral cone of glassy
// swimming bells (the "tree"), then the stem with red feeding polyps and branching tentacles whose stinging knobs look
// like ornaments. pulse: bells contract · spin: rotation (rad) · sting: ornaments glow · broken: pieces drift apart
// · feed: feeding polyps bulge.
import { useMemo } from "react";
import * as THREE from "three";
import { lerp, rng } from "../lib/lowpoly";

const BELLS = 46;
const BELL = new THREE.Color("#b4f5dc");
const ORNAMENT = new THREE.Color("#ff3d4f");
const POLYP = new THREE.Color("#ff8a5c");

type Piece = { pos: THREE.Vector3; rot: THREE.Euler; drift: THREE.Vector3; spin: number };

export const Siphonophore: React.FC<{ t: number; pulse?: number; spin?: number; sting?: number; broken?: number; feed?: number; seed?: number }> = ({
  t, pulse = 1, spin = 0, sting = 0, broken = 0, feed = 0, seed = 1,
}) => {
  const parts = useMemo(() => {
    const r = rng(seed);
    const piece = (pos: THREE.Vector3, rot: THREE.Euler): Piece => ({
      pos, rot, drift: new THREE.Vector3(r() - 0.5, (r() - 0.5) * 0.6, r() - 0.5).normalize().multiplyScalar(0.8 + r() * 1.2), spin: (r() - 0.5) * 4,
    });
    // bells on a spiral, the cone widens downward like a tree
    const bells = Array.from({ length: BELLS }, (_, i) => {
      const u = i / (BELLS - 1);
      const a = i * 2.4;
      const rad = 0.08 + u * 0.42;
      const y = 1.1 - u * 1.4;
      return piece(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad), new THREE.Euler(0, -a, 0.9 + u * 0.3));
    });
    // stem clusters: feeding polyp + branching tentacle with ornament knobs
    const clusters = Array.from({ length: 7 }, (_, i) => {
      const a = i * 2.1;
      const y = -0.45 - i * 0.22;
      return {
        polyp: piece(new THREE.Vector3(Math.cos(a) * 0.12, y, Math.sin(a) * 0.12), new THREE.Euler(0, -a, 1.2)),
        a,
        y,
        knobs: Array.from({ length: 6 }, (_, k) => piece(
          new THREE.Vector3(Math.cos(a + (k - 2.5) * 0.25) * (0.3 + k * 0.07), y - 0.08 - k * 0.07, Math.sin(a + (k - 2.5) * 0.25) * (0.3 + k * 0.07)),
          new THREE.Euler(),
        )),
      };
    });
    return { bells, clusters };
  }, [seed]);
  const off = (p: Piece) => p.pos.clone().addScaledVector(p.drift, broken);
  const glow = 0.25 + sting * (0.75 + 0.25 * Math.sin(t * 9));
  return (
    <group rotation={[0, spin, 0]}>
      {/* stem */}
      {broken < 0.5 && (
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.018, 0.012, 2.4, 4]} />
          <meshStandardMaterial color="#ffe8d6" flatShading transparent opacity={1 - broken * 2} />
        </mesh>
      )}
      {/* gold gas float: the star on top */}
      <mesh position={[0, 1.24, 0]} scale={[0.07, 0.12, 0.07]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffcf5a" emissive="#ffb020" emissiveIntensity={0.7} flatShading />
      </mesh>
      {parts.bells.map((b, i) => {
        const squeeze = 1 - pulse * 0.18 * Math.max(0, Math.sin(t * 5 - i * 0.35));
        const p = off(b);
        return (
          <mesh key={i} position={p} rotation={[b.rot.x + b.spin * broken, b.rot.y, b.rot.z]} scale={[0.1 * squeeze, 0.05, 0.08 * squeeze]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={BELL} emissive={BELL} emissiveIntensity={0.4} flatShading transparent opacity={0.62}
              depthWrite={false} />
          </mesh>
        );
      })}
      {parts.clusters.map((c, i) => {
        const pp = off(c.polyp);
        return (
          <group key={i}>
            <mesh position={pp} rotation={c.polyp.rot} scale={[0.06 * (1 + feed * 0.6), 0.1 * (1 + feed * 0.5), 0.06 * (1 + feed * 0.6)]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={POLYP} emissive={POLYP} emissiveIntensity={0.2 + feed * 0.5} flatShading />
            </mesh>
            {/* tentacle: thin line from the polyp out through the knobs */}
            {broken < 0.5 &&
              c.knobs.map((k, j) => {
                const from = j === 0 ? pp : off(c.knobs[j - 1]);
                const to = off(k);
                const mid = from.clone().add(to).multiplyScalar(0.5);
                const len = from.distanceTo(to);
                const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
                return (
                  <mesh key={`l${j}`} position={mid} quaternion={q}>
                    <cylinderGeometry args={[0.005, 0.005, len, 3]} />
                    <meshStandardMaterial color="#ffd6c8" flatShading />
                  </mesh>
                );
              })}
            {c.knobs.map((k, j) => (
              <mesh key={j} position={off(k).add(new THREE.Vector3(0, Math.sin(t * 2 + i + j) * 0.015, 0))} scale={lerp(0.022, 0.03, sting)}>
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color={j % 3 === 1 ? "#ffcf5a" : ORNAMENT} emissive={j % 3 === 1 ? "#ffb020" : ORNAMENT}
                  emissiveIntensity={glow} flatShading />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};
