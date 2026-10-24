// "POV: You're a Barn Owl and Your Marriage Is Over" — POV short (owner queue 2026-10-24 #5: barn owls get divorced).
// Scenes follow shorts/en/barn-owl-divorce-pov.yaml. Facts: Dreiss & Roulin 2014 J Evol Biol (634 pairs, 24 years,
// 23.5% divorced, after poor breeding; at least one divorcee recovers; faithful pairs improve), National Geographic.
import { AbsoluteFill } from "remotion";
import { BarnBackdrop, BarnLights, BarnLoft } from "../env/Barn";
import { glide, lerp, pop } from "../lib/lowpoly";
import { loadFont } from "../lib/montserrat";
import { Pop, Shot, ShortShell, V3 } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Nest, Owl } from "../models/Owl";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });
const KEYWORDS = ["barn", "owl", "marriage", "apart", "chicks", "leave", "Swiss", "one", "four", "split", "bad", "male",
  "house", "happy", "together", "teamwork", "fly"];

const barn = (light = 1): Pick<Shot, "bg" | "world"> => ({ bg: <BarnBackdrop />, world: <BarnLights light={light} /> });

const O: React.FC<{ t: number; pos?: V3; yaw?: number; s?: number; flap?: number; tilt?: number; look?: number; mood?: number;
  seed?: number }> = ({ pos = [0, 0, 0], yaw = 0, s = 1, ...p }) => (
  <group position={pos} rotation={[0, yaw, 0]} scale={s}>
    <Owl {...p} />
  </group>
);

// a small grey mouse (food delivery)
const Mouse: React.FC = () => (
  <group>
    <mesh scale={[0.05, 0.035, 0.08]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8a8580" flatShading />
    </mesh>
    <mesh position={[0, 0, -0.12]} rotation={[Math.PI / 2, 0, 0]} scale={[0.006, 0.08, 0.006]}>
      <cylinderGeometry args={[1, 1, 1, 4]} />
      <meshStandardMaterial color="#c9a8a0" />
    </mesh>
  </group>
);

// big emoji overlay (heart, broken heart, house)
const Emoji: React.FC<{ t: number; at: number; until?: number; top?: number; left?: number; size?: number; children: string }> = ({
  t, at, until, top = 620, left, size = 170, children,
}) =>
  t < at || (until !== undefined && t >= until) ? null : (
    <AbsoluteFill style={{ alignItems: left === undefined ? "center" : undefined, top, left }}>
      <div style={{ fontSize: size, scale: String(pop(t, at, at + 0.3, 0.3, 1)), filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.6))" }}>
        {children}
      </div>
    </AbsoluteFill>
  );

// FRAME 0 / LOOP: over the male's shoulder, looking at his partner by the nest
const HOOK_CAM = { pos: [-2.2, 1.55, 3.3] as V3, look: [0.3, 0.45, -0.1] as V3 };
const MALE: V3 = [-0.36, 0, 0.3];
const FEMALE: V3 = [0.38, 0, 0.1];
const NEST: V3 = [0.02, 0, -0.42];

const Couple: React.FC<{ t: number; chicks?: number; mood?: number; femaleAt?: V3; flap?: number; femaleYaw?: number }> = ({
  t, chicks = 1, mood = 0.6, femaleAt = FEMALE, flap = 0, femaleYaw = -0.65,
}) => (
  <>
    <group position={NEST}>
      <Nest t={t} chicks={chicks} />
    </group>
    <O t={t} pos={MALE} yaw={0.55} mood={mood} look={Math.sin(t * 0.7) * 0.15} />
    <O t={t + 1} seed={3} pos={femaleAt} yaw={femaleYaw} mood={mood} flap={flap} />
  </>
);

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const hookShot = (): Shot => ({
    ...barn(),
    cam: { pos: [HOOK_CAM.pos[0] + Math.sin(t * 1.1) * 0.03, HOOK_CAM.pos[1], HOOK_CAM.pos[2]], look: HOOK_CAM.look },
    body: (
      <>
        <BarnLoft t={t} />
        <Couple t={t} />
      </>
    ),
    overlay: <Emoji t={t} at={0} top={560} size={140}>💔</Emoji>,
  });

  switch (scene.visual) {
    case "hook":
      return hookShot();
    case "nest":
      return {
        ...barn(),
        cam: { pos: [lerp(0.6, 0.45, u), 1.4, lerp(3.6, 3.2, u)], look: [0.05, 0.4, -0.1] },
        body: (
          <>
            <BarnLoft t={t} />
            <Couple t={t} mood={1} />
          </>
        ),
        overlay: <Pop t={t} at={w(1, 5)} top={300} size={130} color="#ff6b7a">BAD YEAR</Pop>,
      };
    case "leave": {
      // she flies out through the window
      const k = glide(t, w(2, 4), scene.end + 0.2, 0, 1);
      const flap = k > 0 ? 0.5 + 0.5 * Math.sin(t * 16) : 0;
      const p: V3 = [lerp(FEMALE[0], 1.25, k), lerp(0, 1.55, k) + Math.sin(k * Math.PI) * 0.3, lerp(FEMALE[2], -2.0, k)];
      return {
        ...barn(),
        cam: { pos: [0.2, 1.4, 5.0], look: [0.55, 0.95, -0.7] },
        body: (
          <>
            <BarnLoft t={t} />
            <Couple t={t} mood={1} femaleAt={p} flap={flap} femaleYaw={lerp(-0.65, Math.PI + 0.4, Math.min(1, k * 3))} />
          </>
        ),
        overlay: <Pop t={t} at={w(2, 6)} top={300} size={140} color="#ffffff">BYE.</Pop>,
      };
    }
    case "study": {
      // twelve couples; three of them drift apart (one in four)
      const split = glide(t, w(3, 9), w(3, 11) + 0.3, 0, 1);
      const SPLIT = [1, 6, 8];
      return {
        ...barn(),
        cam: { pos: [0, 4.4, 5.6], look: [0, 0.15, -0.45] },
        body: (
          <>
            <BarnLoft t={t} />
            {Array.from({ length: 12 }, (_, i) => {
              const x = ((i % 3) - 1) * 1.15;
              const z = Math.floor(i / 3) * 0.75 - 1.3;
              const gap = SPLIT.includes(i) ? split * 0.28 : 0;
              return (
                <group key={i} position={[x, 0, z]}>
                  <O t={t + i} pos={[-0.13 - gap, 0, 0]} yaw={0.5 + (gap > 0 ? -1.2 * split : 0)} s={0.45} mood={gap > 0 ? 1 : 0} />
                  <O t={t + i + 0.5} seed={i + 3} pos={[0.13 + gap, 0, 0]} yaw={-0.5 + (gap > 0 ? 1.2 * split : 0)} s={0.45}
                    mood={gap > 0 ? 1 : 0} />
                </group>
              );
            })}
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(3, 3)} until={w(3, 6)} top={300} size={110} color="#ffffff">SWISS STUDY</Pop>
            <Pop t={t} at={w(3, 6)} top={300} size={150} color="#ff6b7a">1 IN 4</Pop>
          </>
        ),
      };
    }
    case "badyear":
      return {
        ...barn(0.85),
        cam: { pos: [0.4, 1.35, 3.3], look: [0.05, 0.35, -0.2] },
        body: (
          <>
            <BarnLoft t={t} />
            <Couple t={t} chicks={0} mood={1} femaleYaw={-0.6} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(4, 4)} top={300} size={120} color="#ff6b7a">EMPTY NEST</Pop>
            <Emoji t={t} at={w(4, 6)} top={620}>💔</Emoji>
          </>
        ),
      };
    case "house":
      // he stays in the loft, alone, sitting by the nest
      return {
        ...barn(),
        cam: { pos: [lerp(-0.7, -0.5, u), 1.4, lerp(3.8, 3.4, u)], look: [-0.2, 0.5, 0] },
        body: (
          <>
            <BarnLoft t={t} />
            <group position={NEST}>
              <Nest t={t} chicks={0} />
            </group>
            <O t={t} pos={MALE} yaw={0.3} look={Math.sin(t) * 0.3} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(5, 2)} top={300} size={110} color="#ffd34d">HE KEEPS</Pop>
            <Emoji t={t} at={w(5, 6)} top={560}>🏠</Emoji>
          </>
        ),
      };
    case "better":
      // the ex with a new partner and a full nest
      return {
        ...barn(),
        cam: { pos: [lerp(0.9, 0.7, u), 1.4, lerp(3.9, 3.5, u)], look: [0.05, 0.4, -0.2] },
        body: (
          <>
            <BarnLoft t={t} />
            <group position={NEST}>
              <Nest t={t} chicks={5} />
            </group>
            <O t={t + 1} seed={3} pos={FEMALE} yaw={-0.6} />
            <O t={t + 2} seed={7} pos={[-0.36, 0, 0.15]} yaw={0.6} s={1.05} tilt={0.15} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(6, 3)} until={w(6, 8)} top={300} size={110} color="#9cf07a">NEW PARTNER</Pop>
            <Pop t={t} at={w(6, 8)} top={300} size={120} color="#9cf07a">JUST AS GOOD</Pop>
          </>
        ),
      };
    case "stay": {
      // faithful couple: he brings a mouse, they lean together
      const k = glide(t, scene.start, w(7, 6), 0, 1);
      return {
        ...barn(),
        cam: { pos: [0.2, 1.4, 3.8], look: [0.05, 0.42, -0.1] },
        body: (
          <>
            <BarnLoft t={t} />
            <group position={NEST}>
              <Nest t={t} chicks={4} />
            </group>
            <O t={t} pos={[lerp(-0.8, -0.34, k), 0, 0.2]} yaw={0.55} tilt={-0.15 * k} />
            <group position={[lerp(-0.65, -0.18, k), 0.45 - k * 0.38, 0.35]}>
              <Mouse />
            </group>
            <O t={t + 1} seed={3} pos={[0.38, 0, 0.1]} yaw={-0.6} tilt={0.15 * k} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(7, 7)} top={300} size={120} color="#ffd34d">TEAMWORK ↑</Pop>
            <Emoji t={t} at={w(7, 3)} top={620} size={140}>💛</Emoji>
          </>
        ),
      };
    }
    default: {
      if (u < 0.5) {
        return {
          ...barn(),
          cam: { pos: [0.2, 1.5, 4.8], look: [0.3, 0.6, -0.4] },
          body: (
            <>
              <BarnLoft t={t} />
              <Couple t={t} mood={0.5} />
            </>
          ),
          overlay: (
            <AbsoluteFill style={{ alignItems: "center", top: 300 }}>
              <div style={{ fontFamily, fontWeight: 900, fontSize: 110, color: "#fff", WebkitTextStroke: "14px #060a18",
                paintOrder: "stroke fill", scale: String(pop(t, scene.start, scene.start + 0.3, 0.4, 1)) }}>
                💛 OR 💔
              </div>
            </AbsoluteFill>
          ),
        };
      }
      return hookShot();
    }
  }
};

export const OwlShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["MARRIAGE", "IS OVER"]}
    label={{ name: "BARN OWL", latin: "Tyto alba" }} question="Team STAY or team FLY AWAY?" />
);
