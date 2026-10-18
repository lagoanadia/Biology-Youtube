// "This Octopus Guarded Her Eggs for 4.5 Years" — low-poly short. Scenes follow shorts/en/brooding-octopus.yaml
// (beat `visual` = scene id). Facts: Robison, Seibel & Drazen 2014 (PLoS ONE), see the package sources.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "../lib/montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { RockOutcrop } from "../env/Rock";
import { Captions } from "../lib/Captions";
import { clamp01, glide, lerp, pop, rng } from "../lib/lowpoly";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Crab, Shrimp } from "../models/Critters";
import { Eggs } from "../models/Eggs";
import { Octopus } from "../models/Octopus";
import { Rov } from "../models/Rov";

const { fontFamily } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

type V3 = [number, number, number];
const OCTO: V3 = [0, -0.5, 0.02]; // she clings to the rock face just above the seafloor
const EGGS: V3 = [0, -0.76, 0.06];
const KEYWORDS = ["eggs", "four", "half", "years", "2007", "eighteen", "freezing", "slowly", "paler", "gone", "empty",
  "hatched", "longer", "BioNiche"];

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

// Big pop-up text above the captions (Zack-style graphics)
const Pop: React.FC<{ t: number; at: number; until?: number; top?: number; size?: number; color?: string; children: React.ReactNode }> = ({
  t, at, until = Infinity, top = 330, size = 120, color = "#ffffff", children,
}) => {
  if (t < at || t >= until) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", top }}>
      <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1.05, color, textAlign: "center",
        WebkitTextStroke: "14px #060a18", paintOrder: "stroke fill", textShadow: "0 10px 26px rgba(0,0,0,0.6)",
        scale: String(pop(t, at, at + 0.25, 0.4, 1)), rotate: `${lerp(-6, 0, clamp01((t - at) / 0.25))}deg` }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

type Shot = {
  cam: { pos: V3; look: V3; fov?: number };
  light?: number;
  dim?: number;
  body: React.ReactNode;
  overlay?: React.ReactNode;
};

const Mother: React.FC<{ t: number; pale?: number; grow?: number; embryo?: number; push?: number; pushTarget?: V3 }> = ({
  t, pale = 0.15, grow = 0.35, embryo = 0, push = 0, pushTarget,
}) => (
  <>
    <group position={EGGS}>
      <Eggs t={t} grow={grow} embryo={embryo} />
    </group>
    <group position={OCTO}>
      <Octopus t={t} pale={pale} push={push} pushTarget={pushTarget} />
    </group>
  </>
);

// babies swimming out of the clutch: they start at the eggs and spread up/out toward the camera
const Babies: React.FC<{ t: number; u: number; n?: number }> = ({ t, u, n = 9 }) => {
  const r = rng(77);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const dir: V3 = [(r() - 0.5) * 1.5, 0.2 + r() * 0.8, 0.3 + r() * 0.7];
        const d = pop(u, i * 0.05, i * 0.05 + 0.7) * (0.8 + r() * 0.4);
        return (
          <group key={i} position={[EGGS[0] + dir[0] * d, EGGS[1] + dir[1] * d, EGGS[2] + dir[2] * d]} scale={0.14 * clamp01(d * 4)}
            rotation={[0.3, r() * 2 - 1, (r() - 0.5) * 0.6]}>
            <Octopus t={t * 1.6 + i} pale={0.55} cup={0} swim={1} seed={i + 5} />
          </group>
        );
      })}
    </>
  );
};

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const u = s / D;

  switch (scene.visual) {
    case "hook": {
      const tYears = w(0, 7);
      return {
        cam: { pos: [lerp(0.9, 0.5, pop(s, 0, 0.8)), lerp(-0.1, -0.25, u), lerp(3.6, 2.9, glide(s, 0, D, 0, 1))], look: [0, -0.48, 0] },
        body: <Mother t={t} />,
        overlay: <Pop t={t} at={tYears} color="#ffd34d">4.5 YEARS</Pop>,
      };
    }
    case "rov_finds": {
      const down = glide(s, 0, D * 0.6, 0, 1);
      const tYear = w(1, 1);
      return {
        light: lerp(0.35, 1, down),
        cam: { pos: [2.2 - u * 0.4, 0.5, 6.6 - u * 0.6], look: [0.3, -0.1, 0] },
        body: (
          <>
            <Mother t={t} />
            <group position={[0.85, lerp(3.4, 0.55, down), 1.5]} rotation={[0.1, Math.PI + 0.25, 0]} scale={0.55}>
              <Rov t={t} lights={down > 0.5 ? 1 : 0.4} />
            </group>
          </>
        ),
        overlay: (
          <Pop t={t} at={tYear} size={64} top={300} color="#9fe9ff">
            2007 · 1,400 M DEEP
          </Pop>
        ),
      };
    }
    case "rov_returns": {
      // the ROV leaves upward, then comes back down
      const away = u < 0.45 ? glide(u, 0, 0.45, 0, 1) : glide(u, 0.55, 1, 1, 0);
      return {
        cam: { pos: [2.0, 0.6, 6.4], look: [0.3, 0.2, 0] },
        body: (
          <>
            <Mother t={t} />
            <group position={[0.85, lerp(0.55, 2.6, away), lerp(1.5, 2.2, away)]} rotation={[0.1, Math.PI + 0.25, 0]} scale={0.55}>
              <Rov t={t} lights={1} />
            </group>
          </>
        ),
      };
    }
    case "eighteen": {
      // counter 1 → 18 while the ROV lights flash on her again and again
      const n = Math.min(18, 1 + Math.floor(glide(s, 0, D * 0.8, 0, 17.99)));
      const flash = 0.5 + 0.5 * Math.cos(n * Math.PI);
      return {
        light: 0.55 + 0.45 * flash,
        cam: { pos: [0.5, -0.2, 3.2 - u * 0.2], look: [0, -0.5, 0] },
        body: <Mother t={t} />,
        overlay: (
          <Pop t={t} at={S} size={180} top={280} color="#ffd34d">
            {n}×
          </Pop>
        ),
      };
    }
    case "covering": {
      const orbit = lerp(-0.7, -0.2, u);
      return {
        cam: { pos: [Math.sin(orbit) * 2.5, -0.3, Math.cos(orbit) * 2.5 + 0.1], look: [0, -0.55, 0.1] },
        body: <Mother t={t} pale={0.25} grow={0.45} />,
      };
    }
    case "crabs": {
      // a king crab walks in on the seafloor from the right, a shrimp swims in from the left
      const cx = lerp(1.9, 0.5, glide(t, S, S + D * 0.75, 0, 1));
      const sx = lerp(-1.8, -0.5, glide(t, S + 0.3, S + D * 0.8, 0, 1));
      return {
        cam: { pos: [0.1, -0.5, 4.6 - u * 0.4], look: [0, -0.62, 0] },
        body: (
          <>
            <Mother t={t} pale={0.3} grow={0.5} />
            <group position={[cx, -1.0, 0.35]} rotation={[0, -Math.PI / 2 + 0.3, 0]} scale={1.1}>
              <Crab t={t} walk={cx > 0.6 ? 1 : 0.2} />
            </group>
            <group position={[sx, -0.45 + Math.sin(t * 2) * 0.04, 0.45]} rotation={[0, Math.PI / 2 - 0.2, 0]} scale={1.1}>
              <Shrimp t={t} />
            </group>
          </>
        ),
      };
    }
    case "push": {
      // one arm reaches the crab and flicks it away; the shrimp darts off
      const reach = u < 0.5 ? glide(u, 0, 0.4, 0, 1) : glide(u, 0.55, 0.95, 1, 0);
      const fly = pop(u, 0.38, 0.9);
      const crab: V3 = [0.5 + fly * 1.1, -1.0 + Math.sin(fly * Math.PI) * 0.5, 0.35 + fly * 0.3];
      const target: V3 = [crab[0] - OCTO[0] - 0.05, crab[1] - OCTO[1] + 0.1, crab[2] - OCTO[2]];
      return {
        cam: { pos: [0.2, -0.5, 4.3], look: [0.15, -0.62, 0] },
        body: (
          <>
            <Mother t={t} pale={0.3} grow={0.5} push={reach} pushTarget={target} />
            <group position={crab} rotation={[fly * 2.5, -Math.PI / 2 + 0.3, fly * 3]} scale={1.1}>
              <Crab t={t} walk={0} />
            </group>
            <group position={[-0.5 - fly * 2.2, -0.45 + fly * 0.6, 0.45]} rotation={[0, -Math.PI / 2, 0]} scale={1.1}>
              <Shrimp t={t * 2} />
            </group>
          </>
        ),
      };
    }
    case "cold": {
      const orbit = lerp(0.5, 0.1, u);
      return {
        light: 0.75,
        cam: { pos: [Math.sin(orbit) * 3.3, -0.2, Math.cos(orbit) * 3.3], look: [0, -0.5, 0] },
        body: <Mother t={t * 0.6} pale={0.4} grow={0.55} />,
        overlay: (
          <>
            <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(150,220,255,0.28), transparent 45%)" }} />
            <Pop t={t} at={S + 0.3} size={150} top={300} color="#bfefff">
              3°C
            </Pop>
          </>
        ),
      };
    }
    case "eggs_grow": {
      const month = Math.round(lerp(1, 30, glide(s, 0, D, 0, 1)));
      return {
        cam: { pos: [0.75, -0.95, lerp(1.35, 1.1, u)], look: [0, -0.8, 0.05] },
        body: <Mother t={t * 0.6} pale={0.45} grow={lerp(0.4, 0.8, u)} />,
        overlay: (
          <Pop t={t} at={S} size={96} top={300}>
            MONTH {month}
          </Pop>
        ),
      };
    }
    case "paler": {
      const month = Math.round(lerp(30, 53, glide(s, 0, D, 0, 1)));
      return {
        cam: { pos: [0.55, -0.3, lerp(2.9, 2.4, u)], look: [0, -0.5, 0] },
        body: <Mother t={t * 0.5} pale={lerp(0.45, 0.95, u)} grow={lerp(0.8, 1, u)} embryo={u} />,
        overlay: (
          <Pop t={t} at={S} size={96} top={300}>
            MONTH {month}
          </Pop>
        ),
      };
    }
    case "gone": {
      // the rock is empty: only torn, empty capsules are left
      const close = glide(t, w(12, 0) - 0.2, S + D, 0, 1);
      return {
        light: 0.85,
        cam: { pos: [lerp(1.4, 0.3, close), lerp(-0.25, -0.62, close), lerp(3.0, 1.0, close)], look: [0, lerp(-0.6, -0.8, close), 0] },
        body: (
          <group position={EGGS}>
            <Eggs t={t * 0.3} grow={1} empty={1} />
          </group>
        ),
      };
    }
    case "hatch": {
      return {
        cam: { pos: [0.3, -0.3, 2.6], look: [0, -0.4, 0] },
        body: (
          <>
            <group position={EGGS}>
              <Eggs t={t} grow={1} empty={glide(u, 0, 0.5, 0.3, 1)} />
            </group>
            <Babies t={t} u={u} />
          </>
        ),
      };
    }
    case "record": {
      return {
        cam: { pos: [0.6, -0.3, lerp(3.3, 2.8, u)], look: [0, -0.5, 0] },
        body: <Mother t={t} pale={0.6} grow={0.9} />,
        overlay: (
          <>
            <Pop t={t} at={S + 0.1} size={150} top={250} color="#ffd34d">
              53 MONTHS
            </Pop>
            <Pop t={t} at={S + 0.6} size={62} top={430}>
              LONGEST EVER RECORDED
            </Pop>
          </>
        ),
      };
    }
    default: {
      return {
        dim: 0.3,
        cam: { pos: [0, 0.4, 3.6 - u * 0.3], look: [0, 0.6, 0] },
        body: <Babies t={t} u={0.85 + u * 0.15} n={11} />,
        overlay: (
          <AbsoluteFill style={{ alignItems: "center", top: 560 }}>
            <div style={{ fontFamily, fontWeight: 800, fontSize: 74, letterSpacing: 26, color: "#d9b45a",
              opacity: pop(t, S, S + 0.35), textShadow: "0 6px 20px rgba(0,0,0,0.6)" }}>
              BIONICHE
            </div>
          </AbsoluteFill>
        ),
      };
    }
  }
};

const dipAt = (tl: Timeline, t: number) => {
  const cuts = scenesOf(tl).slice(1).map((sc) => sc.start);
  return Math.max(0, ...cuts.map((c) => 1 - Math.abs(t - c) / 0.07)) * 0.6;
};

export const OctopusShort: React.FC<ShortProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!timeline) return null;
  const t = frame / fps;
  const shot = shotAt(timeline, t);
  const scenes = scenesOf(timeline);
  const showRock = !["cta"].includes(sceneAt(scenes, t).scene.visual);
  const last = timeline.words[timeline.words.length - 1];
  const blackAt = Math.min(timeline.total - 0.1, last.t + last.d + 0.25);
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop dim={shot.dim ?? 0} />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, near: 0.05, far: 60 }}>
        <CameraRig {...shot.cam} />
        <DeepSeaLights light={shot.light ?? 1} />
        <MarineSnow t={t} />
        {showRock && <RockOutcrop />}
        {shot.body}
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
      {shot.overlay}
      <Captions tl={timeline} keywords={KEYWORDS} hideAfter={blackAt} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: dipAt(timeline, t) }} />
      {t >= blackAt && <AbsoluteFill style={{ backgroundColor: "#000" }} />}
    </AbsoluteFill>
  );
};
