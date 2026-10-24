// Low-poly electric eel with an evolution dial + its electric organ.
// evo 0 = small knifefish ancestor (short, pale brown, deep body) · evo 1 = electric eel (long, dark olive, orange throat).
// Both have the long ribbon fin under the belly (they swim by rippling it, body kept straight-ish).
// swim: body/fin wave · organ: 0 = red tail muscle, 1 = yellow battery cells (shown when `xray` > 0, skin turns see-through)
// fire: 0..1 cells light up front→back · zap: sparks around the body · Faces +z, centred on y = 0.
import { useMemo } from "react";
import * as THREE from "three";
import { clamp01, lerp, rng, taperedTube } from "../lib/lowpoly";

const N = 22;

export const Eel: React.FC<{ t: number; evo?: number; swim?: number; organ?: number; xray?: number; fire?: number; zap?: number }> = ({
  t, evo = 1, swim = 1, organ = 0, xray = 0, fire = 0, zap = 0,
}) => {
  const L = lerp(1.3, 2.6, evo);
  const R = lerp(0.12, 0.165, evo);
  const skin = new THREE.Color("#b49a72").lerp(new THREE.Color("#3e4632"), evo);
  const throat = new THREE.Color("#d9c7a0").lerp(new THREE.Color("#e08a3a"), evo);
  // spine: head (+z) → tail; sideways wave grows toward the tail
  const spine = Array.from({ length: N }, (_, i) => {
    const u = i / (N - 1);
    const z = L * 0.45 - u * L;
    const x = Math.sin(u * 7 - t * 4 * swim) * 0.06 * u * u * swim;
    return new THREE.Vector3(x, 0, z);
  });
  const key = spine.map((p) => p.x.toFixed(3)).join();
  // thick for the front 55%, then tapering to a thin tail
  const body = useMemo(() => taperedTube(spine.slice(0, 13), R, R * 0.85, 16, 8), [key, R]); // eslint-disable-line react-hooks/exhaustive-deps
  const tail = useMemo(() => taperedTube(spine.slice(12), R * 0.85, 0.02, 16, 7), [key, R]); // eslint-disable-line react-hooks/exhaustive-deps
  const belly = useMemo(() => taperedTube(spine.slice(0, 15).map((p) => p.clone().add(new THREE.Vector3(0, -R * 0.45, 0))),
    R * 0.75, 0.03, 18, 6), [key, R]); // eslint-disable-line react-hooks/exhaustive-deps
  const head = spine[0];
  const deep = lerp(1.35, 1, evo); // ancestor = taller, flatter-sided body
  const cells = 14;
  const r = rng(3);
  return (
    <group scale={[lerp(0.75, 1, evo), deep, 1]}>
      <mesh geometry={body}>
        <meshStandardMaterial color={skin} flatShading roughness={0.55} transparent={xray > 0} opacity={1 - xray * 0.72}
          depthWrite={xray < 0.5} />
      </mesh>
      <mesh geometry={tail}>
        <meshStandardMaterial color={skin} flatShading roughness={0.55} transparent={xray > 0} opacity={1 - xray * 0.72}
          depthWrite={xray < 0.5} />
      </mesh>
      <mesh geometry={belly}>
        <meshStandardMaterial color={throat} flatShading roughness={0.6} transparent={xray > 0} opacity={1 - xray * 0.72}
          depthWrite={xray < 0.5} />
      </mesh>
      {/* blunt head + small eyes + mouth line */}
      <mesh position={[head.x, 0.01, head.z + 0.02]} scale={[R * 1.1, R * 0.95, R * 1.6]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={skin} flatShading roughness={0.55} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[head.x + s * R * 0.78, R * 0.35, head.z + R * 0.55]} scale={R * 0.2}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#0d0d0d" roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[head.x, -R * 0.25, head.z + R * 1.3]} scale={[R * 0.75, 0.008, 0.02]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#1a120c" />
      </mesh>
      {/* ribbon fin under the rear 80% of the body */}
      {spine.slice(4).map((p, i) => {
        const u = (i + 4) / (N - 1);
        const h = R * 0.9 * Math.sin(Math.PI * clamp01((u - 0.15) / 0.85)) + 0.01;
        return (
          <mesh key={i} position={[p.x + Math.sin(u * 14 - t * 9 * swim) * 0.025 * swim, -R * 0.75 - h / 2, p.z]}
            scale={[0.012, h, L / N * 1.15]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={throat.clone().lerp(skin, 0.4)} flatShading transparent opacity={0.9} />
          </mesh>
        );
      })}
      {/* electric organ: a row of cells along the rear of the body (visible through see-through skin) */}
      {xray > 0 &&
        Array.from({ length: cells }, (_, i) => {
          const u = 0.3 + (i / cells) * 0.62;
          const p = spine[Math.round(u * (N - 1))];
          const rr = R * (1 - u * 0.8) * 0.8;
          const lit = clamp01(fire * (cells + 3) - i);
          const col = new THREE.Color("#c4453a").lerp(new THREE.Color("#ffd84d"), organ);
          return (
            <mesh key={`c${i}`} position={[p.x, -R * 0.1, p.z]} scale={[rr, rr * 0.9, L / cells * 0.32]}>
              <boxGeometry args={[1.6, 1.6, 1]} />
              {lit > 0 ? <meshBasicMaterial color={new THREE.Color("#fff6a0").lerp(new THREE.Color("#ffffff"), lit * 0.5)} />
                : <meshStandardMaterial color={col} flatShading emissive={col} emissiveIntensity={organ * 0.3} />}
            </mesh>
          );
        })}
      {/* sparks: jagged bolts jumping off the body, re-rolled 14×/s */}
      {zap > 0 &&
        Array.from({ length: Math.round(10 * zap) }, (_, i) => {
          const rr2 = rng(Math.floor(t * 14) * 31 + i);
          const u = 0.15 + rr2() * 0.8;
          const p = spine[Math.round(u * (N - 1))];
          const ang = rr2() * Math.PI * 2;
          const len = 0.15 + rr2() * 0.3;
          return (
            <group key={`z${i}`} position={[p.x + Math.cos(ang) * R, Math.sin(ang) * R, p.z]} rotation={[0, 0, ang - Math.PI / 2]}>
              {[0, 1, 2].map((k) => (
                <mesh key={k} position={[(k % 2 ? 0.03 : -0.03), len * (k + 0.5) / 3, 0]} rotation={[0, 0, k % 2 ? -0.6 : 0.6]}>
                  <boxGeometry args={[0.018, len / 2.6, 0.018]} />
                  <meshBasicMaterial color={r() > 0.5 ? "#fff6a0" : "#8ff3ff"} />
                </mesh>
              ))}
            </group>
          );
        })}
    </group>
  );
};

// One electric cell (electrocyte), big for the close-up: a flat plate with a nerve touching its back face.
// fire 0..1 = sodium rushing in through the back face, potassium leaving through the front, cell flashing.
export const Electrocyte: React.FC<{ t: number; fire?: number; ions?: boolean }> = ({ t, fire = 0, ions = true }) => {
  const flash = Math.max(0, 1 - Math.abs(fire - 0.85) * 5);
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.6, 1.0, 0.22, 4, 3, 1]} />
        <meshStandardMaterial color={new THREE.Color("#d9776a").lerp(new THREE.Color("#fff3a0"), flash)} flatShading roughness={0.6}
          emissive="#ffe066" emissiveIntensity={flash * 0.8} />
      </mesh>
      {/* nerve: comes from above and touches the back face */}
      <mesh position={[0, 0.85, -0.2]} rotation={[0.25, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.9, 6]} />
        <meshStandardMaterial color="#f0e6c8" flatShading emissive="#ffe066" emissiveIntensity={fire > 0 && fire < 0.4 ? 0.8 : 0} />
      </mesh>
      {ions &&
        Array.from({ length: 14 }, (_, i) => {
          const r = rng(i + 1);
          const x = (r() - 0.5) * 1.4, y = (r() - 0.5) * 0.8;
          const k = clamp01(fire * 1.6 - r() * 0.4);
          // sodium (yellow) from behind into the cell; potassium (purple) out of the front
          const na = new THREE.Vector3(x, y, lerp(-0.55 - r() * 0.3, -0.02, k));
          const kk = new THREE.Vector3(x * 0.9, y * 0.9, lerp(0.02, 0.6 + r() * 0.3, k));
          return (
            <group key={i}>
              <mesh position={na} scale={0.08}>
                <icosahedronGeometry args={[1, 0]} />
                <meshBasicMaterial color="#ffd84d" />
              </mesh>
              {i % 2 === 0 && (
                <mesh position={kk} scale={0.05}>
                  <icosahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial color="#b98cff" />
                </mesh>
              )}
            </group>
          );
        })}
    </group>
  );
};
