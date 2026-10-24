// Low-poly Texas horned lizard (flat, wide, spiky "horny toad": crown of horns behind the head, fringe of side spikes,
// dark blotches) and a coyote. Lizard: puff = inflates the body · flat on the ground, faces +z, ≈0.5 long.
// LIZARD_EYES: eye positions in lizard space (for the blood jets).
// Coyote: walk · shake (head shake 0..1) · jaw (mouth open 0..1) · drool · faces +z, feet on y = 0, shoulder ≈ 0.6.
import * as THREE from "three";
import { rng } from "../lib/lowpoly";

const SAND = "#c9a477";
const DARK = "#7a5a3a";

export const LIZARD_EYES: [number, number, number][] = [[-0.055, 0.075, 0.2], [0.055, 0.075, 0.2]];

export const HornedLizard: React.FC<{ t: number; puff?: number; walk?: number; color?: string }> = ({ t, puff = 0, walk = 0, color = SAND }) => {
  const s = 1 + puff * 0.35;
  const r = rng(4);
  const ph = t * 10 * walk;
  return (
    <group>
      {/* body: wide and flat */}
      <mesh position={[0, 0.06 + puff * 0.02, 0]} scale={[0.16 * s, 0.055 * s, 0.17 * s]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={color} flatShading roughness={0.9} />
      </mesh>
      {/* dark blotches + little back spikes */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.09 * s, 0.1 + puff * 0.04, Math.sin(a) * 0.09 * s]} scale={[0.03, 0.006, 0.025]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
        );
      })}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={`b${i}`} position={[(r() - 0.5) * 0.18 * s, 0.1 + puff * 0.04, (r() - 0.5) * 0.2 * s]} scale={[0.008, 0.02, 0.008]}>
          <coneGeometry args={[1, 1, 4]} />
          <meshStandardMaterial color="#e3c9a0" flatShading />
        </mesh>
      ))}
      {/* side fringe spikes */}
      {[-1, 1].map((sd) =>
        Array.from({ length: 6 }, (_, i) => (
          <mesh key={`f${sd}${i}`} position={[sd * 0.16 * s, 0.05, -0.1 + i * 0.04]} rotation={[0, 0, -sd * Math.PI / 2]} scale={[0.008, 0.03, 0.008]}>
            <coneGeometry args={[1, 1, 4]} />
            <meshStandardMaterial color="#e3c9a0" flatShading />
          </mesh>
        )),
      )}
      {/* head + crown of horns */}
      <group position={[0, 0.065, 0.17]}>
        <mesh scale={[0.075, 0.04, 0.07]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {[-2, -1, 0, 1, 2].map((i) => (
          <mesh key={i} position={[i * 0.025, 0.03 - Math.abs(i) * 0.004, -0.045]} rotation={[-0.9, 0, -i * 0.25]} scale={[0.009, i === 0 ? 0.035 : 0.045, 0.009]}>
            <coneGeometry args={[1, 1, 4]} />
            <meshStandardMaterial color="#efe0c2" flatShading />
          </mesh>
        ))}
        {[-1, 1].map((sd) => (
          <mesh key={`e${sd}`} position={[sd * 0.055, 0.01, 0.03]} scale={0.012}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#111" />
          </mesh>
        ))}
      </group>
      {/* legs + short tail */}
      {[[1, 0.1, 0], [-1, 0.1, Math.PI], [1, -0.1, Math.PI], [-1, -0.1, 0]].map(([sd, z, off], i) => (
        <mesh key={`l${i}`} position={[sd * 0.15, 0.02, z + Math.sin(ph + off) * 0.03 * walk]} rotation={[0, 0, sd * 1.1]} scale={[0.018, 0.07, 0.018]}>
          <cylinderGeometry args={[1, 1, 1, 4]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.035, -0.22]} rotation={[-Math.PI / 2 + 0.1, 0, 0]} scale={[0.025, 0.12, 0.02]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  );
};

const Seg: React.FC<{ a: THREE.Vector3; b: THREE.Vector3; r: number; r2?: number; color: string }> = ({ a, b, r, r2, color }) => {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[r2 ?? r, r, a.distanceTo(b), 6]} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
  );
};

export const Coyote: React.FC<{ t: number; walk?: number; shake?: number; jaw?: number; drool?: number; headDown?: number }> = ({
  t, walk = 0, shake = 0, jaw = 0, drool = 0, headDown = 0,
}) => {
  const coat = "#a88a62";
  const light = "#e3d3b5";
  const ph = t * 8 * walk;
  const bodyY = 0.46;
  const shakeYaw = Math.sin(t * 30) * 0.5 * shake;
  const headP = new THREE.Vector3(0, bodyY + 0.2 - headDown * 0.3, 0.52);
  return (
    <group>
      <mesh position={[0, bodyY, 0]} scale={[0.17, 0.19, 0.44]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={coat} flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, bodyY - 0.06, 0.05]} scale={[0.12, 0.12, 0.33]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={light} flatShading />
      </mesh>
      {[[1, 0.28, 0], [-1, 0.28, Math.PI], [1, -0.3, Math.PI], [-1, -0.3, 0]].map(([s, z, off], i) => {
        const sw = Math.sin(ph + off) * 0.45 * walk;
        const hip = new THREE.Vector3(s * 0.08, bodyY - 0.08, z);
        const foot = new THREE.Vector3(s * 0.08, 0.03, z + Math.sin(sw) * 0.18);
        foot.y += Math.max(0, Math.cos(ph + off)) * 0.05 * walk;
        return <Seg key={i} a={hip} b={foot} r={0.04} r2={0.055} color={coat} />;
      })}
      <Seg a={new THREE.Vector3(0, bodyY + 0.05, 0.3)} b={headP} r={0.09} r2={0.08} color={coat} />
      <group position={headP} rotation={[headDown * 0.6, shakeYaw, Math.sin(t * 30) * 0.15 * shake]}>
        <mesh scale={[0.1, 0.09, 0.11]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={coat} flatShading />
        </mesh>
        {/* long snout + lower jaw */}
        <mesh position={[0, -0.02, 0.14]} rotation={[Math.PI / 2, 0, 0]} scale={[0.045, 0.16, 0.04]}>
          <cylinderGeometry args={[0.6, 1, 1, 6]} />
          <meshStandardMaterial color={coat} flatShading />
        </mesh>
        <mesh position={[0, -0.02, 0.22]} scale={0.022}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#1a1412" />
        </mesh>
        <group position={[0, -0.05, 0.06]} rotation={[jaw * 0.6, 0, 0]}>
          <mesh position={[0, 0, 0.08]} scale={[0.035, 0.015, 0.09]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={light} flatShading />
          </mesh>
        </group>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.055, 0.1, -0.02]} rotation={[0, 0, -s * 0.2]} scale={[0.035, 0.07, 0.02]}>
              <coneGeometry args={[1, 1, 4]} />
              <meshStandardMaterial color={coat} flatShading />
            </mesh>
            <mesh position={[s * 0.05, 0.03, 0.08]} scale={0.014}>
              <icosahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#1a1208" />
            </mesh>
          </group>
        ))}
        {/* drool drips */}
        {drool > 0 &&
          [0, 1, 2].map((i) => {
            const k = (t * 1.5 + i / 3) % 1;
            return (
              <mesh key={i} position={[(i - 1) * 0.02, -0.08 - k * 0.25, 0.16]} scale={[0.008, 0.02 + k * 0.03, 0.008]}>
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#dff3ff" transparent opacity={drool * (1 - k * 0.5)} />
              </mesh>
            );
          })}
      </group>
      {/* bushy tail */}
      <mesh position={[0, bodyY - 0.1, -0.55]} rotation={[0.9 + Math.sin(t * 2) * 0.1, 0, 0]} scale={[0.07, 0.25, 0.07]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={coat} flatShading />
      </mesh>
    </group>
  );
};
