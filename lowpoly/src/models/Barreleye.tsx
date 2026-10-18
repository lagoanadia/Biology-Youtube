// Low-poly barreleye (Macropinna microstoma): small dark-brown fish with large scales, a clear fluid-filled shield
// (dome) over the top of the head, two green tubular eyes INSIDE the dome, and two dark nostrils (nares) on the snout
// that look like eyes. Big flat pectoral fins held out to hover motionless.
// look: 0 = tubular eyes point straight up · 1 = rotated forward · dome: shield opacity · nares: highlight the nostrils.
import { useMemo } from "react";
import * as THREE from "three";
import { facet, lerp } from "../lib/lowpoly";

const BODY = new THREE.Color("#3a2a24");
const BODY_DARK = new THREE.Color("#22170f");
const GREEN = new THREE.Color("#7dff6a");

const PROFILE: [number, number][] = [[0, -1.0], [0.05, -0.92], [0.12, -0.7], [0.2, -0.4], [0.26, -0.1], [0.28, 0.2], [0.25, 0.42], [0.17, 0.58], [0.06, 0.68], [0, 0.7]];

export const Barreleye: React.FC<{ t: number; look?: number; dome?: number; nares?: number; swim?: number }> = ({
  t, look = 0, dome = 0.28, nares = 0, swim = 0.3,
}) => {
  const body = useMemo(() => {
    const g = new THREE.LatheGeometry(PROFILE.map(([r, z]) => new THREE.Vector2(r, z)), 9);
    g.rotateX(Math.PI / 2);
    g.scale(0.9, 1.05, 1);
    const f = facet(g, 0.04, 6);
    const pos = f.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 3) {
      const k = (i / 3) % 2 ? BODY : BODY_DARK; // alternating facets read as big scales
      for (let q = 0; q < 3; q++) k.toArray(colors, (i + q) * 3);
    }
    f.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return f;
  }, []);
  const tilt = lerp(0, Math.PI / 2 - 0.25, look); // eyes rotate from pointing up to pointing forward
  const fin = Math.sin(t * 1.6) * 0.08 * swim;
  return (
    <group rotation={[0, Math.sin(t * 0.8) * 0.05 * swim, 0]}>
      <mesh geometry={body}>
        <meshStandardMaterial vertexColors flatShading roughness={0.5} metalness={0.15} />
      </mesh>
      {/* tubular green eyes inside the head */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.085, 0.2, 0.26]} rotation={[tilt, 0, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.055, 0.065, 0.2, 7]} />
            <meshStandardMaterial color="#2c5c30" emissive="#1f6b22" emissiveIntensity={0.4} flatShading />
          </mesh>
          <mesh position={[0, 0.21, 0]} scale={[0.06, 0.03, 0.06]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={1.1} flatShading />
          </mesh>
        </group>
      ))}
      {/* the clear fluid-filled shield over the head */}
      <mesh position={[0, 0.2, 0.22]} scale={[0.27, 0.27, 0.42]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshPhysicalMaterial color="#cfefff" transparent opacity={dome} roughness={0.05} metalness={0} clearcoat={1}
          flatShading depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* nostrils (nares): the two dark "eyes" on the snout */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.1, 0.05, 0.6]} scale={0.045}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#0a0706" roughness={0.2} metalness={0.4} flatShading />
        </mesh>
      ))}
      {/* red rings drawn around the nostrils when they are pointed out */}
      {nares > 0.01 &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.1, 0.05, 0.66]} scale={nares}>
            <torusGeometry args={[0.085, 0.013, 5, 18]} />
            <meshBasicMaterial color="#ff3d4f" />
          </mesh>
        ))}
      {/* tiny mouth at the tip */}
      <mesh position={[0, -0.04, 0.69]} scale={[0.04, 0.012, 0.02]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#120b08" />
      </mesh>
      {/* big flat pectoral fins held out sideways (hovering) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.32, -0.1, 0.05]} rotation={[0, s * 0.3, s * (-0.15 + fin)]} scale={[0.36, 0.012, 0.22]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6b4a3c" transparent opacity={0.75} flatShading />
        </mesh>
      ))}
      {/* pelvic fins, dorsal and tail */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.16, -0.24, -0.3]} rotation={[0, 0, s * -0.5]} scale={[0.2, 0.01, 0.12]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6b4a3c" transparent opacity={0.75} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.27, -0.35]} scale={[0.012, 0.1, 0.12]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4a352a" flatShading />
      </mesh>
      <group position={[0, 0, -0.98]} rotation={[0, Math.sin(t * 2) * 0.2 * swim, 0]}>
        <mesh position={[0, 0, -0.1]} scale={[0.012, 0.16, 0.12]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#4a352a" flatShading />
        </mesh>
      </group>
    </group>
  );
};
