// "This Fish Has a See-Through Head" — barreleye (Macropinna microstoma) low-poly short with the 2026-10-18 analytics
// rules (hook card at frame 0, name label, loop ending, on-screen CTA). Scenes follow
// shorts/en/barreleye-see-through-head.yaml. Facts: MBARI (2009), Monterey Bay Aquarium (package sources).
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { glide, lerp, pop } from "../lib/lowpoly";
import { Pop, Shot, ShortShell } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Barreleye } from "../models/Barreleye";
import { Copepod } from "../models/BasketStar";
import { Shrimp } from "../models/Critters";
import { Jellyfish } from "../models/Props";

const KEYWORDS = ["eyes", "nostrils", "green", "see-through", "shield", "fluid", "six", "hundred", "shadows", "rotate", "higher"];

const deep = (t: number, dim = 0.3, light = 1): Pick<Shot, "bg" | "world"> => ({
  bg: <DeepSeaBackdrop dim={dim} />,
  world: (
    <>
      <DeepSeaLights light={light} />
      <directionalLight position={[0.5, 0.8, 4]} intensity={0.9 * light} color="#cfe0ff" />
      <MarineSnow t={t} count={45} spread={5} />
    </>
  ),
});

const FACE = { pos: [0, 0.16, 3.0] as [number, number, number], look: [0, 0.1, 0.4] as [number, number, number] };

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D, u } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const hover = Math.sin(t * 0.9) * 0.02;
  const fish = (p: { look?: number; dome?: number; nares?: number } = {}) => (
    <group position={[0, hover, 0]}>
      <Barreleye t={t} {...p} />
    </group>
  );

  switch (scene.visual) {
    case "hook": {
      // face to face: the two dark dots look like eyes
      return {
        ...deep(t),
        cam: { pos: [FACE.pos[0] + Math.sin(t * 2) * 0.03, FACE.pos[1], FACE.pos[2] - u * 0.15], look: FACE.look },
        body: fish({ dome: 0.18 }),
      };
    }
    case "nostrils": {
      return {
        ...deep(t),
        cam: { pos: [0, 0.12, 2.4], look: [0, 0.07, 0.5] },
        body: fish({ dome: 0.18, nares: pop(t, S + 0.1, S + 0.4) }),
        overlay: (
          <>
            <Pop t={t} at={w(1, 1)} size={120} color="#ff5a6a">NOSTRILS</Pop>
          </>
        ),
      };
    }
    case "reveal": {
      // camera rises over the head: green eyes glow inside the clear dome
      const k = glide(s, 0, D * 0.6, 0, 1);
      return {
        ...deep(t),
        cam: { pos: [lerp(0, 1.3, k), lerp(0.15, 1.5, k), lerp(2.6, 2.2, k)], look: [0, 0.18, 0.2] },
        body: fish({ dome: lerp(0.18, 0.32, k) }),
        overlay: <Pop t={t} at={w(2, 5)} size={110} color="#7dff6a">REAL EYES</Pop>,
      };
    }
    case "shield": {
      return {
        ...deep(t, 0.25, 1.15),
        cam: { pos: [3.2, 0.6, 1.4 - u * 0.3], look: [0, 0.1, 0] },
        body: fish({ dome: 0.42 }),
        overlay: (
          <>
            <Pop t={t} at={w(3, 4)} size={100} color="#bfefff">CLEAR SHIELD</Pop>
            <Pop t={t} at={w(3, 9)} top={420} size={80} color="#5fe7ff">FULL OF FLUID</Pop>
          </>
        ),
      };
    }
    case "depth": {
      // hanging almost still while the counter runs to 600 m
      const m = Math.round(glide(s, 0.2, D * 0.8, 0, 600) / 10) * 10;
      return {
        ...deep(t, lerp(0.2, 0.55, u), 1),
        cam: { pos: [3.8, 1.2 + u * 0.3, 3.6], look: [0, 0.05, 0] },
        body: fish(),
        overlay: <Pop t={t} at={S + 0.1} size={130} color="#9fdcff">{m} M</Pop>,
      };
    }
    case "lookup": {
      // from below: the eyes point up at the silhouettes of prey against the faint light above
      return {
        ...deep(t, 0.5),
        cam: { pos: [2.4, -0.9, 2.6], look: [0, 0.7, 0] },
        body: (
          <>
            {fish({ dome: 0.3 })}
            {/* faint light from far above: prey shows up as dark silhouettes against it */}
            <mesh position={[0, 3.2, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[2.4, 12]} />
              <meshBasicMaterial color="#6f9fd8" transparent opacity={0.35} />
            </mesh>
            <group position={[-0.35 + Math.sin(t * 0.5) * 0.2, 1.35, -0.2]} scale={0.32}>
              <Jellyfish t={t} color="#0b0f1c" />
            </group>
            <group position={[0.45 + Math.sin(t * 0.7) * 0.1, 1.5, 0.1]} rotation={[0, 1, 0]} scale={0.22}>
              <Copepod t={t} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(5, 7)} size={92} color="#7dff6a">SHADOWS OF PREY</Pop>,
      };
    }
    case "rotate": {
      // the eyes swing forward on "rotate" to see what it eats
      const at = w(6, 2);
      const look = glide(t, at, at + 0.7, 0, 1);
      return {
        ...deep(t, 0.35),
        cam: { pos: [2.2, 0.7, 2.6], look: [0, 0.15, 0.5] },
        body: (
          <>
            {fish({ look, dome: 0.3 })}
            <group position={[0.45, 0.2, lerp(1.4, 1.05, u)]} rotation={[0, -Math.PI / 2, 0]} scale={0.24}>
              <Shrimp t={t} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={at} size={110} color="#7dff6a">EYES ROTATE</Pop>,
      };
    }
    default: {
      // loop: back to the face-to-face shot of frame 0
      return {
        ...deep(t),
        cam: { pos: [0, lerp(0.45, FACE.pos[1], glide(u, 0, 0.5, 0, 1)), lerp(3.6, FACE.pos[2], glide(u, 0, 1, 0, 1))], look: FACE.look },
        body: fish({ dome: 0.18 }),
      };
    }
  }
};

export const BarreleyeShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["THOSE AREN'T", "ITS EYES"]}
    label={{ name: "BARRELEYE", latin: "Macropinna microstoma" }} question="Did you think those were its eyes?" />
);
