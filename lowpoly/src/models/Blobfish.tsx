// Low-poly blobfish (Psychrolutes marcidus). melt 0 = how it looks at depth (tadpole-shaped fish, big rounded head,
// tapering body, pale pink-beige) · melt 1 = the famous surface "blob" (decompression: head sags, droopy nose over the
// mouth, body flattens). sad: mouth corners down. Geometry is recomputed from `melt` (pure function, deterministic).
import { useMemo } from "react";
import * as THREE from "three";
import { facet, lerp } from "../lib/lowpoly";

const SKIN = new THREE.Color("#e9b9a8");
const SKIN_DARK = new THREE.Color("#c98f80");
const BLOB = new THREE.Color("#f2a7b0");

// radius along the body (z from tail −1 to head +0.75)
const PROFILE: [number, number][] = [[0, -1.05], [0.06, -0.95], [0.12, -0.7], [0.22, -0.4], [0.36, -0.05], [0.47, 0.25], [0.5, 0.45], [0.46, 0.62], [0.34, 0.74], [0.16, 0.8], [0, 0.82]];

export const Blobfish: React.FC<{ t: number; melt?: number; swim?: number; seed?: number }> = ({ t, melt = 0, swim = 1, seed = 3 }) => {
  const m = Math.round(melt * 20) / 20; // quantised so the geometry is cached between frames
  const body = useMemo(() => {
    const lathe = new THREE.LatheGeometry(PROFILE.map(([r, z]) => new THREE.Vector2(r, z)), 10, 0, Math.PI * 2);
    lathe.rotateX(Math.PI / 2); // lathe axis (y) → z
    const g = facet(lathe, 0.035, seed);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const head = THREE.MathUtils.smoothstep(v.z, 0.0, 0.7); // 0 tail → 1 head
      // melt: flatten and widen, everything sags toward the bottom
      v.y = v.y * lerp(1, 0.7, m * head) - m * head * 0.18 * (1 + v.z);
      v.x *= lerp(1, 1.22, m * head);
      // droopy nose: the front-centre of the head hangs down over the mouth
      const nose = Math.exp(-((v.x / 0.2) ** 2)) * THREE.MathUtils.smoothstep(v.z, 0.55, 0.85);
      v.y -= m * nose * 0.32;
      v.z += m * nose * 0.12;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let f = 0; f < pos.count; f += 3) {
      const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
      c.copy(cy > 0.12 ? SKIN_DARK : SKIN).lerp(BLOB, m * 0.8);
      for (let k = 0; k < 3; k++) c.toArray(colors, (f + k) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [m, seed]);
  const wag = Math.sin(t * 3.2) * 0.25 * swim * (1 - m);
  const eyeY = lerp(0.2, 0.08, m);
  return (
    <group rotation={[0, wag * 0.15, 0]}>
      <mesh geometry={body}>
        <meshStandardMaterial vertexColors flatShading roughness={0.55} />
      </mesh>
      {/* small dark eyes, sunk into the head when melted */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * lerp(0.3, 0.36, m), eyeY, lerp(0.56, 0.5, m)]} scale={lerp(0.07, 0.055, m)}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#1c1416" roughness={0.2} metalness={0.3} flatShading />
        </mesh>
      ))}
      {/* the famous droopy nose: a soft bulb that grows and sags over the mouth as it melts */}
      {m > 0.05 && (
        <mesh position={[0, lerp(0.05, -0.12, m), lerp(0.72, 0.86, m)]} rotation={[0.5, 0, 0]}
          scale={[0.17 * m + 0.02, 0.24 * m + 0.02, 0.15 * m + 0.02]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={BLOB} flatShading roughness={0.45} />
        </mesh>
      )}
      {/* wide mouth: a straight line at depth, a sad frown under the nose when melted */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * lerp(0.13, 0.2, m), lerp(-0.12, -0.42, m), lerp(0.74, 0.8, m)]}
          rotation={[0, s * 0.25, s * lerp(-0.05, 0.55, m)]} scale={[lerp(0.16, 0.2, m), 0.028, 0.04]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#6e3b3e" />
        </mesh>
      ))}
      {/* big fan-like pectoral fins */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.5, lerp(-0.1, -0.3, m), 0.05]}
          rotation={[0.2, s * 0.5, s * (0.5 + Math.sin(t * 2.4 + s) * 0.15 * (1 - m) + m * 0.6)]} scale={[0.32, 0.02, 0.24]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={SKIN_DARK} flatShading transparent opacity={0.9} />
        </mesh>
      ))}
      {/* tail fin */}
      <group position={[0, 0, -1]} rotation={[0, wag, 0]}>
        <mesh position={[0, 0, -0.12]} scale={[0.02, 0.2, 0.16]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={SKIN_DARK} flatShading />
        </mesh>
      </group>
    </group>
  );
};
