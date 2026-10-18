// "Each of Its Eyes Is as Big as Its Brain" — Philippine tarsier (Carlito syrichta) low-poly short with the 2026-10-18
// analytics rules (hook card at frame 0, name label, loop ending, on-screen CTA). Scenes follow
// shorts/en/tarsier-giant-eyes.yaml. Facts: Animal Diversity Web, EBSCO Research Starters, Ramsier et al. 2012.
import { ForestBack, JungleBackdrop, JungleLights, Leaves, Moon, Motes, Time, Trunk } from "../env/Jungle";
import { clamp01, glide, lerp, pop } from "../lib/lowpoly";
import { Pop, Shot, ShortShell } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Moth } from "../models/Potoo";
import { Tarsier } from "../models/Tarsier";

const KEYWORDS = ["eyes", "brain", "move", "halfway", "Philippines", "night", "insects", "leaps", "screams", "hear", "watching"];

const env = (time: Time, t: number): Pick<Shot, "bg" | "world"> => ({
  bg: <JungleBackdrop time={time} />,
  world: (
    <>
      <JungleLights time={time} light={time === "night" ? 1.8 : 1} />
      {time === "night" && <Moon pos={[2.5, 4.5, -12]} />}
      <Motes t={t} night={time === "night"} count={30} />
    </>
  ),
});

// the stem it clings to + a bit of forest
const Stem: React.FC<{ x?: number }> = ({ x = 0 }) => (
  <>
    <Trunk x={x} z={-0.16} r={0.07} y0={-4} y1={4} seed={2} />
    <Leaves pos={[x - 1.3, 1.6, -1.2]} size={0.7} seed={5} />
    <Leaves pos={[x + 1.4, -0.6, -1.5]} size={0.8} seed={9} />
    <ForestBack />
  </>
);

// expanding rings from the mouth (ultrasonic call we can't hear)
const Waves: React.FC<{ t: number; from: number }> = ({ t, from }) => (
  <>
    {[0, 1, 2, 3].map((i) => {
      const k = ((t - from) * 0.9 + i * 0.25) % 1;
      if (t < from) return null;
      return (
        <mesh key={i} position={[0, 0.27, 0.25]} scale={0.1 + k * 0.9}>
          <torusGeometry args={[1, 0.02, 4, 24]} />
          <meshBasicMaterial color="#ff8fd0" transparent opacity={1 - k} />
        </mesh>
      );
    })}
  </>
);

const FACE = { pos: [0, 0.38, 2.1] as [number, number, number], look: [0, 0.3, 0] as [number, number, number] };

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const tar = (p: { head?: number; leap?: number; call?: number; glow?: number; cutaway?: number } = {}) => <Tarsier t={t} {...p} />;

  switch (scene.visual) {
    case "hook": {
      // face to face; on "brain" the head turns see-through: brain ≈ one eye
      const cut = glide(t, w(0, 10), w(0, 11) + 0.2, 0, 1);
      return {
        ...env("dusk", t),
        cam: { pos: [FACE.pos[0] + Math.sin(t * 1.5) * 0.04, FACE.pos[1], FACE.pos[2] - u * 0.2], look: FACE.look },
        body: (
          <>
            {tar({ cutaway: cut })}
            <Stem />
          </>
        ),
        overlay: <Pop t={t} at={w(0, 11)} top={560} size={90} color="#f2a6b4">EYE = BRAIN</Pop>,
      };
    }
    case "fixed": {
      return {
        ...env("dusk", t),
        cam: { pos: [0.3, 0.42, 1.5], look: [0, 0.36, 0] },
        body: (
          <>
            {tar()}
            <Stem />
          </>
        ),
        overlay: <Pop t={t} at={w(1, 3)} size={100} color="#ff5a6a">EYES CAN'T MOVE</Pop>,
      };
    }
    case "turn": {
      // seen from behind: the head swings round to face us
      const h = glide(t, w(2, 2), w(2, 5) + 0.3, 0, Math.PI * 0.95);
      return {
        ...env("dusk", t),
        cam: { pos: [-1.6, 0.5, -1.2], look: [0, 0.32, 0] },
        body: (
          <>
            {tar({ head: h })}
            <Stem />
          </>
        ),
        overlay: <Pop t={t} at={w(2, 5)} size={140} color="#ffd34d">180°</Pop>,
      };
    }
    case "forest": {
      return {
        ...env("dusk", t),
        cam: { pos: [1.4, 0.6, lerp(4.2, 3.6, u)], look: [0, 0.3, 0] },
        body: (
          <>
            {tar()}
            <Stem />
            <Trunk x={-1.6} z={-1} r={0.25} seed={7} />
          </>
        ),
        overlay: <Pop t={t} at={w(3, 7)} size={110} color="#ffd34d">PHILIPPINES</Pop>,
      };
    }
    case "night": {
      return {
        ...env("night", t),
        cam: { pos: [0.6, 0.45, 2.4 - u * 0.3], look: [0, 0.35, 0] },
        body: (
          <>
            {tar({ glow: glide(s, 0.3, D, 0, 1) })}
            <Stem />
          </>
        ),
        overlay: <Pop t={t} at={w(4, 6)} size={120} color="#9fb4ff">NIGHT HUNTER</Pop>,
      };
    }
    case "spot": {
      // a moth lands on a leaf; the head turns to it
      const turn = glide(s, 0.2, 0.9, 0, -0.7);
      return {
        ...env("night", t),
        cam: { pos: [0.9, 0.5, 2.6], look: [-0.3, 0.4, 0] },
        body: (
          <>
            {tar({ glow: 1, head: turn })}
            <Stem />
            <Leaves pos={[-1.0, 0.25, 0.2]} size={0.3} seed={21} />
            <group position={[-0.95, 0.45, 0.3]} scale={0.35}>
              <Moth t={t} color="#7da34a" flutter={0.3} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(5, 4)} size={110} color="#7dff6a">PREY SPOTTED</Pop>,
      };
    }
    case "leap": {
      // leaps from stem to the leaf and grabs the moth
      const jump = clamp01((t - w(6, 2)) / 0.9);
      const arc = Math.sin(jump * Math.PI) * 0.5;
      return {
        ...env("night", t),
        cam: { pos: [-0.5, 0.75, 4.4], look: [-0.5, 0.4, 0] },
        body: (
          <>
            <group position={[lerp(0, -0.95, jump), lerp(0, 0.2, jump) + arc, lerp(0, 0.3, jump)]} rotation={[0, lerp(0, Math.PI / 2, Math.min(1, jump * 3)), 0]}>
              {tar({ glow: 1, leap: Math.sin(Math.min(1, jump * 1.2) * Math.PI) })}
            </group>
            <Stem />
            <Leaves pos={[-1.0, 0.25, 0.2]} size={0.3} seed={21} />
            {jump < 0.9 && (
              <group position={[-0.95, 0.45, 0.3]} scale={0.35}>
                <Moth t={t} color="#7da34a" flutter={0.3} />
              </group>
            )}
          </>
        ),
        overlay: <Pop t={t} at={w(6, 2)} size={130} color="#ffd34d">LEAP!</Pop>,
      };
    }
    case "ultrasound": {
      // mouth opens: rings of sound fly out — but it's silent to us
      const call = pop(t, w(7, 5), w(7, 5) + 0.2) * (0.6 + Math.sin(t * 20) * 0.4);
      return {
        ...env("night", t),
        cam: { pos: [0.35, 0.42, 2.0], look: [0, 0.33, 0] },
        body: (
          <>
            {tar({ glow: 1, call })}
            <Waves t={t} from={w(7, 5)} />
            <Stem />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(7, 5)} size={120} color="#ff8fd0">70 kHz</Pop>
            <Pop t={t} at={w(7, 8)} top={430} size={66} color="#fff">TOO HIGH FOR HUMANS</Pop>
          </>
        ),
      };
    }
    default: {
      // loop: back to the face-to-face shot of frame 0
      return {
        ...env("dusk", t),
        cam: { pos: [FACE.pos[0], FACE.pos[1], lerp(2.7, FACE.pos[2], glide(u, 0, 1, 0, 1))], look: FACE.look },
        body: (
          <>
            {tar()}
            <Stem />
          </>
        ),
      };
    }
  }
};

export const TarsierShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["EYES AS BIG", "AS ITS BRAIN"]}
    label={{ name: "PHILIPPINE TARSIER", latin: "Carlito syrichta" }} question="Have you ever seen a tarsier? Where are you watching from?" />
);
