// "POV: You're Turning Into an Electric Eel" — POV short (owner queue 2026-10-24 #2: where the electricity comes from
// and why it evolved). Scenes follow shorts/en/electric-eel-pov.yaml. Facts: Gallant et al. 2014 Science (muscle →
// electric organ, 6 independent origins), electrocyte Na+/K+ mechanism (Univ. Fribourg / Nature 2017), de Santana et al.
// 2019 (E. voltai 860 V), Catania 2014 Science (doublets make hidden prey twitch).
import { useMemo } from "react";
import * as THREE from "three";
import { GodRays, RiverBackdrop, RiverLights, Riverbed, Silt, Surface } from "../env/River";
import { clamp01, glide, lerp, rng } from "../lib/lowpoly";
import { Pop, Shot, ShortShell, V3 } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Eel, Electrocyte } from "../models/Eel";
import { Fish } from "../models/RiverDolphin";

const KEYWORDS = ["fish", "Amazon", "see", "muscles", "batteries", "sodium", "zap", "Thousands", "add", "weak", "pulses",
  "dark", "860", "volts", "twitch", "away", "electric", "eel"];

const murk = (dim = 0.35, light = 0.8, fogFar = 9): Pick<Shot, "bg" | "world"> => ({
  bg: <RiverBackdrop dim={dim} />,
  world: <RiverLights light={light} fogNear={1.5} fogFar={fogFar} />,
});

// flooded-forest riverbed: mud, stones, a few drowned roots/branches
const RiverSet: React.FC<{ t: number; rays?: number }> = ({ t, rays = 0.6 }) => {
  // drowned roots placed ahead of the hook camera and away from the side cameras
  const roots = useMemo(() => {
    const r = rng(8);
    return [[-1.8, 2.5], [-2.6, 4.5], [1.6, 5.5], [-0.8, 6.5], [2.8, 7], [-3, -1.5], [-1.5, -4], [2.0, -5.5], [0.5, -6.5]]
      .map(([x, z]) => ({ x, z, lean: (r() - 0.5) * 0.8, h: 2 + r() * 2, rr: 0.05 + r() * 0.08 }));
  }, []);
  return (
    <>
      <Riverbed y={-0.6} color="#3a2f1e" />
      <Surface t={t} y={2.6} color="#8a9a5a" />
      <GodRays t={t} amount={rays} />
      <Silt t={t} count={70} spread={6} />
      {roots.map((q, i) => (
        <mesh key={i} position={[q.x, -0.6 + q.h / 2, q.z]} rotation={[q.lean * 0.3, 0, q.lean]}>
          <cylinderGeometry args={[q.rr * 0.6, q.rr, q.h, 5]} />
          <meshStandardMaterial color="#2e2416" flatShading />
        </mesh>
      ))}
    </>
  );
};

// weak electric pulses: flat rings expanding from the body
const Pulses: React.FC<{ t: number; amount?: number; rate?: number }> = ({ t, amount = 1, rate = 1.4 }) => (
  <>
    {[0, 1, 2].map((i) => {
      const k = (t * rate + i / 3) % 1;
      return (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} scale={[0.4 + k * 2.2, 0.6 + k * 3.2, 1]}>
          <ringGeometry args={[0.92, 1, 32]} />
          <meshBasicMaterial color="#7ff7ff" transparent opacity={(1 - k) * 0.7 * amount} side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      );
    })}
  </>
);

// a stone that lights up cyan when a pulse passes it ("felt" in the dark)
const SensedRock: React.FC<{ t: number; pos: V3; s: number; rate?: number }> = ({ t, pos, s, rate = 1.4 }) => {
  const d = Math.hypot(pos[0], pos[2]);
  const hit = Math.max(...[0, 1, 2].map((i) => {
    const k = (t * rate + i / 3) % 1;
    const rad = (0.4 + k * 2.7);
    return Math.max(0, 1 - Math.abs(rad - d) * 3) * (1 - k);
  }));
  return (
    <mesh position={pos} scale={[s * 1.3, s * 0.8, s]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#4a4030" flatShading emissive="#7ff7ff" emissiveIntensity={hit * 1.5} />
    </mesh>
  );
};

// FRAME 0 / LOOP: over the back of the small ancestor, looking into murky water
const HOOK_CAM = { pos: [0.35, 0.62, -2.3] as V3, look: [0, -0.05, 2.0] as V3 };

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const hookShot = (): Shot => ({
    ...murk(0.55, 0.6, 6),
    cam: { pos: [HOOK_CAM.pos[0] + Math.sin(t * 1.3) * 0.03, HOOK_CAM.pos[1] + Math.sin(t * 0.9) * 0.02, HOOK_CAM.pos[2]],
      look: HOOK_CAM.look },
    body: (
      <>
        <RiverSet t={t} rays={0.3} />
        <Eel t={t} evo={0} swim={0.8} />
      </>
    ),
  });

  switch (scene.visual) {
    case "hook":
      return hookShot();
    case "muscle": {
      // x-ray side view: the red tail muscle turns into yellow battery cells
      const org = glide(t, w(1, 5), w(1, 10) + 0.2, 0, 1);
      return {
        ...murk(0.3),
        cam: { pos: [lerp(3.4, 3.0, u), 1.3, lerp(2.9, 2.6, u)], look: [0, -0.05, -0.15] },
        body: (
          <>
            <RiverSet t={t} />
            <group rotation={[0, 0, 0]}>
              <Eel t={t} evo={0.15} swim={0.5} xray={glide(t, scene.start, scene.start + 0.5, 0, 1)} organ={org} />
            </group>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(1, 3)} until={w(1, 9)} top={300} size={110} color="#ff6b7a">MUSCLE</Pop>
            <Pop t={t} at={w(1, 9)} top={300} size={110} color="#ffd34d">→ BATTERY</Pop>
          </>
        ),
      };
    }
    case "cell": {
      // one electric cell, huge: the nerve fires, sodium (yellow) rushes in, the cell flashes
      const fire = glide(t, w(2, 3), w(2, 11) + 0.1, 0, 1);
      return {
        ...murk(0.6, 1.1),
        cam: { pos: [lerp(3.6, 3.2, u), 1.5, lerp(4.4, 4.0, u)], look: [0, 0.2, 0] },
        body: (
          <group rotation={[0, -1.05, 0]}>
            <Electrocyte t={t} fire={fire} />
          </group>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(2, 3)} until={w(2, 10)} top={300} size={100} color="#ffd34d">SODIUM RUSHES IN</Pop>
            <Pop t={t} at={w(2, 10)} top={300} size={150} color="#8ff3ff">ZAP!</Pop>
          </>
        ),
      };
    }
    case "stack": {
      // a long row of cells firing one after another, like batteries in series
      const n = 16;
      const wave = glide(t, scene.start + 0.1, scene.end - 0.1, 0, 1);
      const volts = Math.round(lerp(0, 600, wave));
      return {
        ...murk(0.6, 1.1),
        cam: { pos: [3.3, 2.0, 3.0], look: [0, 0, -2.6] },
        body: (
          <>
            {Array.from({ length: n }, (_, i) => {
              const f = clamp01((wave * (n + 4) - i) / 3);
              return (
                <group key={i} position={[0, 0, -i * 0.42]} scale={0.6}>
                  <Electrocyte t={t} fire={f > 0 ? 0.85 : 0} ions={false} />
                </group>
              );
            })}
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(3, 1)} top={300} size={100} color="#ffd34d">LIKE BATTERIES</Pop>
            <Pop t={t} at={w(3, 5)} top={430} size={120} color="#8ff3ff">{`${volts} V`}</Pop>
          </>
        ),
      };
    }
    case "sense": {
      // weak pulses ripple out in the dark; nearby stones light up as they are "felt"
      const rocks: [V3, number][] = [[[1.1, -0.45, 0.6], 0.22], [[-1.3, -0.45, -0.4], 0.28], [[0.4, -0.45, -1.6], 0.2],
        [[-0.6, -0.45, 1.5], 0.18], [[1.7, -0.45, -1.2], 0.25], [[-1.9, -0.45, 1.1], 0.2]];
      return {
        ...murk(0.65, 0.6, 10),
        cam: { pos: [0.3, 2.25, lerp(3.4, 3.0, u)], look: [0, -0.35, -0.1] },
        body: (
          <>
            <RiverSet t={t} rays={0.15} />
            <Eel t={t} evo={0.35} swim={0.7} />
            <Pulses t={t} />
            {rocks.map(([p, sz], i) => <SensedRock key={i} t={t} pos={p} s={sz} />)}
          </>
        ),
        overlay: <Pop t={t} at={w(4, 5)} top={300} size={110} color="#8ff3ff">ELECTRIC SENSE</Pop>,
      };
    }
    case "volts": {
      // the modern electric eel lights up; voltage counter to 860
      const v = glide(t, w(5, 3), w(5, 8), 0, 1);
      const flash = v > 0.05 ? 0.5 + 0.5 * Math.sin(t * 40) : 0;
      return {
        ...murk(0.4 - flash * 0.25, 0.9 + flash * 0.4),
        cam: { pos: [lerp(4.4, 3.9, u), 1.2, lerp(4.4, 3.9, u)], look: [0, 0.0, 0] },
        body: (
          <>
            <RiverSet t={t} />
            <group rotation={[0, 0.2, 0]}>
              <Eel t={t} evo={glide(t, scene.start, w(5, 3), 0.5, 1)} swim={0.8} zap={v} />
            </group>
            {v > 0.05 && <pointLight position={[0, 0.4, 0.5]} intensity={6 * v * (0.6 + flash * 0.4)} distance={5} color="#bff6ff" />}
          </>
        ),
        overlay: <Pop t={t} at={w(5, 3)} top={300} size={180} color="#ffd34d">{`${Math.round(lerp(0, 860, v))} V`}</Pop>,
      };
    }
    case "twitch": {
      // a fish hides behind a rock; the eel's double zap makes it jerk out of hiding, then the eel lunges
      const zt = w(6, 5);
      const jerk = t > zt && t < zt + 0.5 ? Math.sin((t - zt) * 60) * (1 - (t - zt) / 0.5) : 0;
      const out = glide(t, zt, zt + 0.35, 0, 1);
      const lunge = glide(t, w(6, 8), scene.end + 0.1, 0, 1);
      const zap = (t > zt - 0.15 && t < zt + 0.05) || (t > zt + 0.12 && t < zt + 0.25) ? 1 : 0;
      return {
        ...murk(0.35 - zap * 0.2, 0.85 + zap * 0.5),
        cam: { pos: [0.5, 0.45, 4.6], look: [0, 0.1, 0.3] },
        body: (
          <>
            <RiverSet t={t} />
            <mesh position={[0.15, -0.3, 1.5]} scale={[0.38, 0.42, 0.28]}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#4a4030" flatShading />
            </mesh>
            <group position={[lerp(0.15, 0.3, out), lerp(-0.3, 0.3, out), lerp(1.05, 1.25, out)]} rotation={[0, -Math.PI / 2 + jerk * 0.6, jerk * 0.5]} scale={1.3}>
              <Fish t={t * (1 + out * 2)} color="#e9efe2" />
            </group>
            <group position={[lerp(-2.0, -1.1, glide(t, scene.start, scene.end, 0, 1)) + lunge * 0.45, 0.35, -0.7]} rotation={[0, Math.PI / 2, 0]} scale={0.8}>
              <Eel t={t} evo={1} swim={0.7 + lunge} zap={zap} />
            </group>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(6, 3)} until={zt} top={300} size={100} color="#ffffff">HIDING...</Pop>
            <Pop t={t} at={zt} top={300} size={140} color="#ffd34d">TWITCH!</Pop>
          </>
        ),
      };
    }
    default: {
      // loop: the eel cruises past glowing faintly, then back to the exact frame-0 shot
      if (u < 0.5) {
        return {
          ...murk(0.45),
          cam: { pos: [lerp(3.4, 3.0, u * 2), 1.2, lerp(4.4, 4.0, u * 2)], look: [0, 0, 0] },
          body: (
            <>
              <RiverSet t={t} />
              <group position={[0, 0, lerp(-0.4, 0.4, u * 2)]} rotation={[0, 0.3, 0]}>
                <Eel t={t} evo={1} swim={1} zap={0.25} />
              </group>
            </>
          ),
          overlay: <Pop t={t} at={scene.start + 0.1} top={300} size={110} color="#8ff3ff">ELECTRIC EEL</Pop>,
        };
      }
      return hookShot();
    }
  }
};

export const EelShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["YOU CAN'T SEE", "A THING"]}
    label={{ name: "KNIFEFISH ANCESTOR", latin: "Gymnotiformes" }} question="Would you touch an electric eel for $1,000? YES or NO?" />
);

