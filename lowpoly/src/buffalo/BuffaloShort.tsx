// "POV: You're a Buffalo and It's Election Day" — POV short (owner queue 2026-10-24 #6: African buffalo "democracy").
// Scenes follow shorts/en/buffalo-vote-pov.yaml. Facts: Prins 1996 (resting cows stand, gaze one way, lie down again;
// adult females take part; the herd then sets off in that direction), Conradt & Roper 2003.
import { AbsoluteFill } from "remotion";
import { IslandBackdrop, IslandLights } from "../env/Island";
import { Outback } from "../kangaroo/KangarooShort";
import { clamp01, glide, lerp, pop } from "../lib/lowpoly";
import { Pop, RedCross, Shot, ShortShell, V3 } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Buffalo } from "../models/Buffalo";

const KEYWORDS = ["buffalo", "election", "rests", "female", "stares", "direction", "vote", "adult", "females", "herd",
  "votes", "point", "grazing", "Democracy"];

const savanna = (light = 1.05): Pick<Shot, "bg" | "world"> => ({
  bg: <IslandBackdrop sky="warm" />,
  world: <IslandLights sky="warm" light={light} fogNear={10} fogFar={34} />,
});

// the winning direction (radians around y): toward +x / +z
const SPREAD = 1.35;
const DIR = 0.7;
type Member = { p: V3; yaw: number; bull?: boolean; vote?: number }; // vote: order in the "others" wave
const HERD: Member[] = [
  { p: [0, 0, 0], yaw: 0.1 }, // you
  { p: [1.0, 0, 2.0], yaw: -0.4 }, // the first voter
  { p: [-1.6, 0, 1.6], yaw: 0.5, bull: true },
  { p: [-0.6, 0, 3.4], yaw: 2.4, vote: 2 },
  { p: [2.4, 0, 0.6], yaw: -1.2, vote: 1 },
  { p: [2.2, 0, 3.6], yaw: 3.0, bull: true },
  { p: [-2.6, 0, 3.8], yaw: 1.0, vote: 3 },
  { p: [0.7, 0, 4.9], yaw: -2.0, vote: 0 },
  { p: [-1.4, 0, 5.6], yaw: 0.3, bull: true },
  { p: [3.4, 0, 2.4], yaw: 2.0, vote: 4 },
  { p: [-3.4, 0, 1.0], yaw: -0.6 },
  { p: [1.8, 0, 6.2], yaw: 1.4, vote: 5 },
];

// golden direction arrow floating above a voter
const Arrow: React.FC<{ k: number; dir: number }> = ({ k, dir }) =>
  k <= 0 ? null : (
    <group position={[0, 1.75, 0]} rotation={[0, dir, 0]} scale={k}>
      <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
        <meshStandardMaterial color="#ffd34d" emissive="#ffb000" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.14, 0.28, 6]} />
        <meshStandardMaterial color="#ffd34d" emissive="#ffb000" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );

// one voting cycle over 0..1: stand up → gaze → lie back down (the arrow stays)
const voteCycle = (k: number) => {
  const up = glide(k, 0, 0.25, 0, 1) * (1 - glide(k, 0.75, 1, 0, 1));
  const gaze = glide(k, 0.25, 0.45, 0, 1);
  return { lie: 1 - up, raise: up * gaze, arrow: pop(k, 0.35, 0.55) };
};

type HerdState = { lie: number; raise: number; gaze: number; arrow: number; walk: number; shift: V3; yaw?: number };

const Herd: React.FC<{ t: number; state: (m: Member, i: number) => HerdState }> = ({ t, state }) => (
  <>
    {HERD.map((m, i) => {
      const s = state(m, i);
      return (
        <group key={i} position={[m.p[0] * SPREAD + s.shift[0], 0, m.p[2] * SPREAD + s.shift[2]]} rotation={[0, s.yaw ?? m.yaw, 0]} scale={0.7}>
          <Buffalo t={t + i * 0.7} seed={i} bull={m.bull} lie={s.lie} raise={s.raise} gaze={s.gaze} walk={s.walk} />
          <group rotation={[0, -(s.yaw ?? m.yaw), 0]}>
            <Arrow k={s.arrow} dir={DIR} />
          </group>
        </group>
      );
    })}
  </>
);

const resting = (): HerdState => ({ lie: 1, raise: 0, gaze: 0, arrow: 0, walk: 0, shift: [0, 0, 0] });

// gaze yaw (relative to the animal) that makes a buffalo with body yaw `yaw` look along DIR, clamped to what a neck can do
const gazeTo = (yaw: number) => {
  let d = DIR - yaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.max(-1.1, Math.min(1.1, d));
};

// FRAME 0 / LOOP: over your own back, looking across the resting herd
const HOOK_CAM = { pos: [-0.45, 1.45, -2.2] as V3, look: [0.5, 0.3, 3.4] as V3 };

const Ballot: React.FC<{ t: number; at: number }> = ({ t, at }) =>
  t < at ? null : (
    <AbsoluteFill style={{ alignItems: "center", top: 560 }}>
      <div style={{ fontSize: 160, scale: String(pop(t, at, at + 0.3, 0.3, 1)), filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.6))" }}>🗳️</div>
    </AbsoluteFill>
  );

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  // timings reused across scenes
  const firstVote = (tt: number) => clamp01((tt - w(2, 2)) / (w(2, 12) + 0.3 - w(2, 2)));
  const wave = (tt: number, order: number) => clamp01((tt - (w(4, 0) + order * 0.32)) / 1.6);
  const firstState = (tt: number): HerdState => {
    const v = voteCycle(firstVote(tt));
    return { ...resting(), lie: v.lie, raise: v.raise, gaze: gazeTo(HERD[1].yaw), arrow: v.arrow };
  };
  const hookShot = (): Shot => ({
    ...savanna(),
    cam: { pos: [HOOK_CAM.pos[0] + Math.sin(t) * 0.03, HOOK_CAM.pos[1], HOOK_CAM.pos[2]], look: HOOK_CAM.look },
    body: (
      <>
        <Outback t={t} />
        <Herd t={t} state={() => resting()} />
      </>
    ),
  });

  switch (scene.visual) {
    case "hook":
      return hookShot();
    case "rest":
      return {
        ...savanna(),
        cam: { pos: [lerp(7.2, 6.4, u), 4.8, lerp(-2.6, -2.0, u)], look: [0, 0, 3.6] },
        body: (
          <>
            <Outback t={t} />
            <Herd t={t} state={() => resting()} />
          </>
        ),
        overlay: <Pop t={t} at={w(1, 3)} top={300} size={120} color="#ffd34d">RESTING...</Pop>,
      };
    case "stand":
    case "vote":
      return {
        ...savanna(),
        cam: { pos: [lerp(1.5, 1.4, u), 3.0, lerp(-1.4, -1.0, u)], look: [1.35, 0.5, 2.7] },
        body: (
          <>
            <Outback t={t} />
            <Herd t={t} state={(_, i) => (i === 1 ? firstState(t) : resting())} />
          </>
        ),
        overlay:
          scene.visual === "vote" ? (
            <>
              <Pop t={t} at={scene.start} top={300} size={150} color="#ffd34d">VOTE!</Pop>
              <Ballot t={t} at={scene.start + 0.1} />
            </>
          ) : (
            <Pop t={t} at={w(2, 5)} top={300} size={110} color="#ffffff">STARE...</Pop>
          ),
      };
    case "others":
      return {
        ...savanna(),
        cam: { pos: [-4.8, 7.4, -3.6], look: [0.3, 0, 3.8] },
        body: (
          <>
            <Outback t={t} />
            <Herd t={t} state={(m, i) => {
              if (i === 1) return firstState(t);
              if (m.vote === undefined) return resting();
              const v = voteCycle(wave(t, m.vote));
              return { ...resting(), lie: v.lie, raise: v.raise, gaze: gazeTo(m.yaw), arrow: v.arrow };
            }} />
          </>
        ),
        overlay: <Pop t={t} at={w(4, 1)} top={300} size={120} color="#ffd34d">MORE VOTES</Pop>,
      };
    case "females":
      // a bull lies there, no say
      return {
        ...savanna(),
        cam: { pos: [-5.6, 1.9, 0.0], look: [-2.15, 0.35, 2.2] },
        body: (
          <>
            <Outback t={t} />
            <Herd t={t} state={(m, i) => (i === 1 || m.vote !== undefined ? { ...resting(), arrow: 1 } : resting())} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(5, 2)} top={300} size={120} color="#ff8fd0">COWS ONLY</Pop>
            <RedCross t={t} at={w(5, 4)} size={240} top={600} />
          </>
        ),
      };
    case "move":
    case "graze": {
      // everyone gets up, turns and walks the way the arrows point
      const t0 = w(6, 4);
      const up = glide(t, t0 - 0.2, t0 + 0.6, 0, 1);
      const go = Math.max(0, t - (t0 + 0.4));
      const d = go * 0.75;
      const shift: V3 = [Math.sin(DIR) * d, 0, Math.cos(DIR) * d];
      return {
        ...savanna(scene.visual === "graze" ? 0.95 : 1.05),
        cam: scene.visual === "move"
          ? { pos: [-4.8 + shift[0] * 0.6, 5.6, -3.6 + shift[2] * 0.6], look: [0.6 + shift[0], 0.2, 3.6 + shift[2]] }
          : { pos: [8.0 + shift[0], 2.2, 5.0 + shift[2]], look: [0.6 + shift[0], 0.4, 3.6 + shift[2]] },
        body: (
          <>
            <Outback t={t} />
            {scene.visual === "graze" && (
              <mesh position={[5 + shift[0] * 0.9, 0.02, 6 + shift[2] * 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[3.2, 9]} />
                <meshStandardMaterial color="#7fa046" flatShading />
              </mesh>
            )}
            <Herd t={t} state={(m) => ({ lie: 1 - up, raise: 0.3, gaze: 0, arrow: 1 - glide(t, t0, t0 + 0.8, 0, 1), walk: up > 0.9 ? 0.8 : 0,
              shift, yaw: lerp(m.yaw, DIR, up) })} />
          </>
        ),
        overlay: scene.visual === "move"
          ? <Pop t={t} at={w(6, 10)} top={300} size={120} color="#ffd34d">THAT WAY →</Pop>
          : <Pop t={t} at={w(7, 3)} top={300} size={120} color="#9cf07a">DINNER</Pop>,
      };
    }
    default: {
      if (u < 0.5) {
        return {
          ...savanna(),
          cam: { pos: [-4.8, 7.4, -3.6], look: [0.3, 0, 3.8] },
          body: (
            <>
              <Outback t={t} />
              <Herd t={t} state={() => ({ ...resting(), arrow: 1 })} />
            </>
          ),
          overlay: <Pop t={t} at={scene.start + 0.05} top={300} size={110} color="#ffd34d">DEMOCRACY 🐃</Pop>,
        };
      }
      return hookShot();
    }
  }
};

export const BuffaloShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["IT'S", "ELECTION DAY"]}
    label={{ name: "AFRICAN BUFFALO", latin: "Syncerus caffer" }} question="Should animals vote for the whole herd? YES or NO?" />
);

// for the thumbnail: the herd mid-vote (voters standing and gazing, arrows up)
export const VotingHerd: React.FC<{ t: number }> = ({ t }) => (
  <Herd t={t} state={(m, i) => (i === 1 || m.vote !== undefined
    ? { ...resting(), lie: 0, raise: 1, gaze: gazeTo(m.yaw), arrow: 1 }
    : resting())} />
);
