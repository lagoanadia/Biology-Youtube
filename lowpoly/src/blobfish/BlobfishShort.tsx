// "This Isn't What a Blobfish Really Looks Like" — low-poly short (2026-10-18 analytics rules: hook card at frame 0,
// name label instead of "It's a ___", loop ending, CTA + question on screen only). Scenes follow
// shorts/en/blobfish-real-face.yaml. Facts: National Geographic, WorldAtlas, Nature World News (package sources).
import { AbsoluteFill } from "remotion";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { clamp01, glide, lerp, pop } from "../lib/lowpoly";
import { Pop, RedCross, Shot, ShortShell } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Blobfish } from "../models/Blobfish";

const KEYWORDS = ["blobfish", "injury", "twelve", "hundred", "pressure", "jelly-like", "lighter", "float", "collapses", "normal", "blob"];

const Seafloor: React.FC<{ y?: number }> = ({ y = -0.9 }) => (
  <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[40, 40, 20, 20]} />
    <meshStandardMaterial color="#2a3550" flatShading roughness={1} />
  </mesh>
);

// arrows pushing on the fish from every side (water pressure)
const PressureArrows: React.FC<{ t: number; k: number }> = ({ t, k }) => (
  <>
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const d = 1.35 - Math.sin(t * 5 + i) * 0.06 - k * 0.15;
      return (
        <group key={i} position={[Math.cos(a) * d * 1.1, Math.sin(a) * d * 0.8, 0.3]} rotation={[0, 0, a + Math.PI / 2]} scale={k}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.3, 5]} />
            <meshBasicMaterial color="#5fe7ff" />
          </mesh>
          <mesh position={[0, -0.08, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.09, 0.16, 5]} />
            <meshBasicMaterial color="#5fe7ff" />
          </mesh>
        </group>
      );
    })}
  </>
);

const deep = (dim = 0.3, light = 1, t = 0, snow = true): Pick<Shot, "bg" | "world"> => ({
  bg: <DeepSeaBackdrop dim={dim} />,
  world: (
    <>
      <DeepSeaLights light={light} />
      {snow && <MarineSnow t={t} count={50} />}
    </>
  ),
});

// the surface: bright blue water, light from above
const surface = (k: number): Pick<Shot, "bg" | "world"> => ({
  bg: <AbsoluteFill style={{ background: `linear-gradient(to bottom, #8fd3ff ${lerp(-40, 0, k)}%, #2e6fae 50%, #0A1530 100%)` }} />,
  world: (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[1, 6, 3]} intensity={2.6} />
    </>
  ),
});

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D, u } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const bob = Math.sin(t * 1.2) * 0.04;
  const fish = (melt = 0, swim = 1) => (
    <group position={[0, bob, 0]}>
      <Blobfish t={t} melt={melt} swim={swim} />
    </group>
  );

  switch (scene.visual) {
    case "hook": {
      // the famous blob face, close and already moving; red ❌ lands on "not"
      const sub = s > D * 0.55;
      return {
        ...surface(1),
        cam: sub ? { pos: [0.9, 0.2, 3.0 - u * 0.2], look: [0, -0.2, 0.3] } : { pos: [-1.5, 0.4, 4.2 - u * 0.4], look: [0, -0.2, 0.2] },
        body: fish(1, 0),
        overlay: <RedCross t={t} at={w(0, 2)} />,
      };
    }
    case "blob": {
      return {
        ...surface(1),
        cam: { pos: [2.6, 0.7, 3.4 - u * 0.3], look: [0, -0.25, 0.1] },
        body: fish(1, 0),
        overlay: (
          <>
            <Pop t={t} at={S + 0.1} until={w(1, 5)} size={70} color="#ffd34d">VOTED "UGLIEST ANIMAL"</Pop>
            <Pop t={t} at={w(1, 5)} size={130} color="#ff5a6a">INJURY</Pop>
          </>
        ),
      };
    }
    case "depth": {
      // a normal-looking fish sinks while the counter runs to 1,200 m
      const m = Math.round(glide(s, 0.2, D * 0.85, 0, 1200) / 10) * 10;
      return {
        ...deep(lerp(0, 0.5, u), lerp(1.3, 1, u), t),
        cam: { pos: [5.2, 0.9 + u * 0.4, 2.2], look: [0, 0.1 - u * 0.2, 0] },
        body: <group position={[0, lerp(0.6, -0.1, u), 0]} rotation={[0, 0.5, 0.1]}>{fish(0)}</group>,
        overlay: <Pop t={t} at={S + 0.1} size={130} color="#9fdcff">{m.toLocaleString("en-US")} M</Pop>,
      };
    }
    case "pressure": {
      const k = pop(s, 0.2, 0.7);
      return {
        ...deep(0.5, 1, t),
        cam: { pos: [0.4, 0.5, 5.6 - u * 0.4], look: [0, 0, 0] },
        body: (
          <>
            <group rotation={[0, Math.PI / 2 - 0.25, 0]}>{fish(0)}</group>
            <PressureArrows t={t} k={k} />
          </>
        ),
        overlay: <Pop t={t} at={w(3, 2)} size={100} color="#5fe7ff">CRUSHING PRESSURE</Pop>,
      };
    }
    case "jelly": {
      // the body jiggles like jelly
      const j = Math.sin(s * 9) * 0.06 * (1 - u * 0.5);
      return {
        ...deep(0.5, 1, t),
        cam: { pos: [6.6, 0.6, 1.6], look: [0, -0.05, -0.1] },
        body: <group scale={[1 + j, 1 - j, 1 + j * 0.5]}>{fish(0, 0.4)}</group>,
        overlay: (
          <>
            <Pop t={t} at={w(4, 0)} until={w(4, 4)} size={110} color="#ffb3c0">JELLY</Pop>
            <Pop t={t} at={w(4, 4)} size={90} color="#9fdcff">LIGHTER THAN WATER</Pop>
          </>
        ),
      };
    }
    case "float": {
      // hovering just above the seafloor, fins still
      return {
        ...deep(0.55, 1, t),
        cam: { pos: [6.8, 0.9, 2.0 - u * 0.6], look: [0, -0.35, -0.1] },
        body: (
          <>
            <group position={[0, -0.1 + Math.sin(t * 0.9) * 0.06, 0]}>
              <Blobfish t={t} swim={0.1} />
            </group>
            <Seafloor />
          </>
        ),
        overlay: <Pop t={t} at={w(5, 6)} size={92} color="#7dffb0">NO ENERGY WASTED</Pop>,
      };
    }
    case "collapse": {
      // hauled up fast: water brightens, then the body collapses on "collapses"
      const k = clamp01(s / (w(6, 8) - S));
      const melt = glide(t, w(6, 8) - 0.1, w(6, 8) + 0.8, 0, 1);
      const m = Math.round(lerp(1200, 0, k) / 10) * 10;
      return {
        ...(k < 0.7 ? deep(lerp(0.5, 0, k), lerp(1, 1.5, k), t, true) : surface(k)),
        cam: { pos: [3.0, 0.6 - (1 - k) * 0.3, 2.6], look: [0, -0.2, 0.1] },
        body: <group position={[0, Math.sin(t * 20) * 0.02 * (1 - melt), 0]} rotation={[0, 0.25, 0]}>{fish(melt, 1 - melt)}</group>,
        overlay: <Pop t={t} at={S + 0.1} size={120} color={k < 0.99 ? "#9fdcff" : "#ff5a6a"}>{m.toLocaleString("en-US")} M</Pop>,
      };
    }
    case "normal": {
      return {
        ...deep(0.4, 1.1, t),
        cam: { pos: [6.4, 0.7, 2.2 - u * 0.4], look: [0, 0, -0.1] },
        body: <group rotation={[0, u * 0.3, 0]}>{fish(0)}</group>,
        overlay: <Pop t={t} at={w(7, 6)} size={100} color="#7dffb0">THE REAL BLOBFISH</Pop>,
      };
    }
    default: {
      // loop: back to the blob close-up of frame 0
      return {
        ...surface(1),
        cam: { pos: [lerp(0.4, -1.5, glide(u, 0, 1, 0, 1)), 0.4, lerp(4.8, 4.2, u)], look: [0, -0.2, 0.2] },
        body: fish(1, 0),
      };
    }
  }
};

export const BlobfishShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["THIS ISN'T", "ITS REAL FACE"]}
    label={{ name: "BLOBFISH", latin: "Psychrolutes marcidus" }} question="Which 'ugly' animal should we defend next?" />
);
