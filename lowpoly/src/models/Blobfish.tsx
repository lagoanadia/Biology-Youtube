// Low-poly blobfish (Psychrolutes marcidus).
// melt 0 = how it really looks at depth: tadpole shape, broad flattish head wider than tall, wide lipped mouth across
//          the front, dark eyes high on the sides, big fan pectoral fins, body tapering into a thin tail, pale
//          gelatinous skin.
// melt 1 = the famous surface "blob" (decompression damage): the soft head spreads and slumps like pudding, the snout
//          skin sags into the bulbous "nose" over a wide frown, eyes sink, the body lies flat.
// Geometry is a pure function of `melt` (quantised so it is cached between frames).
import { useMemo } from "react";
import * as THREE from "three";
import { facet, lerp } from "../lib/lowpoly";

const SKIN = new THREE.Color("#cfc6bd"); // pale grey-beige at depth
const SKIN_TOP = new THREE.Color("#a59a92");
const BLOB = new THREE.Color("#f0a9ae");
const BLOB_TOP = new THREE.Color("#e38f99");
const LIP = new THREE.Color("#c27f86");

// side profile: [radius, z] from the tail tip (z −1.35) to the blunt face (z +0.64)
const PROFILE: [number, number][] = [
  [0.0, -1.35], [0.05, -1.25], [0.08, -1.05], [0.12, -0.8], [0.19, -0.55], [0.29, -0.3], [0.42, -0.05], [0.53, 0.16],
  [0.58, 0.34], [0.57, 0.48], [0.5, 0.58], [0.34, 0.64], [0.0, 0.67],
];
const ss = THREE.MathUtils.smoothstep;

export const Blobfish: React.FC<{ t: number; melt?: number; swim?: number; seed?: number }> = ({ t, melt = 0, swim = 1, seed = 3 }) => {
  const m = Math.round(melt * 24) / 24;
  const body = useMemo(() => {
    const lathe = new THREE.LatheGeometry(PROFILE.map(([r, z]) => new THREE.Vector2(r, z)), 16);
    lathe.rotateX(Math.PI / 2); // lathe axis y → z
    const g = facet(lathe, 0.025, seed);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const head = ss(v.z, -0.35, 0.3); // 0 tail → 1 head
      // real shape: head wider than tall, flatter belly
      v.x *= lerp(1, 1.05, head);
      v.y *= v.y < 0 ? lerp(1, 0.9, head) : lerp(1, 1.12, head);
      // melt (surface, see the famous photo): the head becomes a tall rounded dome, the bottom spreads on the floor,
      // the tail half collapses flat behind it
      if (m > 0) {
        const floor = -0.3;
        v.y = v.y > 0 ? v.y * lerp(1, 1.25, m * head) : lerp(v.y, floor + (v.y - floor) * 0.3, m);
        v.x *= 1 + m * head * (v.y < 0 ? 0.1 : 0.04);
        v.y = lerp(v.y, floor + (v.y - floor) * 0.25, m * (1 - head));
        v.x *= 1 + m * (1 - head) * 0.6;
        v.z += m * head * 0.08;
        // jowls: the lower cheeks bulge out and droop on both sides of the mouth
        const jowl = ss(Math.abs(v.x), 0.2, 0.55) * ss(v.z, 0.15, 0.6) * (1 - ss(v.y, -0.1, 0.15));
        v.x += Math.sign(v.x) * m * jowl * 0.08;
        v.z += m * jowl * 0.06;
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const top = new THREE.Color();
    for (let f = 0; f < pos.count; f += 3) {
      const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
      c.copy(SKIN).lerp(BLOB, m);
      top.copy(SKIN_TOP).lerp(BLOB_TOP, m);
      c.lerp(top, ss(cy, -0.1, 0.25) * 0.7);
      for (let q = 0; q < 3; q++) c.toArray(colors, (f + q) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [m, seed]);

  // Face features sit ON the skin: rays shot from in front of the fish find the surface point (and normal) at a
  // given (x, y), so eyes, nose and lips follow the head whatever its shape.
  const face = useMemo(() => {
    const mesh = new THREE.Mesh(body);
    const ray = new THREE.Raycaster();
    const hit = (x: number, y: number) => {
      ray.set(new THREE.Vector3(x, y, 4), new THREE.Vector3(0, 0, -1));
      const h = ray.intersectObject(mesh)[0];
      const n = h?.face?.normal.clone() ?? new THREE.Vector3(0, 0, 1);
      return { p: h ? h.point.clone() : new THREE.Vector3(x, y, 0.6), n };
    };
    const mouthY = lerp(-0.2, -0.15, m);
    const half = lerp(0.34, 0.42, m);
    const lipPts = Array.from({ length: 13 }, (_, i) => {
      const x = lerp(-half, half, i / 12);
      const k = x / half;
      const y = mouthY + (1 - k * k) * lerp(0.03, 0.06, m) - k * k * lerp(0.05, 0.09, m); // corners turn down
      const { p, n } = hit(x, y);
      return p.add(n.multiplyScalar(0.012));
    });
    const lips = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts), 24, lerp(0.028, 0.05, m), 5, false);
    const ex = lerp(0.3, 0.27, m);
    const ey = lerp(0.14, 0.2, m);
    const eyes = [-1, 1].map((sg) => hit(sg * ex, ey));
    const nose = hit(0, 0.1);
    return { lips, eyes, nose };
  }, [body, m]);

  const wag = Math.sin(t * 3) * 0.22 * swim * (1 - m);
  const fin = Math.sin(t * 2.2) * 0.18 * swim * (1 - m);
  return (
    <group rotation={[0, wag * 0.12, 0]}>
      <mesh geometry={body}>
        <meshStandardMaterial vertexColors flatShading roughness={lerp(0.55, 0.28, m)} metalness={0.05} />
      </mesh>
      {/* eyes on the skin, high on the sides of the face (small and sunk when melted) */}
      {face.eyes.map(({ p, n }, i) => {
        const r = lerp(0.075, 0.042, m);
        const c = p.clone().add(n.clone().multiplyScalar(r * 0.35));
        return (
          <group key={i} position={c.toArray()}>
            <mesh scale={r}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#141016" roughness={0.12} metalness={0.4} flatShading />
            </mesh>
            <mesh position={n.clone().multiplyScalar(r * 0.8).add(new THREE.Vector3(0, r * 0.35, 0)).toArray()} scale={r * 0.3}>
              <icosahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#e8f1ff" />
            </mesh>
          </group>
        );
      })}
      {/* the bulbous "nose": snout skin hanging down over the middle of the mouth (surface only) */}
      {m > 0.04 && (
        <group position={face.nose.p.clone().add(new THREE.Vector3(0, -0.02, 0.07)).toArray()} scale={m}>
          <mesh scale={[0.15, 0.19, 0.13]}>
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial color={BLOB} flatShading roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.15, -0.06]} scale={[0.11, 0.12, 0.1]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={BLOB} flatShading roughness={0.25} />
          </mesh>
        </group>
      )}
      {/* thick lips following the face, corners turned down */}
      <mesh geometry={face.lips}>
        <meshStandardMaterial color={LIP} flatShading roughness={0.35} />
      </mesh>
      {/* big fan-like pectoral fins behind the head */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * lerp(0.5, 0.62, m), lerp(-0.12, -0.3, m), 0.0]} rotation={[0, s * lerp(0.35, 1.1, m), s * (-0.2 + fin - m * 0.25)]} scale={1 - m * 0.45}>
          <mesh position={[s * 0.22, 0, -0.05]} scale={[0.28, 0.018, 0.26]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={SKIN_TOP} flatShading transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
      {/* low dorsal fin along the back */}
      <mesh position={[0, lerp(0.42, 0.05, m), -0.35]} rotation={[0.2, 0, 0]} scale={[0.015, 0.1 * (1 - m * 0.7), 0.35]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={SKIN_TOP} flatShading />
      </mesh>
      {/* small tail fan */}
      <group position={[0, lerp(0, -0.3, m), -1.33]} rotation={[0, wag, 0]}>
        <mesh position={[0, 0, -0.12]} scale={[0.018, 0.17, 0.14]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={SKIN_TOP} flatShading />
        </mesh>
      </group>
    </group>
  );
};
