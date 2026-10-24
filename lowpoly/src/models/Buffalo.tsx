// Low-poly African (Cape) buffalo: massive dark body, low head, wide horns that sweep down and curl up (bulls have a
// thick "boss" helmet joining them; cows have thinner horns and are browner), droopy fringed ears, tufted tail.
// lie: 0 standing → 1 lying down (legs fold, body drops) · walk: gait speed · gaze: head yaw (radians) ·
// raise: head lift 0..1 (the "voting" pose holds the head mid-high) · Faces +z, feet on y = 0, shoulder ≈ 1.3.
import * as THREE from "three";
import { lerp } from "../lib/lowpoly";

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

const Horn: React.FC<{ side: 1 | -1; bull: boolean; color: string }> = ({ side, bull, color }) => {
  // points: from the top of the head outward, down, then curling up and inward
  const pts = [[0.05, 0.12, 0], [0.22, 0.1, -0.02], [0.38, -0.02, -0.02], [0.45, 0.08, 0.02], [0.4, 0.22, 0.05]]
    .map(([x, y, z]) => new THREE.Vector3(side * x * (bull ? 1 : 0.85), y, z));
  const rr = bull ? [0.075, 0.07, 0.055, 0.04, 0.025] : [0.045, 0.045, 0.04, 0.03, 0.018];
  return (
    <>
      {pts.slice(1).map((p, i) => <Seg key={i} a={pts[i]} b={p} r={rr[i]} r2={rr[i + 1]} color={color} />)}
    </>
  );
};

export const Buffalo: React.FC<{ t: number; lie?: number; walk?: number; gaze?: number; raise?: number; bull?: boolean; seed?: number }> = ({
  t, lie = 0, walk = 0, gaze = 0, raise = 0, bull = false, seed = 0,
}) => {
  const coat = bull ? "#2d2a28" : "#4a3a30";
  const horn = "#77706a";
  const legH = lerp(0.62, 0.12, lie);
  const bodyY = legH + 0.32;
  const ph = t * 6 * walk + seed;
  const breathe = Math.sin(t * 1.5 + seed) * 0.006;
  const legs: [number, number, number][] = [[1, 0.42, 0], [-1, 0.42, Math.PI], [1, -0.45, Math.PI], [-1, -0.45, 0]];
  const neck = new THREE.Vector3(0, bodyY + 0.12, 0.58);
  // head: low by default (grazing/resting), lifted when raise → 1
  const headP = new THREE.Vector3(0, bodyY + lerp(-0.05, 0.22, raise) - lie * 0.05, lerp(0.85, 0.8, raise));
  return (
    <group position={[0, walk > 0 ? Math.abs(Math.sin(ph)) * 0.02 : 0, 0]}>
      {/* barrel body + shoulder hump */}
      <mesh position={[0, bodyY, -0.05]} scale={[0.36 + breathe, 0.38, 0.72]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={coat} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, bodyY + 0.12, 0.38]} scale={[0.33, 0.36, 0.34]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={coat} flatShading roughness={0.95} />
      </mesh>
      {/* legs: fold when lying */}
      {legs.map(([s, z, off], i) => {
        const sw = Math.sin(ph + off) * 0.4 * walk;
        const hip = new THREE.Vector3(s * 0.2, bodyY - 0.2, z);
        if (lie > 0.5) {
          const knee = new THREE.Vector3(s * 0.26, 0.08, z + (i < 2 ? 0.18 : 0.12));
          return <Seg key={i} a={hip} b={knee} r={0.075} r2={0.09} color={coat} />;
        }
        const foot = new THREE.Vector3(s * 0.2, 0.04, z + Math.sin(sw) * 0.25);
        foot.y += Math.max(0, Math.cos(ph + off)) * 0.06 * walk;
        const knee = hip.clone().lerp(foot, 0.5).add(new THREE.Vector3(0, 0, i < 2 ? 0.04 : -0.05));
        return (
          <group key={i}>
            <Seg a={hip} b={knee} r={0.085} r2={0.1} color={coat} />
            <Seg a={knee} b={foot} r={0.055} r2={0.07} color={coat} />
            <mesh position={[foot.x, 0.03, foot.z]} scale={[0.07, 0.04, 0.08]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#1a1716" flatShading />
            </mesh>
          </group>
        );
      })}
      <Seg a={neck} b={headP.clone().add(new THREE.Vector3(0, 0.05, -0.12))} r={0.24} r2={0.2} color={coat} />
      {/* head */}
      <group position={headP} rotation={[lerp(0.55, 0.05, raise), gaze, 0]}>
        <mesh scale={[0.2, 0.2, 0.24]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={coat} flatShading roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.08, 0.22]} scale={[0.15, 0.13, 0.13]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#3a3330" flatShading />
        </mesh>
        <mesh position={[0, -0.09, 0.33]} scale={[0.12, 0.07, 0.04]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#151313" flatShading roughness={0.3} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.13, 0.04, 0.16]} scale={0.022}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
        ))}
        {/* droopy ears below the horns */}
        {[-1, 1].map((s) => (
          <mesh key={`e${s}`} position={[s * 0.27, 0.0, -0.02]} rotation={[0, 0, s * -0.5]} scale={[0.12, 0.06, 0.08]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={coat} flatShading />
          </mesh>
        ))}
        {/* horns (+ boss for bulls) */}
        <group position={[0, 0.06, -0.02]}>
          <Horn side={1} bull={bull} color={horn} />
          <Horn side={-1} bull={bull} color={horn} />
          {bull && (
            <mesh position={[0, 0.15, 0]} scale={[0.24, 0.07, 0.13]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color={horn} flatShading />
            </mesh>
          )}
        </group>
      </group>
      {/* tail with tuft */}
      <Seg a={new THREE.Vector3(0, bodyY + 0.15, -0.74)} b={new THREE.Vector3(Math.sin(t * 2 + seed) * 0.05, bodyY - 0.3, -0.8)} r={0.025}
        color={coat} />
      <mesh position={[Math.sin(t * 2 + seed) * 0.05, bodyY - 0.36, -0.8]} scale={[0.04, 0.08, 0.04]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#141210" flatShading />
      </mesh>
    </group>
  );
};
