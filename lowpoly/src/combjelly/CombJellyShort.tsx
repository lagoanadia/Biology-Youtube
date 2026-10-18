// "How Comb Jellies Make Rainbows" — low-poly short. Scenes follow shorts/en/comb-jelly-rainbow.yaml
// (beat `visual` = scene id below). All timing comes from the timeline (voice word timings).
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "../lib/montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { Captions } from "../lib/Captions";
import { clamp01, glide, lerp, pop } from "../lib/lowpoly";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { CombJelly } from "../models/CombJelly";
import { Jellyfish, LightRay, Ripples, RedX } from "../models/Props";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

type V3 = [number, number, number];
const ROW_TO_CAMERA = -Math.PI / 8; // turns comb row 1 to face +z (the camera)
const KEYWORDS = ["rainbow", "comb", "combs", "jellyfish", "eight", "waves", "color", "reflected", "fuse", "one", "BioNiche"];

const CameraRig: React.FC<{ pos: V3; look: V3; fov?: number }> = ({ pos, look, fov = 35 }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
    if ("fov" in camera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
};

type Shot = { cam: { pos: V3; look: V3; fov?: number }; light?: number; dim?: number; body: React.ReactNode };

// Builds what is on screen at time t (seconds).
const shotAt = (tl: Timeline, t: number): Shot => {
  const scenes = scenesOf(tl);
  const { scene, s, dur: D } = sceneAt(scenes, t);
  const S = scene.start;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const bob = Math.sin(t * 1.3) * 0.04;

  switch (scene.visual) {
    case "hook": {
      // extreme close-up of a rainbow comb row on black, quick push-in then a slow creep
      const k = pop(s, 0, 0.7);
      const c = s / D;
      return {
        dim: 0.85,
        cam: {
          pos: [lerp(2.0, 1.45, k) - c * 0.12, lerp(1.1, 0.8, k), lerp(3.2, 2.35, k) - c * 0.15],
          look: [0.35, 0.45, 0],
        },
        body: (
          <group rotation={[0, 0.25 + t * 0.12, 0.08]}>
            <CombJelly t={t} rainbow={1} beat={0.85} />
          </group>
        ),
      };
    }
    case "notjelly": {
      // pull back to the whole animal; a jellyfish pops in, gets a red ❌ on "jellyfish", then fades
      const back = glide(s, 0, 1.3, 0, 1);
      const tJelly = w(2, 3) - 0.1; // jellyfish pops in on "jelly" of "It's a comb jelly"
      const tX = w(3, 2); // ❌ lands on "not", stays through "even a jellyfish"
      const out = 1 - glide(t, S + D - 0.2, S + D, 0, 1);
      return {
        cam: { pos: [lerp(0, 0.1, back), lerp(-0.4, 0.15, back), lerp(2.6, 7.0, back) + s * 0.08], look: [0.1, lerp(-0.55, 0.2, back), 0] },
        body: (
          <>
            <group position={[-0.2 - s * 0.05, -0.75 + bob, 0]} rotation={[0, 0.3 + t * 0.12, 0.05]}>
              <CombJelly t={t} rainbow={0.75} beat={0.7} />
            </group>
            <group position={[0.45, 1.3 + bob, -0.3]} scale={0.8 * pop(t, tJelly, tJelly + 0.35) * out}>
              <Jellyfish t={t} />
              <group position={[0, -0.05, 0.75]} scale={pop(t, tX, tX + 0.25)}>
                <RedX size={0.9} />
              </group>
            </group>
          </>
        ),
      };
    }
    case "combs": {
      // the 8 rows light up white one after another on "eight", then zoom into one row of paddle plates
      const tEight = w(4, 4);
      const lit = Array.from({ length: 8 }, (_, k) => pop(t, tEight + k * 0.13, tEight + k * 0.13 + 0.25));
      const zoomStart = S + D * 0.58;
      const z = glide(t, zoomStart, S + D, 0, 1);
      const orbit = -0.25 + s * 0.08;
      return {
        cam: {
          pos: [lerp(Math.sin(orbit) * 4.8, 0.35, z), lerp(0.25, 0.15, z), lerp(Math.cos(orbit) * 4.8, 1.85, z)],
          look: [0, lerp(0, 0.1, z), lerp(0, 0.55, z)],
        },
        body: (
          <group rotation={[0, ROW_TO_CAMERA, 0]}>
            <CombJelly t={t} rainbow={0} rowsLit={lit} beat={0.3} beatSpeed={1} />
          </group>
        ),
      };
    }
    case "swim": {
      // macro: the paddles flick in a wave and the body glides upward, ripples left behind
      const y = (tt: number) => glide(tt, S, S + D, 0, 0.75);
      const yy = y(t);
      return {
        cam: { pos: [1.7, yy + 0.35, 3.0 - s * 0.1], look: [0.15, yy + 0.15, 0.1] },
        body: (
          <>
            <group position={[0, yy, 0]} rotation={[0, ROW_TO_CAMERA, 0]}>
              <CombJelly t={t} rainbow={0.35} beat={1} beatSpeed={2.3} />
            </group>
            <Ripples t={t} emitY={y} />
          </>
        ),
      };
    }
    case "split": {
      // a white ray comes down, hits a moving paddle on "hits", fans into a spectrum, then the rainbow spreads row by row
      const tHits = w(6, 3);
      const tSplit = w(6, 8);
      const grow = glide(t, S, tHits, 0, 1);
      const fan = pop(t, tHits, tHits + 0.45) * (1 - glide(t, S + D - 0.6, S + D, 0, 0.7));
      const rows = Array.from({ length: 8 }, (_, k) => pop(t, tSplit + k * 0.09, tSplit + k * 0.09 + 0.35));
      const orbit = 0.15 - s * 0.1;
      return {
        cam: { pos: [Math.sin(orbit) * 4.7, 0.7, Math.cos(orbit) * 4.7], look: [0, 0.2, 0] },
        body: (
          <>
            <group rotation={[0, ROW_TO_CAMERA, 0]}>
              <CombJelly t={t} rainbow={0} rowRainbow={rows} beat={0.75} />
            </group>
            <LightRay hit={[0, 0.74, 0.5]} grow={grow} fan={fan} />
          </>
        ),
      };
    }
    case "reflected": {
      // the overhead light switches off on "reflected": rainbow gone, dim glassy outline; one beat later it returns
      const tOff = w(7, 4);
      const tOn = S + D - 0.35;
      const light = t < tOff ? 1 : t < tOn ? 0 : glide(t, tOn, tOn + 0.2, 0, 1);
      return {
        light,
        dim: 1 - light,
        cam: { pos: [0.2, 0.2, lerp(5.0, 4.3, s / D)], look: [0, 0.05, 0] },
        body: (
          <group position={[0, bob, 0]} rotation={[0, ROW_TO_CAMERA + s * 0.1, 0]}>
            <CombJelly t={t} rainbow={1} beat={0.7} light={light} />
          </group>
        ),
      };
    }
    case "fuse": {
      // two injured jellies, each missing a faceted chunk, drift together; the triangles knit them into one
      const drift = glide(s, 0, D * 0.6, 0, 1);
      const knit = clamp01((s - D * 0.55) / (D * 0.42));
      const x = lerp(1.75, 0.55, drift);
      return {
        cam: { pos: [0, 0.3, lerp(6.6, 5.8, s / D)], look: [0, 0, 0] },
        body: (
          <group scale={0.62}>
            <group position={[-x, bob, 0]} rotation={[0, 0.2, 0]}>
              <CombJelly t={t} rainbow={0.35} beat={0.45} cut={1} knit={knit} seed={3} />
            </group>
            <group position={[x, -bob, 0]} rotation={[0, -0.2, 0]}>
              <CombJelly t={t + 0.37} rainbow={0.35} beat={0.45} cut={-1} knit={knit} seed={9} />
            </group>
          </group>
        ),
      };
    }
    case "asone": {
      // one body: synchronized rainbow waves on all rows, a pulse, then it swims up and out of frame
      const pulse = 1 + 0.045 * Math.sin(t * 2.3 * Math.PI * 2);
      const up = glide(s, D * 0.35, D, 0, 1) ** 2 * 6.5;
      return {
        cam: { pos: [0, 0.2 + up * 0.1, lerp(5.8, 5.2, s / D)], look: [0, 0.1 + up * 0.15, 0] },
        body: (
          <group position={[0, up * 0.62, 0]} scale={0.62 * pulse}>
            {[-1, 1].map((side) => (
              <group key={side} position={[side * 0.55, 0, 0]} rotation={[0, -side * 0.2, 0]}>
                <CombJelly t={t} rainbow={1} beat={1} beatSpeed={2.3} sync cut={side === -1 ? 1 : -1} knit={1}
                  seed={side === -1 ? 3 : 9} />
              </group>
            ))}
          </group>
        ),
      };
    }
    default: {
      // cta: dark water, the fused animal far away rising, BioNiche wordmark
      return {
        dim: 0.4,
        cam: { pos: [0, 0, 7 - s * 0.25], look: [0, 0.4, 0] },
        body: (
          <group position={[0, -0.6 + s * 0.35, -2]} scale={0.7}>
            {[-1, 1].map((side) => (
              <group key={side} position={[side * 0.55, 0, 0]}>
                <CombJelly t={t} rainbow={1} beat={1} beatSpeed={2.3} sync cut={side === -1 ? 1 : -1} knit={1}
                  seed={side === -1 ? 3 : 9} />
              </group>
            ))}
          </group>
        ),
      };
    }
  }
};

// Short dip at every scene change, so cuts feel soft but still snappy (4 frames).
const dipAt = (tl: Timeline, t: number) => {
  const cuts = scenesOf(tl).slice(1).map((sc) => sc.start);
  return Math.max(0, ...cuts.map((c) => 1 - Math.abs(t - c) / 0.07)) * 0.6;
};

export const CombJellyShort: React.FC<ShortProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!timeline) return null;
  const t = frame / fps;
  const shot = shotAt(timeline, t);
  const light = shot.light ?? 1;
  const last = timeline.words[timeline.words.length - 1];
  const blackAt = last.t + last.d + 0.25; // hard cut to black on the final beat
  const scenes = scenesOf(timeline);
  const cta = scenes[scenes.length - 1];
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop dim={shot.dim ?? 0} />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, near: 0.05, far: 60 }}>
        <CameraRig {...shot.cam} />
        <DeepSeaLights light={light} />
        <MarineSnow t={t} />
        {shot.body}
      </ThreeCanvas>
      {/* soft vignette keeps the eye on the animal */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
      {t >= cta.start && (
        <AbsoluteFill style={{ alignItems: "center", top: 560 }}>
          <div style={{ fontFamily, fontWeight: 800, fontSize: 74, letterSpacing: 26, color: "#d9b45a",
            opacity: pop(t, cta.start, cta.start + 0.35), textShadow: "0 6px 20px rgba(0,0,0,0.6)" }}>
            BIONICHE
          </div>
        </AbsoluteFill>
      )}
      <Captions tl={timeline} keywords={KEYWORDS} hideAfter={blackAt} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: dipAt(timeline, t) }} />
      {t >= blackAt && <AbsoluteFill style={{ backgroundColor: "#000" }} />}
    </AbsoluteFill>
  );
};
