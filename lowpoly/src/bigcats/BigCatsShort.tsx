// "POV: You're the Ancestor of All Big Cats" — POV short (owner queue 2026-10-24 #3: jaguar vs tiger vs leopard vs puma,
// why they split). Scenes follow shorts/en/big-cats-pov.yaml. Facts: Tseng et al. 2013 (Asian origin), Figueiró et al.
// 2017, jaguar Bering crossing + bite (Wikipedia), Johnson et al. 2006 (Puma lineage incl. cheetah), Panthera.org (roar/purr).
import { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { IslandBackdrop, IslandLights, Sand } from "../env/Island";
import { ForestBack, JungleBackdrop, JungleLights, Leaves, Trunk } from "../env/Jungle";
import { Outback } from "../kangaroo/KangarooShort";
import { glide, lerp, pop, rng } from "../lib/lowpoly";
import { loadFont } from "../lib/montserrat";
import { Pop, RedCross, Shot, ShortShell, V3 } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { BigCat, CatKind, Turtle } from "../models/BigCat";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });
const KEYWORDS = ["ancestor", "big", "cats", "split", "Asia", "stripes", "tigers", "Africa", "trees", "leopards", "Americas",
  "jaguars", "turtle", "shells", "puma", "family", "cheetah", "roar", "purrs"];

const sunny = (sky: "day" | "warm" = "day", light = 1.05): Pick<Shot, "bg" | "world"> => ({
  bg: <IslandBackdrop sky={sky} />,
  world: <IslandLights sky={sky} light={light} fogNear={9} fogFar={30} />,
});
const jungle = (): Pick<Shot, "bg" | "world"> => ({ bg: <JungleBackdrop time="day" />, world: <JungleLights time="day" light={1.1} /> });

// Asian highland: grass, rocks and snowy peaks far away
const Highland: React.FC = () => {
  const peaks = useMemo(() => {
    const r = rng(12);
    return Array.from({ length: 9 }, (_, i) => ({ x: -16 + i * 4 + r() * 2, z: 12 + r() * 6, h: 3 + r() * 3.5, s: 2.2 + r() * 1.5 }));
  }, []);
  return (
    <>
      <Sand color="#93a865" rocks={5} size={40} seed={6} />
      {peaks.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, p.h / 2, 0]}>
            <coneGeometry args={[p.s, p.h, 5]} />
            <meshStandardMaterial color="#7d8a8f" flatShading />
          </mesh>
          <mesh position={[0, p.h * 0.83, 0]}>
            <coneGeometry args={[p.s * 0.36, p.h * 0.34, 5]} />
            <meshStandardMaterial color="#f2f6f8" flatShading />
          </mesh>
        </group>
      ))}
      {peaks.map((p, i) => (
        <group key={`b${i}`} position={[p.x * 0.8, 0, -p.z * 0.9]}>
          <mesh position={[0, p.h / 2, 0]}>
            <coneGeometry args={[p.s, p.h, 5]} />
            <meshStandardMaterial color="#7d8a8f" flatShading />
          </mesh>
        </group>
      ))}
    </>
  );
};

// forest for the tiger (trees on both sides of the path)
const TigerForest: React.FC = () => (
  <>
    <Sand color="#5d7a3a" rocks={2} size={30} seed={9} />
    {[[-1.8, -1.0, 1], [1.9, -2.2, 3], [-2.6, -4, 5], [2.4, -5, 7], [0.4, -6, 2], [-3.2, 1.5, 8], [3.0, 0.5, 4]].map(([x, z, sd], i) => (
      <group key={i}>
        <Trunk x={x} z={z} r={0.3} y0={0} y1={6} seed={sd} />
        <Leaves pos={[x, 5, z]} size={1.6} seed={sd + 10} />
      </group>
    ))}
    <ForestBack seed={3} z={-9} />
  </>
);

// acacia: thin trunk, one long horizontal branch, flat canopy
const Acacia: React.FC<{ pos: V3 }> = ({ pos }) => (
  <group position={pos}>
    <Trunk x={0} z={0} r={0.13} y0={0} y1={2.4} seed={4} color="#6b5039" />
    <mesh position={[0.8, 1.55, 0]} rotation={[0, 0, Math.PI / 2 - 0.08]}>
      <cylinderGeometry args={[0.07, 0.1, 1.8, 6]} />
      <meshStandardMaterial color="#6b5039" flatShading />
    </mesh>
    <mesh position={[0.3, 2.6, 0]} scale={[2.0, 0.35, 1.4]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#6f8a3a" flatShading />
    </mesh>
  </group>
);

const Cat: React.FC<{ t: number; kind: CatKind; pos?: V3; yaw?: number; s?: number; walk?: number; roar?: number;
  look?: number; crouch?: number; cub?: boolean; tint?: string; seed?: number }> = ({ pos = [0, 0, 0], yaw = 0, s = 1, ...p }) => (
  <group position={pos} rotation={[0, yaw, 0]} scale={s}>
    <BigCat {...p} />
  </group>
);

// the ancestor with three cubs that hint at tiger / leopard / jaguar coats
const Family: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Cat t={t} kind="ancestor" look={Math.sin(t * 0.8) * 0.2} />
    <Cat t={t + 1} kind="ancestor" cub tint="#d98a3a" pos={[0.75, 0, 1.4]} yaw={-0.6 + Math.sin(t) * 0.3} walk={0.3} />
    <Cat t={t + 2} kind="ancestor" cub tint="#d6b25e" pos={[-0.6, 0, 1.9]} yaw={0.9} walk={0.4} />
    <Cat t={t + 3} kind="ancestor" cub tint="#b98d5c" pos={[0.1, 0, 2.6]} yaw={2.6 + Math.sin(t * 1.3) * 0.4} />
  </>
);

// FRAME 0 / LOOP: over the ancestor's shoulders, looking at its cubs and the mountains
const HOOK_CAM = { pos: [0.35, 1.25, -1.9] as V3, look: [0.05, 0.3, 2.6] as V3 };

const Purr: React.FC<{ t: number; at: number }> = ({ t, at }) =>
  t < at ? null : (
    <AbsoluteFill style={{ alignItems: "center", top: 560 }}>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 90, color: "#ffd34d", WebkitTextStroke: "10px #060a18", paintOrder: "stroke fill",
        transform: `translateX(${Math.sin(t * 60) * 6}px) scale(${pop(t, at, at + 0.25, 0.5, 1)})` }}>
        PRRRRR
      </div>
    </AbsoluteFill>
  );

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const hookShot = (): Shot => ({
    ...sunny(),
    cam: { pos: [HOOK_CAM.pos[0] + Math.sin(t * 1.1) * 0.03, HOOK_CAM.pos[1], HOOK_CAM.pos[2]], look: HOOK_CAM.look },
    body: (
      <>
        <Highland />
        <Family t={t} />
      </>
    ),
  });

  switch (scene.visual) {
    case "hook":
      return hookShot();
    case "asia":
      return {
        ...sunny(),
        cam: { pos: [lerp(4.4, 3.8, u), 1.8, lerp(5.6, 5.0, u)], look: [0, 0.4, 1.0] },
        body: (
          <>
            <Highland />
            <Family t={t} />
          </>
        ),
        overlay: <Pop t={t} at={w(1, 0)} top={300} size={130} color="#ffd34d">ASIA</Pop>,
      };
    case "tiger":
      return {
        ...jungle(),
        cam: { pos: [lerp(2.4, 2.0, u), 1.5, lerp(6.4, 5.9, u)], look: [0, 0.5, -0.4] },
        body: (
          <>
            <TigerForest />
            <Cat t={t} kind="tiger" walk={0.8} pos={[lerp(0.5, -0.3, u), 0, -0.4]} yaw={-1.25} />
          </>
        ),
        overlay: <Pop t={t} at={w(2, 9)} top={300} size={140} color="#ff9a3c">TIGER</Pop>,
      };
    case "leopard": {
      // up in an acacia: the leopard rests on the branch with its prey
      return {
        ...sunny("warm"),
        cam: { pos: [lerp(1.6, 1.2, u), 1.5, lerp(5.2, 4.6, u)], look: [0.6, 1.5, 0] },
        body: (
          <>
            <Outback t={t} />
            <Acacia pos={[0, 0, 0]} />
            <Cat t={t} kind="leopard" pos={[0.85, 1.6, 0.05]} yaw={-Math.PI / 2} crouch={0.6} look={0.6 + Math.sin(t) * 0.1} />
            <mesh position={[1.45, 1.47, 0.12]} scale={[0.32, 0.13, 0.13]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#9a6b45" flatShading />
            </mesh>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(3, 2)} until={w(3, 8)} top={300} size={120} color="#ffd34d">AFRICA</Pop>
            <Pop t={t} at={w(3, 8)} top={300} size={140} color="#ffd34d">LEOPARD</Pop>
          </>
        ),
      };
    }
    case "jaguar": {
      // riverbank: the jaguar crunches a turtle shell
      const bite = glide(t, w(4, 10), w(4, 11) + 0.1, 0, 1);
      return {
        ...jungle(),
        cam: { pos: [lerp(3.4, 3.0, u), 1.2, lerp(4.0, 3.6, u)], look: [-0.15, 0.4, 0] },
        body: (
          <>
            <TigerForest />
            <mesh position={[0, 0.005, 3]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[20, 3]} />
              <meshStandardMaterial color="#4a8a8a" roughness={0.2} />
            </mesh>
            <Cat t={t} kind="jaguar" pos={[0.25, 0, -0.3]} yaw={-0.95} crouch={0.45} roar={bite > 0 && bite < 1 ? 0.6 : 0.15} />
            <group position={[-0.5, 0.02, 0.15]} scale={1.2}>
              <Turtle t={t} crack={bite} />
            </group>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(4, 4)} until={w(4, 7)} top={300} size={110} color="#9cf07a">AMERICAS</Pop>
            <Pop t={t} at={w(4, 7)} until={w(4, 11)} top={300} size={140} color="#ffd34d">JAGUAR</Pop>
            <Pop t={t} at={w(4, 11)} top={300} size={150} color="#ff6b7a">CRACK!</Pop>
          </>
        ),
      };
    }
    case "puma":
      return {
        ...sunny("day", 1.1),
        cam: { pos: [lerp(3.4, 3.0, u), 1.5, lerp(4.2, 3.8, u)], look: [-0.15, 0.6, 0] },
        body: (
          <>
            <Highland />
            <mesh position={[0, -0.25, -0.1]} scale={[1.1, 0.5, 1.3]}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#8c7e6a" flatShading />
            </mesh>
            <Cat t={t} kind="puma" pos={[0, 0.2, 0]} yaw={-1.0} look={0.4} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(5, 2)} until={w(5, 3)} top={300} size={140} color="#ffd34d">PUMA</Pop>
            <Pop t={t} at={w(5, 3)} top={300} size={110} color="#ff6b7a">NOT FAMILY</Pop>
            <RedCross t={t} at={w(5, 5)} size={260} top={560} />
          </>
        ),
      };
    case "cheetah":
      return {
        ...sunny("warm"),
        cam: { pos: [lerp(3.9, 3.5, u), 1.5, lerp(5.2, 4.8, u)], look: [0.15, 0.5, -0.1] },
        body: (
          <>
            <Outback t={t} />
            <Cat t={t} kind="puma" pos={[0.2, 0, 0.5]} yaw={-1.15} />
            <Cat t={t + 1} kind="cheetah" pos={[0.5, 0, -0.7]} yaw={-1.15} look={0.5} />
          </>
        ),
        overlay: <Pop t={t} at={w(6, 4)} top={300} size={130} color="#9cf07a">COUSINS</Pop>,
      };
    case "purr": {
      // close on the puma: tries to roar (nothing), then purrs
      const tryRoar = glide(t, w(7, 2), w(7, 3) + 0.2, 0, 1) * (1 - glide(t, w(7, 4) - 0.2, w(7, 4), 0, 1));
      const purr = t > w(7, 5) ? Math.sin(t * 70) * 0.004 : 0;
      return {
        ...sunny("day", 1.1),
        cam: { pos: [1.7 + purr, 1.0, 1.6], look: [-0.1, 0.72, 0.45] },
        body: (
          <>
            <Highland />
            <Cat t={t} kind="puma" crouch={0.3} roar={tryRoar * 0.8} look={0.5} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(7, 3)} until={w(7, 5)} top={300} size={120} color="#ff6b7a">NO ROAR</Pop>
            <Purr t={t} at={w(7, 5)} />
          </>
        ),
      };
    }
    default: {
      // loop: the four cats side by side, then back to the exact frame-0 shot
      if (u < 0.5) {
        const lineup: [CatKind, V3][] = [["tiger", [-0.5, 0, -1.6]], ["leopard", [0.7, 0, -0.9]], ["jaguar", [-0.5, 0, 0.0]], ["puma", [0.7, 0, 0.7]]];
        return {
          ...sunny("warm"),
          cam: { pos: [1.2, 1.9, lerp(6.8, 6.3, u * 2)], look: [0.1, 0.4, -0.4] },
          body: (
            <>
              <Outback t={t} />
              {lineup.map(([k, p], i) => <Cat key={k} t={t + i} kind={k} pos={p} yaw={-1.2} s={0.85} />)}
            </>
          ),
        };
      }
      return hookShot();
    }
  }
};

export const BigCatsShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["YOUR FAMILY", "IS SPLITTING"]}
    label={{ name: "BIG CAT ANCESTOR", latin: "Panthera, Asia" }} question="Jaguar or leopard: which one is stronger?" />
);
