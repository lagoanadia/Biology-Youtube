// "This Fish Has Eyes as Big as Its Head" — low-poly owlfish short. Scenes follow shorts/en/owlfish-eyes.yaml.
// Facts: Monterey Bay Aquarium, MBARI/KION, see the package sources.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "../lib/montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { Captions } from "../lib/Captions";
import { clamp01, glide, lerp, pop, rng } from "../lib/lowpoly";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Shrimp } from "../models/Critters";
import { Owl, Owlfish } from "../models/Owlfish";
import { Jellyfish } from "../models/Props";
import { Rov } from "../models/Rov";

const { fontFamily } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

type V3 = [number, number, number];
const KEYWORDS = ["eyes", "head", "owlfish", "hand", "Pacific", "sunlight", "light", "owl", "glimmers", "shrimp", "jellies", "robot",
  "false", "BioNiche"];

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

// faint blue bioluminescent sparkles
const Glimmers: React.FC<{ t: number; n?: number; spread?: number }> = ({ t, n = 18, spread = 3 }) => {
  const r = rng(21);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const on = Math.max(0, Math.sin(t * (1.5 + r() * 2) + r() * 10)) ** 3;
        return (
          <mesh key={i} position={[(r() - 0.5) * spread, (r() - 0.5) * spread * 1.4, -r() * spread]} scale={0.02 + on * 0.035}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={new THREE.Color("#5ad1ff").multiplyScalar(0.2 + on)} />
          </mesh>
        );
      })}
    </>
  );
};

// sunbeams from above that fade with `amount`
const Sunbeams: React.FC<{ amount: number }> = ({ amount }) =>
  amount <= 0 ? null : (
    <>
      {[-1.2, -0.3, 0.6, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 2.5, -1 - i * 0.3]} rotation={[0, 0, 0.15 - i * 0.08]}>
          <planeGeometry args={[0.35, 6]} />
          <meshBasicMaterial color="#cfeaff" transparent opacity={0.12 * amount} blending={THREE.AdditiveBlending} depthWrite={false}
            side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );

type Shot = { cam: { pos: V3; look: V3; fov?: number }; light?: number; dim?: number; night?: boolean; body: React.ReactNode; overlay?: React.ReactNode };

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const u = s / D;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const bob = Math.sin(t * 1.1) * 0.04;
  const fish = (props: { eyeGlow?: number; swim?: number } = {}) => (
    <group position={[0, bob, 0]}>
      <Owlfish t={t} {...props} />
    </group>
  );

  switch (scene.visual) {
    case "hook": {
      // face to face, quick push-in on the huge eyes
      const k = pop(s, 0, 0.8);
      return {
        cam: { pos: [lerp(1.6, 1.1, k), 0.2, lerp(3.4, 2.6, k) - u * 0.15], look: [0, 0.05, 0.4] },
        body: fish({ eyeGlow: 0.4, swim: 0.3 }),
      };
    }
    case "name": {
      return {
        cam: { pos: [2.2, 0.5, 3.8 - u * 0.3], look: [0, 0, 0.1] },
        body: fish(),
        overlay: <Pop t={t} at={w(1, 3)} size={120}>OWLFISH</Pop>,
      };
    }
    case "size": {
      return {
        cam: { pos: [5.4, 0.3, 0.4], look: [0, 0, 0] },
        body: fish(),
        overlay: (
          <>
            <Pop t={t} at={w(2, 6)} size={130} color="#ffd34d">~16 CM</Pop>
            {t >= w(2, 6) && (
              <AbsoluteFill style={{ alignItems: "center", top: 470 }}>
                <div style={{ width: lerp(0, 640, clamp01((t - w(2, 6)) / 0.4)), height: 14, background: "#ffd34d",
                  border: "4px solid #060a18", borderRadius: 4 }} />
              </AbsoluteFill>
            )}
          </>
        ),
      };
    }
    case "depth": {
      // camera sinks with the fish while a depth counter runs
      const m = Math.round(glide(s, 0, D * 0.85, 0, 1200) / 10) * 10;
      return {
        light: lerp(1.3, 0.8, u),
        dim: lerp(0, 0.5, u),
        cam: { pos: [2.6, 0.9, 4.4], look: [0, 0.1, 0] },
        body: (
          <>
            {fish()}
            <Sunbeams amount={1 - u} />
          </>
        ),
        overlay: (
          <Pop t={t} at={S + 0.1} size={120} color="#9fdcff">
            {m.toLocaleString("en-US")} M
          </Pop>
        ),
      };
    }
    case "dark": {
      // the last sunbeams fade out to near-black
      const fade = glide(s, 0, D * 0.8, 1, 0);
      return {
        light: lerp(0.15, 0.7, fade),
        dim: lerp(0.95, 0.5, fade),
        cam: { pos: [2.6, 0.7, 4.4], look: [0, 0.2, 0] },
        body: (
          <>
            {fish()}
            <Sunbeams amount={fade * 0.8} />
          </>
        ),
      };
    }
    case "eyes": {
      // close on one eye: specks of light stream into it and it lights up
      const r = rng(3);
      return {
        light: 0.5,
        dim: 0.8,
        cam: { pos: [1.5, 0.25, 1.9], look: [0.15, 0.05, 0.5] },
        body: (
          <>
            {fish({ eyeGlow: glide(s, 0.2, D * 0.8, 0.1, 1), swim: 0.2 })}
            {Array.from({ length: 16 }, (_, i) => {
              const ph = (t * 0.7 + r()) % 1;
              const from = new THREE.Vector3((r() - 0.3) * 2.5, (r() - 0.5) * 2, 1 + r() * 1.5);
              const p = from.lerp(new THREE.Vector3(0.22, 0.06, 0.6), ph);
              return (
                <mesh key={i} position={p.toArray()} scale={0.015 * (1 - ph * 0.5)}>
                  <icosahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial color="#cfeaff" />
                </mesh>
              );
            })}
          </>
        ),
        overlay: <Pop t={t} at={w(5, 3)} size={110} color="#9fdcff">HUGE EYES</Pop>,
      };
    }
    case "owl": {
      // night sky: an owl on a branch, same big-eyed idea
      return {
        night: true,
        light: 0.9,
        cam: { pos: [0.7, 0.6, 4.6 - u * 0.3], look: [0, 0.3, 0] },
        body: (
          <>
            <Owl t={t} />
            <mesh position={[0, -0.55, 0]} rotation={[0, 0, 0.08]}>
              <cylinderGeometry args={[0.07, 0.09, 2.6, 5]} />
              <meshStandardMaterial color="#4a3426" flatShading />
            </mesh>
            <mesh position={[-1.1, 1.9, -3]} scale={0.45}>
              <icosahedronGeometry args={[1, 1]} />
              <meshBasicMaterial color="#f4f0d8" />
            </mesh>
          </>
        ),
        overlay: <Pop t={t} at={w(6, 2)} size={110} color="#ffc93c">LIKE AN OWL</Pop>,
      };
    }
    case "glimmer": {
      return {
        light: 0.35,
        dim: 0.9,
        cam: { pos: [2.6, 0.6, 4.2], look: [0, 0, 0] },
        body: (
          <>
            <group rotation={[0, lerp(0, 0.6, glide(s, 0, D, 0, 1)), 0]}>{fish({ eyeGlow: 0.6 })}</group>
            <Glimmers t={t} />
          </>
        ),
      };
    }
    case "food": {
      // a tiny shrimp and a small jelly drift in front of it
      const k = glide(s, 0, D, 0, 1);
      return {
        light: 0.6,
        dim: 0.7,
        cam: { pos: [2.3, 0.5, 3.8], look: [0, 0.1, 0.8] },
        body: (
          <>
            <group position={[0, 0, lerp(-0.4, 0.1, k)]}>{fish({ eyeGlow: 0.6 })}</group>
            <group position={[0.35, 0.15, 1.5]} rotation={[0, -Math.PI / 2, 0]} scale={0.35}>
              <Shrimp t={t} />
            </group>
            <group position={[-0.4, 0.45, 1.3]} scale={0.25}>
              <Jellyfish t={t} color="#c9a8ff" />
            </group>
            <Glimmers t={t} n={10} spread={2.5} />
          </>
        ),
      };
    }
    case "rov": {
      return {
        light: 0.8,
        dim: 0.7,
        cam: { pos: [3.2, 0.7, 5.2], look: [0.3, 0.45, 0] },
        body: (
          <>
            {fish({ eyeGlow: 0.8 })}
            <group position={[0.75, 0.95, -0.9]} rotation={[0.25, -0.7, 0]} scale={0.5}>
              <Rov t={t} lights={1} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(9, 8)} size={130} color="#ffd34d">1,200 M</Pop>,
      };
    }
    case "name2": {
      return {
        light: 0.8,
        dim: 0.6,
        cam: { pos: [2.4, 0.5, 4.0 - u * 0.4], look: [0, 0, 0.1] },
        body: fish({ eyeGlow: 0.5 }),
        overlay: (
          <>
            <Pop t={t} at={S + 0.1} size={66}>
              <span style={{ color: "#ff6b7a" }}>PSEUDO</span>BATHYLAGUS
            </Pop>
            <Pop t={t} at={w(10, 6)} top={410} size={84} color="#ff6b7a">PSEUDO = FALSE</Pop>
          </>
        ),
      };
    }
    default: {
      return {
        light: 0.6,
        dim: 0.6,
        cam: { pos: [0.6, 0.6, 5.2 - u * 0.4], look: [0, 0.5, 0] },
        body: <group position={[0, -0.3, 0]} rotation={[0, 0.7, 0]}>{fish({ eyeGlow: 0.7 })}</group>,
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

export const OwlfishShort: React.FC<ShortProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!timeline) return null;
  const t = frame / fps;
  const shot = shotAt(timeline, t);
  const last = timeline.words[timeline.words.length - 1];
  const blackAt = Math.min(timeline.total - 0.1, last.t + last.d + 0.25);
  return (
    <AbsoluteFill>
      {shot.night ? (
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, #1a1440 0%, #2c2a6a 60%, #0d0b22 100%)" }} />
      ) : (
        <DeepSeaBackdrop dim={shot.dim ?? 0.3} />
      )}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, near: 0.05, far: 60 }}>
        <CameraRig {...shot.cam} />
        <DeepSeaLights light={shot.light ?? 1} />
        {!shot.night && <MarineSnow t={t} count={50} />}
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
