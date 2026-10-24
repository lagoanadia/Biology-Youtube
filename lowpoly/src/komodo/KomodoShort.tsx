// "This Baby Dragon Has No Father" — Komodo dragon virgin birth (parthenogenesis) low-poly short with the 2026-10-24
// rules (hook card at frame 0, name label, story escalation in seconds 5-12, loop ending, on-screen CTA + A/B question).
// Scenes follow shorts/en/komodo-virgin-birth.yaml. Facts: Watts et al. 2006 (Nature), Nature News, Chester Zoo.
import { IslandBackdrop, IslandLights, LoneIsland, Sand, Sky, ZooEnclosure } from "../env/Island";
import { clamp01, glide, lerp, pop } from "../lib/lowpoly";
import { Pop, RedCross, Shot, ShortShell, V3 } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Chromosome, DragonEgg, Helix, Komodo } from "../models/Komodo";

const KEYWORDS = ["father", "2006", "eggs", "male", "hatched", "DNA", "mother", "chromosomes", "doubled", "boy", "island", "family"];

const env = (sky: Sky, t: number, zoo = true, light = 1): Pick<Shot, "bg" | "world"> => ({
  bg: <IslandBackdrop sky={sky} />,
  world: (
    <>
      <IslandLights sky={sky} light={light} />
      {zoo && (
        <>
          <Sand />
          <ZooEnclosure t={t} />
        </>
      )}
    </>
  ),
});

// nest of eggs; `shown` eggs appear one by one, `crack` opens them, `emerge` = babies' heads coming out
const NEST: V3 = [0.9, 0, 0.6];
const EGGS: V3[] = [[0, 0, 0.22], [-0.2, 0, 0.05], [0.2, 0, 0.02], [0, 0, -0.18], [-0.22, 0, -0.2], [0.24, 0, -0.22]];
const Nest: React.FC<{ t: number; shown?: number; crack?: number; emerge?: number; wobble?: number }> = ({ t, shown = 1, crack = 0, emerge = 0, wobble = 0 }) => (
  <group position={NEST}>
    {EGGS.map((p, i) => {
      const s = pop(shown, i / EGGS.length * 0.9, i / EGGS.length * 0.9 + 0.12);
      if (s <= 0) return null;
      const c = clamp01(crack * 1.6 - i * 0.1);
      const e = clamp01(emerge * 1.6 - i * 0.12);
      return (
        <group key={i} position={p} scale={s * 0.75}>
          <DragonEgg crack={c} wobble={wobble * (1 - c)} t={t + i} />
          {e > 0 && (
            <group position={[0, 0.03, lerp(-0.12, 0.22, e)]} rotation={[0, 0.25 * (i % 2 ? 1 : -1), 0]} scale={0.17}>
              <Komodo t={t + i * 0.7} baby lift={0.9} tongue={1} />
            </group>
          )}
        </group>
      );
    })}
  </group>
);

const Mother: React.FC<{ t: number; walk?: number; lift?: number; pos?: V3; yaw?: number }> = ({
  t, walk = 0, lift = 0.2, pos = [-0.7, 0, -0.5], yaw = 0.95,
}) => (
  <group position={pos} rotation={[0, yaw, 0]}>
    <Komodo t={t} walk={walk} lift={lift} tongue={0.8} />
  </group>
);

// FRAME 0 / LOOP camera: close on the front egg with the baby, mother's head behind
const HOOK_CAM = { pos: [1.95, 0.75, 2.75] as V3, look: [0.65, 0.22, 0.35] as V3 };

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);

  switch (scene.visual) {
    case "hook": {
      return {
        ...env("zoo", t),
        cam: { pos: [HOOK_CAM.pos[0] + Math.sin(t * 1.4) * 0.03, HOOK_CAM.pos[1], HOOK_CAM.pos[2] - u * 0.15], look: HOOK_CAM.look },
        body: (
          <>
            <Mother t={t} lift={0.5} />
            <Nest t={t} crack={1} emerge={1} />
          </>
        ),
      };
    }
    case "zoo": {
      // wide enclosure: she lays the eggs (they pop in one by one on "laid eggs")
      const shown = glide(t, w(1, 9) - 0.6, w(1, 10) + 0.5, 0, 1);
      return {
        ...env("zoo", t),
        cam: { pos: [lerp(2.0, 1.6, u), 1.7, lerp(6.6, 6.0, u)], look: [-0.15, 0.3, -0.1] },
        body: (
          <>
            <Mother t={t} />
            <Nest t={t} shown={shown} />
          </>
        ),
        overlay: <Pop t={t} at={w(1, 1)} top={300} size={100} color="#ffd34d">2006 · UK ZOO</Pop>,
      };
    }
    case "nomale": {
      // an empty spot where a male would be: a grey ghost dragon, crossed out
      const ghostIn = glide(s, 0, 0.4, 0, 1);
      return {
        ...env("zoo", t),
        cam: { pos: [0.6, 1.8, 6.6], look: [0.2, 0.3, -0.5] },
        body: (
          <>
            <Mother t={t} />
            <Nest t={t} />
            <group position={[1.1, 0, -1.7]} rotation={[0, -1.9, 0]} scale={ghostIn}>
              <Komodo t={t} seed={9} />
            </group>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(2, 2)} top={300} size={110} color="#ff6b7a">NO MALE</Pop>
            <RedCross t={t} at={w(2, 2) + 0.15} size={300} top={640} />
          </>
        ),
      };
    }
    case "hatch": {
      // the eggs wobble, crack, babies poke out
      const crack = glide(t, scene.start + 0.2, scene.end - 0.2, 0, 1);
      return {
        ...env("zoo", t),
        cam: { pos: [2.1, 0.8, 2.6 - u * 0.2], look: [0.75, 0.15, 0.45] },
        body: (
          <>
            <Mother t={t} lift={0.5} />
            <Nest t={t} crack={crack} emerge={glide(t, scene.start + 0.5, scene.end, 0, 1)} wobble={1} />
          </>
        ),
        overlay: <Pop t={t} at={w(3, 3)} size={120} color="#ffd34d">HATCHED!</Pop>,
      };
    }
    case "dna": {
      // DNA helix between mum (lit) and a crossed-out dad
      return {
        ...env("warm", t, false, 1.1),
        cam: { pos: [0, 0.3, 4.6 - u * 0.3], look: [0, 0.15, 0] },
        body: (
          <>
            <group position={[0, 0.25, 0]} scale={0.95}>
              <Helix t={t} />
            </group>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(4, 1)} size={120} color="#ff8fd0">100% MOM</Pop>
            <Pop t={t} at={w(4, 4) + 0.1} top={430} size={66}>DAD: 0%</Pop>
          </>
        ),
      };
    }
    case "chromo": {
      // mum's half set of chromosomes; each one copies itself (the copy slides out beside it)
      const copy = glide(t, w(5, 3) - 0.1, w(5, 4) + 0.5, 0, 1);
      const COLORS = ["#ff8fd0", "#ffd34d", "#7dd6ff", "#9cf07a"];
      return {
        ...env("warm", t, false, 1.1),
        cam: { pos: [0, 0.2, 6.8], look: [0, 0.1, 0] },
        body: (
          <>
            {COLORS.map((c, i) => {
              const x = (i - 1.5) * 0.46;
              return (
                <group key={i} position={[x, 0.1, 0]}>
                  <group position={[-0.12 * copy, 0, 0]} rotation={[0, 0, Math.sin(t * 1.5 + i) * 0.08]}>
                    <Chromosome color={c} />
                  </group>
                  {copy > 0 && (
                    <group position={[0.14 * copy, 0, 0]} scale={copy} rotation={[0, 0, Math.sin(t * 1.5 + i + 1) * 0.08]}>
                      <Chromosome color={c} />
                    </group>
                  )}
                </group>
              );
            })}
          </>
        ),
        overlay: <Pop t={t} at={w(5, 4)} size={120} color="#ffd34d">HALF × 2</Pop>,
      };
    }
    case "boys": {
      // a row of babies marching toward the camera
      return {
        ...env("zoo", t),
        cam: { pos: [1.7, 0.55, 2.2 - u * 0.2], look: [0, 0.1, 0] },
        body: (
          <>
            {[-0.75, -0.25, 0.25, 0.75].map((x, i) => (
              <group key={i} position={[x, 0, -0.3 + Math.sin(i * 1.7) * 0.15 + s * 0.12]} rotation={[0, (i - 1.5) * 0.08, 0]} scale={0.26}>
                <Komodo t={t + i * 0.4} baby walk={0.8} lift={0.4} tongue={1} />
              </group>
            ))}
          </>
        ),
        overlay: <Pop t={t} at={w(6, 4)} size={130} color="#7dd6ff">ALL BOYS</Pop>,
      };
    }
    case "island": {
      // aerial: one female alone on a small island in the sea
      return {
        ...env("day", t, false),
        cam: { pos: [lerp(6, 5, u), lerp(7, 5.5, u), 7], look: [0, 0, 0] },
        body: (
          <>
            <LoneIsland t={t} />
            <group position={[0.2, 0.05, 0.6]} rotation={[0, 0.6 + t * 0.1, 0]} scale={0.45}>
              <Komodo t={t} walk={0.6} tongue={1} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(7, 7)} size={110} color="#ffd34d">ALL ALONE</Pop>,
      };
    }
    case "family": {
      // on the same island: babies appear around her
      return {
        ...env("day", t, false),
        cam: { pos: [3.2, 1.3, 1.6], look: [0.4, 0.1, 0.5] },
        body: (
          <>
            <LoneIsland t={t} />
            <group position={[0.2, 0.05, 0.4]} rotation={[0, 0.6, 0]} scale={0.45}>
              <Komodo t={t} lift={0.3} tongue={1} />
            </group>
            {[[0.9, 0.9, 0.8], [1.3, 0.5, 1.4], [0.6, 1.3, -0.4], [1.5, 1.1, 0.2]].map(([x, z, yaw], i) => (
              <group key={i} position={[x, 0.05, z]} rotation={[0, yaw, 0]} scale={0.16 * pop(s, i * 0.15, i * 0.15 + 0.3)}>
                <Komodo t={t + i} baby walk={0.6} tongue={1} />
              </group>
            ))}
          </>
        ),
        overlay: <Pop t={t} at={w(8, 4)} size={110} color="#9cf07a">NEW FAMILY</Pop>,
      };
    }
    default: {
      // loop: glide back to the exact frame-0 shot
      const k = glide(u, 0, 0.85, 0, 1);
      return {
        ...env("zoo", t),
        cam: { pos: [lerp(2.6, HOOK_CAM.pos[0], k), lerp(1.3, HOOK_CAM.pos[1], k), lerp(4.2, HOOK_CAM.pos[2], k)], look: HOOK_CAM.look },
        body: (
          <>
            <Mother t={t} lift={0.5} />
            <Nest t={t} crack={1} emerge={1} />
          </>
        ),
      };
    }
  }
};

export const KomodoShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["THIS BABY HAS", "NO FATHER"]}
    label={{ name: "KOMODO DRAGON", latin: "Varanus komodoensis" }} question="Could a virgin birth happen in the wild? YES or NO?" />
);
