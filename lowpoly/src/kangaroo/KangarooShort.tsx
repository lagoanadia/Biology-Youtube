// "POV: You're the Kangaroo's Ancestor" — first POV-format short (owner idea 2026-10-24): the viewer is the ancestor.
// Scenes follow shorts/en/kangaroo-pov-evolution.yaml. Facts: Flinders VAMP, Couzens & Prideaux 2018, Dawson & Taylor
// 1973 + eLife 2024, Sci Rep 2025, Australian Museum. The script never claims WHY hopping started (still debated).
import { AbsoluteFill } from "remotion";
import { useMemo } from "react";
import * as THREE from "three";
import { IslandBackdrop, IslandLights, Sand } from "../env/Island";
import { Branch, ForestBack, JungleBackdrop, JungleLights, Leaves, Trunk } from "../env/Jungle";
import { glide, lerp, pop, rng } from "../lib/lowpoly";
import { loadFont } from "../lib/montserrat";
import { Pop, Shot, ShortShell, V3 } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Jellybean, Joey, Kangaroo } from "../models/Kangaroo";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });
const KEYWORDS = ["ancestor", "forest", "rainforest", "dries", "grassland", "hoppers", "energy", "tiny", "jellybean-sized", "pouch",
  "pause", "kangaroo"];

const forestEnv = (t: number, dry = 0): Pick<Shot, "bg" | "world"> => ({
  bg: (
    <>
      <JungleBackdrop time="day" />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, #f2b36b 0%, #f5d59a 50%, #c98a4a 100%)", opacity: dry }} />
    </>
  ),
  world: <JungleLights time="day" light={1.1} />,
});
const outbackEnv = (light = 1): Pick<Shot, "bg" | "world"> => ({
  bg: <IslandBackdrop sky="warm" />,
  world: <IslandLights sky="warm" light={light} fogNear={10} fogFar={34} />,
});

// rainforest set: trunks + leaf clusters; `dry` 0..1 browns and shrinks the leaves, thins the trees
const Rainforest: React.FC<{ dry?: number }> = ({ dry = 0 }) => {
  const tint = new THREE.Color("#3f8f3a").lerp(new THREE.Color("#a5793b"), dry).getStyle();
  const k = 1 - dry * 0.75;
  return (
    <>
      {[[-1.4, -1.2, 0.3, 1], [1.5, -1.8, 0.35, 3], [-2.6, -3.5, 0.4, 5], [2.4, -4, 0.45, 7], [0.2, -5, 0.5, 2]].map(([x, z, r, sd], i) => (
        <group key={i}>
          <Trunk x={x} z={z} r={r * (0.6 + 0.4 * k)} y0={-1} y1={lerp(3, 7, k)} seed={sd} />
          {k > 0.05 && <Leaves pos={[x, lerp(2.5, 5.5, k), z]} size={1.6 * k} seed={sd + 10} tint={tint} />}
        </group>
      ))}
      {k > 0.3 && <ForestBack seed={3} z={-9} />}
    </>
  );
};

// red-ochre outback: ground + grass tufts + a couple of lonely trees
export const Outback: React.FC<{ t: number }> = ({ t }) => {
  const tufts = useMemo(() => {
    const r = rng(17);
    return Array.from({ length: 60 }, () => ({ x: (r() - 0.5) * 14, z: 2 - r() * 12, s: 0.12 + r() * 0.18, w: r() * 6 }));
  }, []);
  return (
    <>
      <Sand color="#c98a4a" rocks={3} size={30} />
      {tufts.map((f, i) => (
        <mesh key={i} position={[f.x, f.s * 0.5, f.z]} rotation={[Math.sin(t + f.w) * 0.08, f.w, 0]} scale={[f.s * 0.6, f.s, f.s * 0.6]}>
          <coneGeometry args={[1, 1.6, 4]} />
          <meshStandardMaterial color={i % 3 ? "#d8b65a" : "#b9a04a"} flatShading />
        </mesh>
      ))}
      <Trunk x={-3.5} z={-6} r={0.12} y0={0} y1={2.4} seed={4} color="#8a7a66" />
      <Leaves pos={[-3.5, 2.6, -6]} size={0.9} seed={14} tint="#7a8f4a" />
    </>
  );
};

// falling leaves for the hook (forest disappearing)
const FallingLeaves: React.FC<{ t: number; n?: number }> = ({ t, n = 26 }) => {
  const r = rng(5);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = (r() - 0.5) * 4, z = 0.6 - r() * 3, ph = r();
        const y = 3 - ((t * 0.5 + ph * 4) % 4);
        return (
          <mesh key={i} position={[x + Math.sin(t * 2 + i) * 0.2, y, z]} rotation={[t * 2 + i, t + i, 0]} scale={[0.06, 0.005, 0.1]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={i % 2 ? "#b88a3a" : "#8a6a2a"} flatShading />
          </mesh>
        );
      })}
    </>
  );
};

// HTML meters: speed rises, energy stays flat
const Meters: React.FC<{ t: number; at: number; speed: number }> = ({ t, at, speed }) => {
  if (t < at) return null;
  const a = pop(t, at, at + 0.3);
  const bar = (label: string, v: number, color: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 230, textAlign: "right", fontFamily, fontWeight: 900, fontSize: 44, color: "#fff",
        WebkitTextStroke: "8px #060a18", paintOrder: "stroke fill" }}>{label}</div>
      <div style={{ width: 520, height: 44, background: "rgba(6,10,24,0.6)", border: "5px solid #060a18", borderRadius: 12 }}>
        <div style={{ width: `${v * 100}%`, height: "100%", background: color, borderRadius: 8 }} />
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ top: 470, alignItems: "center", gap: 18, opacity: a }}>
      {bar("SPEED", speed, "#7dd6ff")}
      {bar("ENERGY", 0.38 + Math.sin(t * 9) * 0.01, "#ffd34d")}
    </AbsoluteFill>
  );
};

// PAUSED badge (two bars) for the waiting embryo
const Paused: React.FC<{ t: number; at: number }> = ({ t, at }) =>
  t < at ? null : (
    <AbsoluteFill style={{ top: 640, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 34, scale: String(pop(t, at, at + 0.3, 0.4, 1)) }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ width: 70, height: 220, background: "#ffffff", border: "10px solid #060a18", borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />
        ))}
      </div>
    </AbsoluteFill>
  );

// FRAME 0 / LOOP: over the ancestor's shoulder on a branch, looking out at the forest
const BRANCH: V3 = [0, 1.2, 0];
const HOOK_CAM = { pos: [-0.4, 1.68, -0.95] as V3, look: [0.25, 1.3, 2.0] as V3 };

const OnBranch: React.FC<{ t: number; evo?: number }> = ({ t, evo = 0 }) => (
  <>
    <Branch from={[0, BRANCH[1] - 0.05, -2]} yaw={-Math.PI / 2} len={4} r={0.07} />
    <group position={[BRANCH[0], BRANCH[1] + lerp(0, -1.2, evo), BRANCH[2]]}>
      <Kangaroo t={t} evo={evo} />
    </group>
  </>
);

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);

  switch (scene.visual) {
    case "hook": {
      return {
        ...forestEnv(t, 0.15 + u * 0.15),
        cam: { pos: [HOOK_CAM.pos[0] + Math.sin(t * 1.3) * 0.02, HOOK_CAM.pos[1], HOOK_CAM.pos[2] + u * 0.1], look: HOOK_CAM.look },
        body: (
          <>
            <group rotation={[0, Math.PI, 0]}><Rainforest dry={0.25 + u * 0.2} /></group>
            <OnBranch t={t} />
            <FallingLeaves t={t} />
          </>
        ),
      };
    }
    case "forest": {
      // lush forest floor: it bounds along a fallen log
      const x = lerp(-1.2, 1.2, u);
      const hop = t * 9;
      return {
        ...forestEnv(t, 0),
        cam: { pos: [x + 0.3, 0.75, 2.4], look: [x, 0.35, 0] },
        body: (
          <>
            <Rainforest />
            <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.15, 0.17, 4, 7]} />
              <meshStandardMaterial color="#5b4332" flatShading />
            </mesh>
            <group position={[x, 0.3 + Math.max(0, Math.sin(hop)) * 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
              <Kangaroo t={t} evo={0} hop={hop} hopAmt={0.6} />
            </group>
            <Sand color="#4a3a28" rocks={0} />
          </>
        ),
        overlay: <Pop t={t} at={w(1, 5)} size={100} color="#9cf07a">RAINFOREST</Pop>,
      };
    }
    case "dry": {
      const dry = glide(s, 0, D * 0.9, 0, 1);
      return {
        ...forestEnv(t, dry),
        cam: { pos: [0, 2.2, lerp(6, 7, u)], look: [0, 1.6, -2] },
        body: (
          <>
            <Rainforest dry={dry} />
            <Sand color={new THREE.Color("#4a3a28").lerp(new THREE.Color("#c98a4a"), dry).getStyle()} rocks={0} />
          </>
        ),
        overlay: <Pop t={t} at={w(2, 1)} size={92} color="#ffb36b">AUSTRALIA DRIES OUT</Pop>,
      };
    }
    case "grass": {
      // the small ancestor alone in open grassland
      return {
        ...outbackEnv(),
        cam: { pos: [lerp(1.4, 0.8, u), 0.7, lerp(3.4, 2.8, u)], look: [0, 0.25, 0] },
        body: (
          <>
            <Outback t={t} />
            <group rotation={[0, 0.6 + Math.sin(t * 2) * 0.4, 0]}>
              <Kangaroo t={t} evo={0} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(3, 4)} size={100} color="#ffd34d">GRASSLAND</Pop>,
      };
    }
    case "evolve": {
      // morph from ancestor to kangaroo while hopping across the plain
      const evo = glide(s, 0.1, D * 0.9, 0, 1);
      const hop = t * 7;
      return {
        ...outbackEnv(),
        cam: { pos: [0.2, lerp(0.8, 1.3, evo), lerp(3.2, 5.2, evo)], look: [0, lerp(0.25, 0.75, evo), 0] },
        body: (
          <>
            <Outback t={t} />
            <group position={[lerp(-0.8, 0.6, u), Math.max(0, Math.sin(hop)) * 0.2 * evo, 0]} rotation={[0, Math.PI / 2, 0]}>
              <Kangaroo t={t} evo={evo} hop={hop} hopAmt={0.4 + evo * 0.6} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={scene.start + 0.2} size={84}>MILLIONS OF YEARS LATER</Pop>,
      };
    }
    case "spring": {
      // side tracking shot: hopping faster and faster, the tendon glows, energy bar stays flat
      const speed = glide(s, 0.3, D * 0.85, 0.25, 0.95);
      const hop = t * lerp(5, 9, speed);
      return {
        ...outbackEnv(),
        cam: { pos: [5.4, 1.1, 0.6], look: [0, 0.85, 0.4] },
        body: (
          <>
            <group position={[0, 0, -((t * 3 * (0.5 + speed)) % 12) + 6]}>
              <Outback t={t} />
            </group>
            <group position={[0, Math.max(0, Math.sin(hop)) * 0.35, 0]}>
              <Kangaroo t={t} evo={1} hop={hop} hopAmt={1} spring={1} />
            </group>
          </>
        ),
        overlay: <Meters t={t} at={w(5, 2)} speed={speed} />,
      };
    }
    case "tiny": {
      // the big kangaroo next to the other hoppers of the world (jerboa ~ grams, springhare ≤ 3.5 kg)
      return {
        ...outbackEnv(),
        cam: { pos: [1.6, 0.9, 4.6], look: [0.4, 0.7, 0] },
        body: (
          <>
            <Outback t={t} />
            <group position={[-0.3, 0, -0.2]} rotation={[0, 0.5, 0]}>
              <Kangaroo t={t} evo={1} />
            </group>
            <group position={[0.75, 0, 0.6]} rotation={[0, -0.4, 0]} scale={0.22}>
              <Kangaroo t={t + 1} evo={0.85} color="#c9a46a" />
            </group>
            <group position={[1.1, 0, 0.9]} rotation={[0, -0.7, 0]} scale={0.09}>
              <Kangaroo t={t + 2} evo={0.9} color="#e0c08a" />
            </group>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(6, 1)} size={96} color="#7dd6ff">OTHERS: ≤ 3.5 KG</Pop>
            <Pop t={t} at={w(6, 1) + 0.5} top={420} size={70} color="#ffd34d">RED KANGAROO: ~90 KG</Pop>
          </>
        ),
      };
    }
    case "jellybean": {
      return {
        ...outbackEnv(1.1),
        cam: { pos: [0.3, 0.32, 0.8], look: [0.08, 0.04, 0] },
        body: (
          <>
            <Sand color="#e2c4a2" rocks={0} />
            <group position={[0, 0.05, 0]} rotation={[0, 0.5, 0]} scale={0.1}>
              <Joey t={t} crawl={0.3} />
            </group>
            <group position={[0.2, 0.04, -0.02]} rotation={[0, -0.4, 0]} scale={0.1}>
              <Jellybean />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(7, 4)} size={92} color="#ff8fd0">JELLYBEAN-SIZED</Pop>,
      };
    }
    case "pouch": {
      // the tiny joey crawls up the mother's belly fur into the pouch
      const k = glide(s, 0.1, D * 0.9, 0, 1);
      return {
        ...outbackEnv(1.1),
        cam: { pos: [1.5, 0.95, 2.4], look: [0, 0.75, 0.2] },
        body: (
          <>
            <Outback t={t} />
            <Kangaroo t={t} evo={1} pouch={1} />
            <group position={[0.06, lerp(0.5, 0.82, k), lerp(0.4, 0.36, k)]} rotation={[-1.1, 0, 0]} scale={0.06}>
              <Joey t={t} crawl={1} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(8, 1)} size={110} color="#ffd34d">ALL ALONE</Pop>,
      };
    }
    case "pause": {
      // pouch cutaway: the joey grows inside; the next embryo waits, paused
      return {
        ...outbackEnv(1.1),
        cam: { pos: [1.6, 0.95, 2.8], look: [0, 0.8, 0.1] },
        body: (
          <>
            <Outback t={t} />
            <Kangaroo t={t} evo={1} cut={1} />
            <group position={[0, 0.82, 0.32]} rotation={[-0.4, 0, 0]} scale={0.08}>
              <Joey t={t} />
            </group>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(9, 3)} size={110} color="#7dd6ff">NEXT BABY: PAUSED</Pop>
            <Paused t={t} at={w(9, 4)} />
          </>
        ),
      };
    }
    default: {
      // loop: the kangaroo hops off across the plain… then back to the exact frame-0 shot (ancestor on its branch)
      if (u < 0.5) {
        const hop = t * 7;
        return {
          ...outbackEnv(),
          cam: { pos: [2.6, 1.1, 4.6], look: [0, 0.8, -1] },
          body: (
            <>
              <Outback t={t} />
              <group position={[lerp(-0.5, 0.8, u * 2), Math.max(0, Math.sin(hop)) * 0.3, lerp(0, -3, u * 2)]} rotation={[0, Math.PI * 0.85, 0]}>
                <Kangaroo t={t} evo={1} hop={hop} hopAmt={1} />
              </group>
            </>
          ),
        };
      }
      return {
        ...forestEnv(t, 0.15),
        cam: { pos: [HOOK_CAM.pos[0], HOOK_CAM.pos[1], HOOK_CAM.pos[2] + (u - 0.5) * 0.1], look: HOOK_CAM.look },
        body: (
          <>
            <group rotation={[0, Math.PI, 0]}><Rainforest dry={0.25} /></group>
            <OnBranch t={t} />
            <FallingLeaves t={t} />
          </>
        ),
      };
    }
  }
};

export const KangarooShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["YOUR FOREST", "IS VANISHING"]}
    label={{ name: "KANGAROO ANCESTOR", latin: "~25 million years ago" }}
    question="POV videos: should we do more? YES or NO?" />
);
