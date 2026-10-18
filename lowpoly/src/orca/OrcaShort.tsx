// "These Orcas Make Waves to Catch Seals" — low-poly short. Scenes follow shorts/en/orca-wave-wash.yaml.
// Facts: Pitman & Durban 2012 (Marine Mammal Science), see the package sources. No gore: the story ends with the
// seal sliding into the water.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "../lib/montserrat";
import { PolarBackdrop, PolarLights, PushWave, Water, waveHeight } from "../env/Polar";
import { Captions } from "../lib/Captions";
import { clamp01, glide, lerp, pop, rng } from "../lib/lowpoly";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { IceFloe, Orca, Seal } from "../models/PolarAnimals";

const { fontFamily } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

type V3 = [number, number, number];
const KEYWORDS = ["waves", "wave", "ice", "Antarctica", "spy-hopping", "together", "breaks", "weird", "Weddell", "why", "BioNiche"];

const CameraRig: React.FC<{ pos: V3; look: V3; fov?: number }> = ({ pos, look, fov = 38 }) => {
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
        WebkitTextStroke: "14px #0b1622", paintOrder: "stroke fill", textShadow: "0 10px 26px rgba(0,0,0,0.45)",
        scale: String(pop(t, at, at + 0.25, 0.4, 1)), rotate: `${lerp(-6, 0, clamp01((t - at) / 0.25))}deg` }}>
        {children}
      </div>
    </AbsoluteFill>
  );

// A floe that floats on the water surface (bobs + tilts with the waves), optionally carrying seals.
export const Floe: React.FC<{ t: number; at: V3; push?: PushWave[]; crack?: number; radius?: number; seed?: number; children?: React.ReactNode }> = ({
  t, at, push, crack = 0, radius = 1.6, seed = 6, children,
}) => {
  const h = waveHeight(at[0], at[2], t, push);
  const dz = waveHeight(at[0], at[2] + 0.6, t, push) - waveHeight(at[0], at[2] - 0.6, t, push);
  const dx = waveHeight(at[0] + 0.6, at[2], t, push) - waveHeight(at[0] - 0.6, at[2], t, push);
  return (
    <group position={[at[0], h, at[2]]} rotation={[dz * 0.35, 0, -dx * 0.35]}>
      <IceFloe radius={radius} crack={crack} seed={seed} />
      {children}
    </group>
  );
};

// Orca swimming at the surface: body just under the water so the black back and fin break the surface.
export const SwimOrca: React.FC<{ t: number; at: V3; yaw?: number; depth?: number; seed?: number }> = ({ t, at, yaw = 0, depth = -0.32, seed = 1 }) => (
  <group position={[at[0], depth + Math.sin(t * 2 + seed) * 0.05, at[2]]} rotation={[0, yaw, 0]}>
    <Orca t={t + seed} seed={seed} />
  </group>
);

type Shot = { cam: { pos: V3; look: V3; fov?: number }; body: React.ReactNode; overlay?: React.ReactNode };

const MAIN_SEAL = (t: number) => (
  <group position={[0.15, 0.2, 0]} rotation={[0, 0.9, 0]}>
    <Seal t={t} kind="weddell" />
  </group>
);

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const u = s / D;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);

  switch (scene.visual) {
    case "hook": {
      // teaser: a line of fins charges the floe and a wave rises in front of them
      const zRow = lerp(9, 3.2, glide(s, 0, D, 0, 1));
      const push: PushWave[] = [{ dirX: 0, dirZ: -1, pos: -(zRow - 1.3), amp: lerp(0.05, 0.75, u), width: 0.8 }];
      return {
        cam: { pos: [5.2 - u * 0.6, 2.6, 7.5], look: [0, 0, 1.8] },
        body: (
          <>
            <Water t={t} push={push} />
            <Floe t={t} at={[0, 0, 0]} push={push}>{MAIN_SEAL(t)}</Floe>
            {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
              <SwimOrca key={i} t={t} at={[x, 0, zRow]} yaw={Math.PI} seed={i + 1} />
            ))}
          </>
        ),
      };
    }
    case "floes": {
      // aerial over the pack ice: seals resting on floes, an orca fin circling
      const a = t * 0.6;
      return {
        cam: { pos: [lerp(-2, 1.5, u), lerp(9, 7.5, u), 7.5], look: [0, 0, 0.5] },
        body: (
          <>
            <Water t={t} />
            <Floe t={t} at={[0, 0, 0]}>{MAIN_SEAL(t)}</Floe>
            <Floe t={t} at={[-3.6, 0, -1.5]} radius={1.3} seed={9}>
              <group position={[0, 0.2, 0]} rotation={[0, 2, 0]}><Seal t={t} kind="crabeater" seed={5} /></group>
            </Floe>
            <Floe t={t} at={[3.4, 0, -2.4]} radius={1.2} seed={12}>
              <group position={[0, 0.2, 0]} rotation={[0, -1, 0]}><Seal t={t} kind="crabeater" seed={7} /></group>
            </Floe>
            <SwimOrca t={t} at={[Math.cos(a) * 2.8, 0, Math.sin(a) * 2.8 + 0.4]} yaw={-a} />
          </>
        ),
        overlay: <Pop t={t} at={S + 0.1} size={92} color="#e8f6ff">ANTARCTICA</Pop>,
      };
    }
    case "spyhop": {
      // an orca rises vertically, head out of the water, looking at the floe
      const rise = pop(s, 0.2, 1.2);
      return {
        cam: { pos: [5.0, 0.9, 5.0 - u * 0.4], look: [1.4, 0.6, 0.4] },
        body: (
          <>
            <Water t={t} />
            <Floe t={t} at={[0, 0, 0]}>{MAIN_SEAL(t)}</Floe>
            <group position={[2.2, lerp(-2.2, -0.35, rise) + Math.sin(t * 1.6) * 0.06, 0.9]} rotation={[0, -2.2, 0]}>
              <group rotation={[-Math.PI / 2 + 0.2, 0, 0]}>
                <Orca t={t} swim={0.2} />
              </group>
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(3, 2)} size={110} color="#ffd34d">SPY-HOPPING</Pop>,
      };
    }
    case "lineup": {
      // aerial: four orcas slide into a row, side by side, facing the floe
      const k = glide(s, 0.2, D * 0.8, 0, 1);
      const r = rng(3);
      return {
        cam: { pos: [0.5, 9.5, 10.5], look: [0, 0, 3.6] },
        body: (
          <>
            <Water t={t} />
            <Floe t={t} at={[0, 0, 0]}>{MAIN_SEAL(t)}</Floe>
            {[-1.6, -0.55, 0.55, 1.6].map((x, i) => {
              const start: V3 = [(r() - 0.5) * 8, 0, 7 + r() * 3];
              return (
                <SwimOrca key={i} t={t} at={[lerp(start[0], x, k), 0, lerp(start[2], 6.2, k)]}
                  yaw={lerp(Math.atan2(x - start[0], 6.2 - start[2]) + Math.PI, Math.PI, k)} seed={i + 1} />
              );
            })}
          </>
        ),
      };
    }
    case "charge": {
      // low, behind the row: they sprint at the ice together, a wave building in front of them
      const zRow = lerp(6.2, 2.6, glide(s, 0, D, 0, 1));
      const push: PushWave[] = [{ dirX: 0, dirZ: -1, pos: -(zRow - 1.3), amp: lerp(0.1, 0.6, u), width: 0.8 }];
      return {
        cam: { pos: [1.2, 1.3, zRow + 5.5], look: [0, 0.2, 0] },
        body: (
          <>
            <Water t={t} push={push} />
            <Floe t={t} at={[0, 0, 0]} push={push}>{MAIN_SEAL(t)}</Floe>
            {[-1.6, -0.55, 0.55, 1.6].map((x, i) => (
              <SwimOrca key={i} t={t * 1.6} at={[x, 0, zRow]} yaw={Math.PI} seed={i + 1} />
            ))}
          </>
        ),
      };
    }
    case "wave": {
      // side view: the crest rolls over the floe, the floe tips and the seal slides toward the edge
      const pos = lerp(-2.5, 2.8, glide(s, 0, D, 0, 1));
      const push: PushWave[] = [{ dirX: 0, dirZ: -1, pos, amp: 0.75, width: 0.85 }];
      const slide = glide(s, D * 0.45, D, 0, 0.6);
      return {
        cam: { pos: [5.4, 1.1, 0.6], look: [0, 0.2, 0] },
        body: (
          <>
            <Water t={t} push={push} />
            <Floe t={t} at={[0, 0, 0]} push={push}>
              <group position={[0.15, 0.2, -slide]} rotation={[0, 0.9 + slide, slide * 0.3]}>
                <Seal t={t} kind="weddell" />
              </group>
            </Floe>
            {[-1.6, -0.55, 0.55, 1.6].map((x, i) => (
              <SwimOrca key={i} t={t} at={[x, 0, 2.6 - s * 0.6]} yaw={Math.PI} depth={-0.7} seed={i + 1} />
            ))}
          </>
        ),
      };
    }
    case "waves": {
      // wave after wave: three crests in a row
      const push: PushWave[] = [0, 1, 2].map((k) => ({ dirX: 0, dirZ: -1, pos: lerp(-3, 3, (u * 1.6 - k * 0.35)), amp: 0.5, width: 0.7 }));
      return {
        cam: { pos: [6.0, 3.0, 6.0], look: [0, 0, 0] },
        body: (
          <>
            <Water t={t} push={push} />
            <Floe t={t} at={[0, 0, 0]} push={push}>
              <group position={[0.15, 0.2, -0.6]} rotation={[0, 1.5, 0.2]}><Seal t={t} kind="weddell" /></group>
            </Floe>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={S + 0.2} size={140} color="#ffd34d">4 WAVES</Pop>
            <Pop t={t} at={S + 0.5} top={455} size={52}>ON AVERAGE</Pop>
          </>
        ),
      };
    }
    case "breaks": {
      // the floe cracks into pieces; the next wave washes the seal off its small piece into the water
      const crack = pop(t, w(8, 3) - 0.1, w(8, 3) + 0.5);
      const pos = lerp(-3, 3, glide(s, D * 0.45, D, 0, 1));
      const push: PushWave[] = [{ dirX: 0, dirZ: -1, pos, amp: 0.35, width: 0.75 }];
      const off = glide(s, D * 0.5, D * 0.85, 0, 1);
      const splash = clamp01((s - D * 0.78) / 0.4);
      return {
        cam: { pos: [5.0, 2.4, 2.6], look: [0.8, 0, -1.0] },
        body: (
          <>
            <Water t={t} push={push} />
            <Floe t={t} at={[0, 0, 0]} push={push} crack={crack} />
            <group position={[lerp(0.75, 0.15, off), lerp(0.28, -0.22, off) + waveHeight(0.8, -0.8, t, push), lerp(-0.85, -2.4, off)]}
              rotation={[off * 0.6, 0.9, off * 0.8]}>
              <Seal t={t} kind="weddell" />
            </group>
            {splash > 0 && splash < 1 &&
              Array.from({ length: 10 }, (_, i) => {
                const a = (i / 10) * Math.PI * 2;
                return (
                  <mesh key={i} position={[0.15 + Math.cos(a) * splash * 0.6, Math.sin(splash * Math.PI) * 0.5, -2.4 + Math.sin(a) * splash * 0.6]}
                    scale={0.06 * (1 - splash)}>
                    <tetrahedronGeometry args={[1, 0]} />
                    <meshStandardMaterial color="#ffffff" flatShading />
                  </mesh>
                );
              })}
          </>
        ),
      };
    }
    case "weird": {
      // close on an orca's head at the surface
      return {
        cam: { pos: [2.6 - u * 0.3, 0.45, 1.8], look: [0, 0.05, 0.85] },
        body: (
          <>
            <Water t={t} />
            <group position={[0, -0.18, 0]} rotation={[-0.08, 0, 0]}>
              <Orca t={t} swim={0.3} />
            </group>
          </>
        ),
      };
    }
    case "weddell": {
      return {
        cam: { pos: [1.8, 1.1, 2.2 - u * 0.3], look: [0, 0.4, 0] },
        body: (
          <>
            <Water t={t} />
            <Floe t={t} at={[0, 0, 0]}>{MAIN_SEAL(t)}</Floe>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(10, 5)} size={100} color="#ffd34d">WEDDELL SEAL</Pop>
            <Pop t={t} at={w(10, 5) + 0.4} top={430} size={56}>14 OF 15 CATCHES</Pop>
          </>
        ),
      };
    }
    case "others": {
      // many floes with crabeater seals, a single Weddell
      const spots: V3[] = [[-3.4, 0, -1.2], [3.2, 0, -2.2], [-1.6, 0, -4.6], [2.0, 0, -6], [-4.6, 0, -6.8], [4.8, 0, -5]];
      return {
        cam: { pos: [lerp(0, 1, u), 7.5, 7.5], look: [0, 0, -2] },
        body: (
          <>
            <Water t={t} />
            <Floe t={t} at={[0, 0, 0]}>{MAIN_SEAL(t)}</Floe>
            {spots.map((p, i) => (
              <Floe key={i} t={t} at={p} radius={1.2} seed={20 + i}>
                {[0, 1].map((k) => (
                  <group key={k} position={[k * 0.6 - 0.3, 0.2, k * 0.3]} rotation={[0, i + k * 2, 0]}>
                    <Seal t={t} kind="crabeater" seed={i * 2 + k} />
                  </group>
                ))}
              </Floe>
            ))}
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={S + 0.2} size={92} color="#f3dcae">82% CRABEATER</Pop>
            <Pop t={t} at={S + 0.6} top={420} size={60}>15% WEDDELL</Pop>
          </>
        ),
      };
    }
    case "mystery": {
      const rise = pop(s, 0, 0.8);
      return {
        cam: { pos: [0.6, 0.6, 3.6 - u * 0.3], look: [0, 0.8, 0] },
        body: (
          <>
            <Water t={t} />
            <group position={[0, lerp(-2.2, -0.4, rise) + Math.sin(t * 1.6) * 0.05, 0]} rotation={[0, 1.25, 0]}>
              <group rotation={[-Math.PI / 2 + 0.1, 0, 0]}>
                <Orca t={t} swim={0.2} />
              </group>
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(12, 4)} size={260} color="#ffd34d">?</Pop>,
      };
    }
    default: {
      // cta: aerial, the pod swims away in a line
      return {
        cam: { pos: [0, 9, 7], look: [0, 0, -1] },
        body: (
          <>
            <Water t={t} />
            {[-1.6, -0.55, 0.55, 1.6].map((x, i) => (
              <SwimOrca key={i} t={t} at={[x, 0, 2 - s * 1.2]} yaw={Math.PI} seed={i + 1} />
            ))}
          </>
        ),
        overlay: (
          <AbsoluteFill style={{ alignItems: "center", top: 560 }}>
            <div style={{ fontFamily, fontWeight: 800, fontSize: 74, letterSpacing: 26, color: "#d9b45a",
              WebkitTextStroke: "8px #0b1622", paintOrder: "stroke fill", opacity: pop(t, S, S + 0.35) }}>
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
  return Math.max(0, ...cuts.map((c) => 1 - Math.abs(t - c) / 0.07)) * 0.5;
};

export const OrcaShort: React.FC<ShortProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!timeline) return null;
  const t = frame / fps;
  const shot = shotAt(timeline, t);
  const last = timeline.words[timeline.words.length - 1];
  const blackAt = Math.min(timeline.total - 0.1, last.t + last.d + 0.25);
  return (
    <AbsoluteFill>
      <PolarBackdrop />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 38, near: 0.05, far: 80 }}>
        <CameraRig {...shot.cam} />
        <PolarLights />
        {shot.body}
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 60%, rgba(0,10,25,0.45) 100%)" }} />
      {shot.overlay}
      <Captions tl={timeline} keywords={KEYWORDS} hideAfter={blackAt} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: dipAt(timeline, t) }} />
      {t >= blackAt && <AbsoluteFill style={{ backgroundColor: "#000" }} />}
    </AbsoluteFill>
  );
};
