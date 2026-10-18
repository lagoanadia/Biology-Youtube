// "This 'Flower' Is Really a Crowd of Animals" — low-poly droopy sea pen short. Scenes follow
// shorts/en/droopy-sea-pen.yaml. Facts: Monterey Bay Aquarium + Umbellula literature, see the package sources.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "../lib/montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { Captions } from "../lib/Captions";
import { clamp01, glide, lerp, pop, rng } from "../lib/lowpoly";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { SeaPen, stalkAt } from "../models/SeaPen";

const { fontFamily } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

type V3 = [number, number, number];
const KEYWORDS = ["flower", "crowd", "animals", "sea", "pen", "polyp", "stalk", "copies", "feathery", "water", "mud", "meters",
  "current", "team", "BioNiche"];

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

const Pop: React.FC<{ t: number; at: number; top?: number; size?: number; color?: string; children: React.ReactNode }> = ({
  t, at, top = 300, size = 110, color = "#ffffff", children,
}) =>
  t < at ? null : (
    <AbsoluteFill style={{ alignItems: "center", top }}>
      <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1.05, color, textAlign: "center",
        WebkitTextStroke: "14px #060a18", paintOrder: "stroke fill", textShadow: "0 10px 26px rgba(0,0,0,0.6)",
        scale: String(pop(t, at, at + 0.25, 0.4, 1)), rotate: `${lerp(-6, 0, clamp01((t - at) / 0.25))}deg` }}>
        {children}
      </div>
    </AbsoluteFill>
  );

// muddy seafloor; `cut` makes it see-through so the buried base shows
const Mud: React.FC<{ cut?: number }> = ({ cut = 0 }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(14, 14, 14, 14);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const r = rng(3);
    for (let i = 0; i < pos.count; i++) pos.setY(i, (r() - 0.5) * 0.06);
    const f = g.toNonIndexed();
    f.computeVertexNormals();
    return f;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#5a5048" flatShading transparent opacity={1 - cut * 0.65} depthWrite={cut < 0.5} />
    </mesh>
  );
};

const headPos = (t: number, bend = 0.25): V3 => stalkAt(1, 1, bend, t).toArray() as V3;

type Shot = { cam: { pos: V3; look: V3; fov?: number }; light?: number; body: React.ReactNode; overlay?: React.ReactNode };

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const u = s / D;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const head = headPos(t);

  switch (scene.visual) {
    case "hook": {
      const a = -0.4 + u * 0.4;
      return {
        cam: { pos: [Math.sin(a) * 6.4 + 0.3, 1.9, Math.cos(a) * 6.4], look: [0.3, 1.75, 0] },
        body: (
          <>
            <Mud />
            <SeaPen t={t} />
          </>
        ),
      };
    }
    case "crowd": {
      // zoom onto the head: every polyp lights up in turn, it's many animals
      const k = glide(s, 0, D * 0.5, 0, 1);
      return {
        cam: { pos: [lerp(2.6, 1.4, k) + head[0], head[1] + lerp(0.2, 0.6, k), lerp(4.5, 2.1, k)], look: head },
        body: (
          <>
            <Mud />
            <SeaPen t={t} feed={0.5 + 0.5 * Math.sin(t * 8)} pump={1} />
          </>
        ),
        overlay: <Pop t={t} at={w(1, 4)} size={110} color="#ff9a6b">COLONY</Pop>,
      };
    }
    case "name": {
      return {
        cam: { pos: [1.8, 1.6, 6.4 - u * 0.4], look: [0.3, 1.7, 0] },
        body: (
          <>
            <Mud />
            <SeaPen t={t} />
          </>
        ),
        overlay: <Pop t={t} at={S + 0.1} size={100}>DROOPY SEA PEN</Pop>,
      };
    }
    case "grow": {
      // one tiny polyp on the mud, then it shoots up into the stalk (on "grows")
      const grow = glide(t, w(4, 2) - 0.1, S + D, 0.04, 1);
      const top = stalkAt(1, grow, 0.1, t);
      return {
        cam: { pos: [1.6, lerp(0.7, 1.7, grow), lerp(3.2, 6.2, grow)], look: [0, lerp(0.2, top.y * 0.6, grow), 0] },
        body: (
          <>
            <Mud />
            <SeaPen t={t} grow={grow} bud={0.12} bend={0.1} swell={0.3} />
          </>
        ),
      };
    }
    case "bud": {
      // new polyps bud at the top one by one
      return {
        cam: { pos: [head[0] + 1.9, head[1] + 0.6, 2.3], look: head },
        body: (
          <>
            <Mud />
            <SeaPen t={t} bud={glide(s, 0.2, D * 0.85, 0.12, 1)} />
          </>
        ),
        overlay: <Pop t={t} at={w(5, 9)} size={96} color="#ff9a6b">CLONES</Pop>,
      };
    }
    case "feeders": {
      return {
        cam: { pos: [head[0] + 1.4, head[1] + 0.7, 1.5], look: [head[0], head[1] + 0.05, 0] },
        body: (
          <>
            <Mud />
            <SeaPen t={t} feed={glide(s, 0, 0.5, 0, 1)} open={glide(s, 0, 1.2, 0.4, 1)} />
          </>
        ),
        overlay: <Pop t={t} at={w(6, 4)} size={84} color="#ffd34d">FEEDING POLYPS</Pop>,
      };
    }
    case "pumps": {
      const r = rng(2);
      return {
        cam: { pos: [head[0] + 0.6, head[1] - 0.9, 1.5], look: [head[0], head[1] - 0.05, 0] },
        body: (
          <>
            <Mud />
            <SeaPen t={t} pump={glide(s, 0, 0.5, 0, 1)} />
            {Array.from({ length: 14 }, (_, i) => {
              const ph = (t * 0.6 + r()) % 1;
              const a = r() * Math.PI * 2;
              return (
                <mesh key={i} position={[head[0] + Math.cos(a) * (0.5 - ph * 0.4), head[1] - 0.25 + ph * 0.2, Math.sin(a) * (0.5 - ph * 0.4)]} scale={0.012}>
                  <tetrahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial color="#9fdcff" transparent opacity={1 - ph} />
                </mesh>
              );
            })}
          </>
        ),
        overlay: <Pop t={t} at={w(7, 1)} size={84} color="#9fdcff">PUMPING POLYPS</Pop>,
      };
    }
    case "anchor": {
      // cut-away of the mud: the base swells and grips the sediment
      return {
        cam: { pos: [0.9, 0.15, 1.6], look: [0, -0.1, 0] },
        body: (
          <>
            <Mud cut={1} />
            <SeaPen t={t} swell={glide(s, 0.2, D * 0.7, 0.2, 1.6)} />
          </>
        ),
        overlay: <Pop t={t} at={w(8, 3)} size={110} color="#ffd34d">ANCHOR</Pop>,
      };
    }
    case "tall": {
      // wide: the full height, with a 2 m bar
      return {
        cam: { pos: [2.6, 1.3, 5.8], look: [0.3, 1.3, 0] },
        body: (
          <>
            <Mud />
            <SeaPen t={t} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(9, 6)} size={130} color="#ffd34d">2+ M</Pop>
            {t >= w(9, 6) && (
              <AbsoluteFill style={{ left: 120, top: 520 }}>
                <div style={{ width: 16, height: lerp(0, 760, clamp01((t - w(9, 6)) / 0.4)), background: "#ffd34d",
                  border: "4px solid #060a18", borderRadius: 4 }} />
              </AbsoluteFill>
            )}
          </>
        ),
      };
    }
    case "current": {
      // the current leans the head over; plankton drift into the tentacles
      const bend = glide(s, 0, D * 0.5, 0.25, 1);
      const h = stalkAt(1, 1, bend, t);
      const r = rng(6);
      return {
        cam: { pos: [h.x + 1.2, h.y + 0.6, 3.2], look: [h.x, h.y - 0.1, 0] },
        body: (
          <>
            <Mud />
            <SeaPen t={t} bend={bend} feed={0.3} />
            {Array.from({ length: 18 }, (_, i) => {
              const x = -2 + ((t * 0.8 + r() * 4) % 4);
              return (
                <mesh key={i} position={[x, h.y - 0.4 + r() * 0.8, (r() - 0.5) * 0.8]}>
                  <boxGeometry args={[0.3, 0.008, 0.008]} />
                  <meshBasicMaterial color="#9fdcff" transparent opacity={0.4} />
                </mesh>
              );
            })}
          </>
        ),
      };
    }
    case "team": {
      // pull back: a field of sea pens nodding in the current
      const r = rng(9);
      return {
        cam: { pos: [3.5, 2.4, lerp(7, 8.5, u)], look: [0, 1.0, -1] },
        body: (
          <>
            <Mud />
            <SeaPen t={t} bend={0.5} feed={0.4 + 0.4 * Math.sin(t * 4)} />
            {Array.from({ length: 6 }, (_, i) => (
              <group key={i} position={[(r() - 0.5) * 5, 0, -0.8 - r() * 2.5]} scale={0.7 + r() * 0.4}>
                <SeaPen t={t + i} bend={0.5} seed={i + 2} />
              </group>
            ))}
          </>
        ),
        overlay: <Pop t={t} at={w(11, 6)} size={110} color="#ff9a6b">ONE TEAM</Pop>,
      };
    }
    default: {
      return {
        light: 0.8,
        cam: { pos: [0, 2.0, 7.6 - u * 0.4], look: [0.3, 2.6, 0] },
        body: (
          <>
            <Mud />
            <SeaPen t={t} bend={0.4} />
          </>
        ),
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

export const SeaPenShort: React.FC<ShortProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!timeline) return null;
  const t = frame / fps;
  const shot = shotAt(timeline, t);
  const last = timeline.words[timeline.words.length - 1];
  const blackAt = Math.min(timeline.total - 0.1, last.t + last.d + 0.25);
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop dim={0.2} />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, near: 0.05, far: 60 }}>
        <CameraRig {...shot.cam} />
        <DeepSeaLights light={shot.light ?? 1} />
        <MarineSnow t={t} count={50} />
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
