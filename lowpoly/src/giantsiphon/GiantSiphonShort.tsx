// "This Creature Is Longer Than a Blue Whale" — giant Apolemia siphonophore filmed in the Ningaloo Canyons (2020).
// Low-poly short with the 2026-10-18 analytics rules (hook card at frame 0, name label, loop ending, on-screen CTA).
// Scenes follow shorts/en/giant-siphonophore-spiral.yaml. Facts: ScienceAlert, Smithsonian Magazine, Baird Maritime.
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { clamp01, glide, lerp, rng } from "../lib/lowpoly";
import { Pop, Shot, ShortShell } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Copepod } from "../models/BasketStar";
import { BlueWhale, GiantSiphon, siphonPoint } from "../models/GiantSiphon";
import { Rov } from "../models/Rov";

const KEYWORDS = ["blue", "whale", "spiral", "robot", "Australia", "forty-seven", "trap", "net", "caught", "chase", "waits"];

const deep = (t: number, dim = 0.3, light = 1): Pick<Shot, "bg" | "world"> => ({
  bg: <DeepSeaBackdrop dim={dim} />,
  world: (
    <>
      <DeepSeaLights light={light} />
      <MarineSnow t={t} count={60} spread={7} />
    </>
  ),
});

// tiny drifting plankton that the curtain sweeps up
const Plankton: React.FC<{ t: number; stick?: number }> = ({ t, stick = 1e9 }) => {
  const r = rng(31);
  return (
    <>
      {Array.from({ length: 26 }, (_, i) => {
        const x0 = (r() - 0.5) * 5;
        const z0 = (r() - 0.5) * 5;
        const y = -0.2 - r() * 0.6;
        const v = 0.25 + r() * 0.2;
        const tt = Math.min(t, stick + i * 0.05);
        return (
          <mesh key={i} position={[x0 + tt * v - 2, y + Math.sin(t + i) * 0.03, z0]} scale={0.02}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#d8f6ff" />
          </mesh>
        );
      })}
    </>
  );
};

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D, u } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const spin = t * 0.05;
  const siphon = (props: { glow?: number; trace?: number } = {}) => (
    <group rotation={[0, spin, 0]}>
      <GiantSiphon t={t} {...props} />
    </group>
  );
  const whale = (k: number) => (
    <group position={[lerp(-6, 6, k), 0.9, 1.2]} rotation={[0, Math.PI / 2, 0.05]} scale={0.6}>
      <BlueWhale t={t} />
    </group>
  );

  switch (scene.visual) {
    case "hook": {
      // the spiral from above while a blue whale glides over it; quick cut to under the curtain
      const sub = s > D * 0.55;
      return {
        ...deep(t),
        cam: sub ? { pos: [0.6, -0.6, 5.8 - u * 0.3], look: [0, 0, 0] } : { pos: [0, 4.6, 7.4 - u * 0.4], look: [0, 0.2, 0] },
        body: (
          <>
            {siphon()}
            {whale(lerp(0.375, 0.47, t / 3.4))}
          </>
        ),
      };
    }
    case "spiral": {
      // camera sinks from straight above to see the whole coil
      return {
        ...deep(t),
        cam: { pos: [Math.sin(s * 0.3) * 0.8, lerp(8.5, 6.5, u), lerp(1.5, 3.5, u)], look: [0, 0, 0] },
        body: siphon(),
        overlay: <Pop t={t} at={w(1, 6)} size={120} color="#ffd34d">GIANT SPIRAL</Pop>,
      };
    }
    case "rov": {
      // a robot's lights find it in the dark
      const k = glide(s, 0, D, 0, 1);
      return {
        ...deep(t, 0.55, lerp(0.5, 1, k)),
        cam: { pos: [4.5, 1.4, lerp(7.2, 6.2, u)], look: [0.6, 0.3, 1.0] },
        body: (
          <>
            {siphon()}
            <group position={[lerp(2.9, 2.0, k), lerp(1.0, 0.8, k), lerp(3.9, 2.9, k)]} rotation={[0.1, 0.6, 0]} scale={0.45}>
              <Rov t={t} lights={1} />
            </group>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(2, 7)} size={86} color="#9fdcff">WESTERN AUSTRALIA</Pop>
            <Pop t={t} at={w(2, 10)} top={530} size={110} color="#ffd34d">2020</Pop>
          </>
        ),
      };
    }
    case "measure": {
      // a glowing tracer runs along the outer ring while the counter climbs to ~47 m, then the bars
      const tr = glide(t, S + 0.3, w(3, 8) + 0.3, 0, 1);
      const m = Math.round(tr * 47);
      return {
        ...deep(t),
        cam: { pos: [0, 8.2, 2.2], look: [0, 0, 0.2] },
        body: <GiantSiphon t={t} trace={tr} />,
        overlay: (
          <Pop t={t} at={S + 0.2} size={130} color="#ffd34d">~{m} M</Pop>
        ),
      };
    }
    case "trap": {
      // low side view: the curtain of stinging tentacles hanging under the ring
      return {
        ...deep(t, 0.4),
        cam: { pos: [lerp(-1, 1, u), -0.1, 6.0 - u * 0.5], look: [0, -0.2, 0] },
        body: siphon({ glow: glide(s, 0.5, D, 0, 0.5) }),
        overlay: <Pop t={t} at={w(4, 6)} size={110} color="#ff7a5c">HUNTING TRAP</Pop>,
      };
    }
    case "net": {
      // under the ring: plankton drifts toward the curtain
      return {
        ...deep(t, 0.45),
        cam: { pos: [2.6, -1.4, 3.2], look: [0, -0.1, 0] },
        body: (
          <>
            {siphon({ glow: 0.4 })}
            <Plankton t={s} />
          </>
        ),
        overlay: <Pop t={t} at={w(5, 3)} size={120} color="#7ff6ff">DRIFT NET</Pop>,
      };
    }
    case "catch": {
      // close on the curtain: copepods swim in and get stuck (tentacles flash on contact)
      const hit = w(6, 7);
      const p = siphonPoint(0.8, 1, t);
      const k = clamp01((t - S) / Math.max(0.1, hit - S));
      return {
        ...deep(t, 0.45),
        cam: { pos: [p.x + 0.9, p.y - 0.25, p.z + 1.1], look: [p.x + 0.2, p.y - 0.35, p.z + 0.2] },
        body: (
          <>
            <GiantSiphon t={t} glow={t > hit ? 0.9 : 0.3} />
            {[0, 1].map((i) => (
              <group key={i} position={[p.x + lerp(1.1, 0.15, k) - i * 0.2, p.y - 0.3 - i * 0.18, p.z + 0.3 + i * 0.1]}
                rotation={[0, Math.PI / 2, 0]} scale={0.22}>
                <Copepod t={t} kick={t > hit ? 0.05 : 1} />
              </group>
            ))}
          </>
        ),
        overlay: <Pop t={t} at={hit} size={120} color="#ff7a5c">STUCK!</Pop>,
      };
    }
    case "wait": {
      return {
        ...deep(t, 0.6, 0.8),
        cam: { pos: [Math.sin(s * 0.2) * 1.5, 2.6, 6.8], look: [0, -0.1, 0] },
        body: siphon({ glow: 0.2 }),
        overlay: <Pop t={t} at={w(7, 4)} size={110} color="#ffd34d">NO CHASING</Pop>,
      };
    }
    default: {
      // loop: back to the opening view, the whale glides in again
      return {
        ...deep(t),
        cam: { pos: [0, 4.6, lerp(8.2, 7.4, glide(u, 0, 1, 0, 1))], look: [0, 0.2, 0] },
        body: (
          <>
            {siphon()}
            {whale(lerp(0.25, 0.375, u))}
          </>
        ),
      };
    }
  }
};

export const GiantSiphonShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["LONGER THAN", "A BLUE WHALE"]}
    label={{ name: "GIANT SIPHONOPHORE", latin: "Apolemia sp." }} question="What's the longest animal you know?" />
);
