// "That Broken Branch Is Actually a Bird" — great potoo (Nyctibius grandis) low-poly short with the 2026-10-18
// analytics rules (hook card at frame 0, name label, loop ending, on-screen CTA). Scenes follow
// shorts/en/great-potoo-branch.yaml. Facts: Animal Diversity Web, Live Science, Canopy Tower (package sources).
import { Branch, ForestBack, JungleBackdrop, JungleLights, Leaves, Moon, Motes, Time } from "../env/Jungle";
import { clamp01, glide, lerp, pop } from "../lib/lowpoly";
import { Pop, Shot, ShortShell } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { BranchStub, Hawk, Moth, Potoo } from "../models/Potoo";

const KEYWORDS = ["branch", "bird", "still", "danger", "sky", "closed", "watching", "slits", "movement", "night", "mouth", "insects", "sunrise"];

// the perch: a broken stub rising from a thick branch, with leaves around, in a forest
const Perch: React.FC<{ t: number }> = ({ t }) => (
  <>
    <group position={[0, -0.85, -0.05]}>
      <BranchStub h={1.0} />
    </group>
    <Branch from={[-3, -1.8, -0.1]} angle={0.06} len={6} r={0.2} />
    <Leaves pos={[-1.6, 0.6, -1.4]} size={0.9} seed={3} />
    <Leaves pos={[1.8, 1.4, -1.8]} size={1.1} seed={7} />
    <Leaves pos={[1.4, -1.0, -1.2]} size={0.7} seed={11} />
    <ForestBack />
    <Motes t={t} />
  </>
);

const env = (time: Time, t: number, light = 1): Pick<Shot, "bg" | "world"> => ({
  bg: <JungleBackdrop time={time} />,
  world: (
    <>
      <JungleLights time={time} light={time === "night" ? light * 1.7 : light} />
      {time === "night" && <Moon />}
      {time === "night" && <Motes t={t} night count={30} />}
    </>
  ),
});

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D, u } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const bird = (p: { eyes?: number; point?: number; gape?: number; fly?: number; glow?: number } = {}) => <Potoo t={t} {...p} />;

  switch (scene.visual) {
    case "hook": {
      // looks like a broken branch… then the eyes snap open on "bird"
      const open = pop(t, w(0, 6) - 0.05, w(0, 6) + 0.2);
      const sub = s > D * 0.5;
      return {
        ...env("day", t),
        cam: sub ? { pos: [0.6, 0.95, 3.4], look: [0, 0.75, 0] } : { pos: [1.6, 0.6, 7.0 - u * 0.4], look: [0, 0.3, 0] },
        body: (
          <>
            {bird({ point: 1 - open * 0.6, eyes: open })}
            <Perch t={t} />
          </>
        ),
      };
    }
    case "still": {
      // perfectly still, high up in a tree: slow crane up the trunk
      return {
        ...env("day", t),
        cam: { pos: [2.8, lerp(-1.2, 0.6, glide(u, 0, 1, 0, 1)), 7.4], look: [0, 0.25, 0] },
        body: (
          <>
            {bird({ point: 0.4 })}
            <Perch t={t} />
          </>
        ),
        overlay: <Pop t={t} at={w(1, 3)} size={100} color="#ffd34d">PERFECTLY STILL</Pop>,
      };
    }
    case "point": {
      // a hawk passes over: the potoo stretches and points its bill to the sky
      const k = glide(t, w(2, 5) - 0.1, w(2, 5) + 0.6, 0, 1);
      return {
        ...env("day", t, 0.9),
        cam: { pos: [2.0, 0.6, 6.4], look: [0, 0.45, 0] },
        body: (
          <>
            {bird({ point: k })}
            <Perch t={t} />
            <group position={[lerp(-4, 4, u), 1.9, -1]} rotation={[0.2, Math.PI / 2, 0]} scale={0.9}>
              <Hawk t={t} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(2, 1)} size={120} color="#ff5a6a">DANGER!</Pop>,
      };
    }
    case "branch": {
      // side by side: a real broken branch and the potoo — which is which?
      return {
        ...env("day", t),
        cam: { pos: [0.3, 0.45, 7.4 - u * 0.4], look: [0, 0.35, 0] },
        body: (
          <>
            <group position={[0.55, 0, 0]}>{bird({ point: 1 })}</group>
            <group position={[-0.55, 0.25, 0]}>
              <BranchStub h={2.2} r={0.15} seed={6} />
            </group>
            <group position={[0.55, -0.85, -0.05]}>
              <BranchStub h={1.0} />
            </group>
            <Branch from={[-3, -1.8, -0.1]} angle={0.06} len={6} r={0.2} />
            <ForestBack />
          </>
        ),
        overlay: <Pop t={t} at={w(3, 5)} size={110} color="#ffd34d">BRANCH... OR BIRD?</Pop>,
      };
    }
    case "eyes": {
      // close on the face: eyes closed
      return {
        ...env("day", t),
        cam: { pos: [0.45, 0.82, 2.4 - u * 0.15], look: [0, 0.7, 0] },
        body: (
          <>
            {bird({ point: 0.2 })}
            <Perch t={t} />
          </>
        ),
        overlay: <Pop t={t} at={w(4, 3)} size={110} color="#ffd34d">EYES CLOSED...</Pop>,
      };
    }
    case "slits": {
      // the slit in the eyelid; a moth moving nearby is noticed
      return {
        ...env("day", t),
        cam: { pos: [0.6, 0.78, 1.6], look: [0.12, 0.66, 0.15] },
        body: (
          <>
            {bird({ point: 0.2 })}
            <Perch t={t} />
            <group position={[lerp(1.2, 0.5, u), 0.9 + Math.sin(t * 3) * 0.05, 0.6]} scale={0.4}>
              <Moth t={t} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(5, 1)} size={100} color="#7dff6a">EYELID SLITS</Pop>,
      };
    }
    case "night": {
      // night falls: the eyes open and shine
      const open = glide(t, w(6, 4), w(6, 6) + 0.3, 0, 1);
      return {
        ...env("night", t),
        cam: { pos: [1.6, 0.7, 5.6 - u * 0.4], look: [0, 0.5, 0] },
        body: (
          <>
            {bird({ eyes: open, glow: open })}
            <Perch t={t} />
          </>
        ),
        overlay: <Pop t={t} at={w(6, 1)} size={120} color="#9fb4ff">NIGHT</Pop>,
      };
    }
    case "mouth": {
      // it flies out and opens a huge mouth
      const k = glide(s, 0, D * 0.6, 0, 1);
      const gape = glide(t, w(7, 4), w(7, 6) + 0.3, 0, 1);
      return {
        ...env("night", t),
        cam: { pos: [0.3, 0.95, lerp(4.6, 3.4, k)], look: [0, 0.85, 0] },
        body: (
          <>
            <group position={[0, lerp(0, 0.4, k), lerp(0, 0.4, k)]}>{bird({ eyes: 1, glow: 1, fly: k, gape })}</group>
            <Motes t={t} night count={30} />
          </>
        ),
        overlay: <Pop t={t} at={w(7, 6)} size={120} color="#ff8fa0">HUGE MOUTH</Pop>,
      };
    }
    case "gulp": {
      // a big moth flies into the gape… gone
      const hit = w(8, 3);
      const k = clamp01((t - S) / Math.max(0.1, hit - S));
      const gape = t < hit + 0.15 ? 1 : glide(t, hit + 0.15, hit + 0.4, 1, 0);
      return {
        ...env("night", t),
        cam: { pos: [1.2, 1.05, 3.6], look: [0, 0.95, 0.3] },
        body: (
          <>
            <group position={[0, 0.4, 0.4]}>{bird({ eyes: 1, glow: 1, fly: 1, gape })}</group>
            {t < hit && (
              <group position={[lerp(1.6, 0, k), lerp(1.4, 0.92, k), lerp(1.4, 0.95, k)]} scale={0.6}>
                <Moth t={t} color="#b39b6f" />
              </group>
            )}
          </>
        ),
        overlay: <Pop t={t} at={hit} size={130} color="#ffd34d">GULP!</Pop>,
      };
    }
    default: {
      // loop: sunrise, back on the stub as a "branch" — the frame-0 shot
      const time: Time = u < 0.35 ? "dusk" : "day";
      return {
        ...env(time, t),
        cam: { pos: [1.6, 0.6, lerp(7.6, 7.0, glide(u, 0, 1, 0, 1))], look: [0, 0.3, 0] },
        body: (
          <>
            {bird({ point: glide(u, 0, 0.5, 0.3, 1) })}
            <Perch t={t} />
          </>
        ),
      };
    }
  }
};

export const PotooShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["THAT BRANCH", "IS A BIRD"]}
    label={{ name: "GREAT POTOO", latin: "Nyctibius grandis" }} question="Did you spot the bird before the reveal?" />
);
