// Low-poly snails. `Snail` = land/desert snail (round coiled shell, 4 tentacles, the long upper pair with eyes on top);
// `pond` = pond snail (tall pointed shell, 2 flat triangular tentacles with eyes at their base).
// out: 0 = fully withdrawn into the shell, 1 = out · tent: tentacle extension · relax: sleepy droop (tentacles down,
// foot slack) · seal: white mucus door over the shell opening · crawl: foot ripple speed. Faces +z, foot on y = 0,
// length ≈ 1.1 when out.
import { useMemo } from "react";
import * as THREE from "three";
import { lerp, taperedTube } from "../lib/lowpoly";

type Ball = { p: THREE.Vector3; s: number; band: boolean };

// coiled shell built from overlapping faceted balls along a shrinking spiral (local coil axis = x)
const coil = (R: number, turns: number, spire: number, orbit = 1, size = 0.78): Ball[] => {
  const out: Ball[] = [];
  const step = 0.32;
  const k = 0.16;
  for (let f = 0; f < turns * Math.PI * 2; f += step) {
    const r = R * Math.exp(-k * f);
    const a = f - 0.93;
    out.push({
      p: new THREE.Vector3(spire * (R - r) * 1.6, r * orbit * Math.sin(a), r * orbit * Math.cos(a)),
      s: r * size,
      band: Math.floor(f / step) % 4 === 0,
    });
  }
  return out;
};

const Shell: React.FC<{ pond?: boolean; color: string; band: string }> = ({ pond, color, band }) => {
  const balls = useMemo(() => (pond ? coil(0.2, 3.6, 2.2, 0.5, 0.95) : coil(0.27, 3, 0.18)), [pond]);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  return (
    <>
      {balls.map((b, i) => (
        <mesh key={i} geometry={geo} position={b.p} scale={b.s}>
          <meshStandardMaterial color={b.band ? band : color} flatShading roughness={0.6} />
        </mesh>
      ))}
    </>
  );
};

const Tentacle: React.FC<{ base: THREE.Vector3; dir: THREE.Vector3; len: number; r: number; color: string; eye?: boolean }> = ({
  base, dir, len, r, color, eye,
}) => {
  if (len < 0.01) return null;
  const tip = base.clone().addScaledVector(dir.clone().normalize(), len);
  const mid = base.clone().lerp(tip, 0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(base).normalize());
  return (
    <>
      <mesh position={mid} quaternion={q}>
        <cylinderGeometry args={[r * 0.6, r, len, 5]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {eye && (
        <mesh position={tip} scale={r * 1.25}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#14110e" flatShading roughness={0.3} />
        </mesh>
      )}
    </>
  );
};

// pond shell: coil axis (local +x) points up and back, so the spire rises behind the head
const POND_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.75, -0.66).normalize());

export const Snail: React.FC<{ t: number; out?: number; tent?: number; relax?: number; seal?: number; crawl?: number;
  pond?: boolean; color?: string; shell?: string; band?: string }> = ({
  t, out = 1, tent = 1, relax = 0, seal = 0, crawl = 0, pond = false, color, shell, band,
}) => {
  const skin = color ?? (pond ? "#6d6a55" : "#b9a27e");
  const shellCol = shell ?? (pond ? "#b08850" : "#d8c8a4");
  const bandCol = band ?? (pond ? "#8a6234" : "#9c7c55");
  const rip = Math.sin(t * 6) * 0.02 * crawl;
  const o = Math.max(0.001, out);
  // foot: tail → neck → head (head lifts when awake, sags when relaxed)
  const headY = lerp(0.26, 0.12, relax);
  const body = useMemo(() => {
    const pts = [
      new THREE.Vector3(0, 0.06, -0.55),
      new THREE.Vector3(0, 0.08, -0.2),
      new THREE.Vector3(0, 0.1, 0.15),
      new THREE.Vector3(0, (0.1 + headY) / 2 + 0.03, 0.38),
      new THREE.Vector3(0, headY, 0.5),
    ];
    return taperedTube(pts, 0.07, 0.1, 16, 7);
  }, [headY]);
  const head = new THREE.Vector3(0, headY, 0.5 + rip);
  const droop = relax * 1.1;
  const tl = tent * (1 - relax * 0.55);
  return (
    <group>
      {/* body slides out of the shell opening (≈ z -0.05) */}
      <group position={[0, 0, -0.05]} scale={[o, o, o * (1 + rip)]}>
        <group position={[0, 0, 0.05]}>
          <mesh geometry={body} scale={[1.35, 0.8, 1]}>
            <meshStandardMaterial color={skin} flatShading roughness={0.5} />
          </mesh>
          <mesh position={head} scale={[0.1, 0.085, 0.1]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={skin} flatShading roughness={0.5} />
          </mesh>
          {pond ? (
            [-1, 1].map((s) => (
              <group key={s}>
                <mesh position={head.clone().add(new THREE.Vector3(s * 0.11, 0.02, 0.05))}
                  rotation={[0.2 + droop * 0.4, 0, s * (1.2 + droop * 0.3)]} scale={[0.05, 0.22 * tl, 0.015]}>
                  <coneGeometry args={[1, 1, 3]} />
                  <meshStandardMaterial color={skin} flatShading />
                </mesh>
                <mesh position={head.clone().add(new THREE.Vector3(s * 0.07, 0.05, 0.06))} scale={0.018}>
                  <icosahedronGeometry args={[1, 0]} />
                  <meshStandardMaterial color="#14110e" />
                </mesh>
              </group>
            ))
          ) : (
            <>
              {[-1, 1].map((s) => (
                <Tentacle key={`u${s}`} base={head.clone().add(new THREE.Vector3(s * 0.04, 0.05, 0.03))}
                  dir={new THREE.Vector3(s * 0.35, 1 - droop * 0.8, 0.55 + droop * 0.5 + Math.sin(t * 2 + s) * 0.08)}
                  len={0.3 * tl} r={0.02} color={skin} eye />
              ))}
              {[-1, 1].map((s) => (
                <Tentacle key={`l${s}`} base={head.clone().add(new THREE.Vector3(s * 0.05, -0.02, 0.07))}
                  dir={new THREE.Vector3(s * 0.5, -0.1 - droop * 0.3, 1)} len={0.09 * tl} r={0.014} color={skin} />
              ))}
            </>
          )}
        </group>
      </group>
      {/* shell sits on the back; pond shells point up and backward */}
      <group position={[0, (pond ? 0.24 : 0.33) + Math.abs(rip) * 0.5 - relax * 0.03, pond ? -0.12 : -0.15]}
        quaternion={pond ? POND_Q : new THREE.Quaternion().setFromEuler(new THREE.Euler(relax * 0.12, 0, 0))}>
        <Shell pond={pond} color={shellCol} band={bandCol} />
        {seal > 0 && (
          <mesh position={pond ? [0, -0.15, 0.12] : [0, -0.24, 0.35]} rotation={[1.77, 0, 0]} scale={[0.11, 0.02, 0.1]}>
            <cylinderGeometry args={[1, 1, 1, 9]} />
            <meshStandardMaterial color="#f4f1e8" transparent opacity={seal} flatShading roughness={0.3} />
          </mesh>
        )}
      </group>
    </group>
  );
};
