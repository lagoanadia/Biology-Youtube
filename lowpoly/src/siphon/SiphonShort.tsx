// "This Christmas Tree Swims and Stings" — low-poly Christmas tree siphonophore short. Scenes follow
// shorts/en/christmas-tree-siphonophore.yaml. Facts: Monterey Bay Aquarium + MBARI, see the package sources.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { Captions } from "../lib/Captions";
import { clamp01, glide, lerp, pop, rng } from "../lib/lowpoly";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Shrimp } from "../models/Critters";
import { Rov } from "../models/Rov";
import { Siphonophore } from "../models/Siphonophore";

const { fontFamily } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

type V3 = [number, number, number];
const KEYWORDS = ["Christmas", "tree", "siphonophore", "meters", "float", "bells", "twirls", "decorations", "stinging", "stunned",
  "swallow", "delicate", "robot", "touch", "BioNiche"];

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

// tiny fish (prey)
const SmallFish: React.FC<{ t: number; stunned?: number }> = ({ t, stunned = 0 }) => (
  <group rotation={[0, 0, stunned * 2.6]}>
    <mesh scale={[0.05, 0.06, 0.15]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#c9d6e0" emissive="#5d7486" emissiveIntensity={0.3} flatShading />
    </mesh>
    <mesh position={[0, 0, -0.17]} rotation={[0, Math.sin(t * 14) * 0.5 * (1 - stunned), 0]} scale={[0.01, 0.06, 0.05]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#c9d6e0" flatShading />
    </mesh>
  </group>
);

type Shot = { cam: { pos: V3; look: V3; fov?: number }; light?: number; body: React.ReactNode; overlay?: React.ReactNode };

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const u = s / D;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const spin = t * 0.35;
  const bob = Math.sin(t * 0.9) * 0.06;

  switch (scene.visual) {
    case "hook": {
      const a = 0.3 + u * 0.5;
      return {
        cam: { pos: [Math.sin(a) * 5.4, 0.3, Math.cos(a) * 5.4], look: [0, -0.1, 0] },
        body: <group position={[0, bob, 0]}><Siphonophore t={t} spin={spin} sting={0.3} /></group>,
      };
    }
    case "name": {
      return {
        cam: { pos: [0.6, 0.2, lerp(5.4, 5.0, u)], look: [0, -0.1, 0] },
        body: <group position={[0, bob, 0]}><Siphonophore t={t} spin={spin} /></group>,
        overlay: <Pop t={t} at={w(1, 4)} size={92}>SIPHONOPHORE</Pop>,
      };
    }
    case "size": {
      return {
        cam: { pos: [0.3, 0.0, 6.0], look: [-0.2, -0.15, 0] },
        body: <group position={[0, bob, 0]}><Siphonophore t={t} spin={spin} /></group>,
        overlay: (
          <>
            <Pop t={t} at={w(2, 5)} size={140} color="#ffd34d">3 M</Pop>
            {t >= w(2, 5) && (
              <AbsoluteFill style={{ left: 150, top: 470 }}>
                <div style={{ width: 16, height: lerp(0, 700, clamp01((t - w(2, 5)) / 0.4)), background: "#ffd34d",
                  border: "4px solid #060a18", borderRadius: 4 }} />
              </AbsoluteFill>
            )}
          </>
        ),
      };
    }
    case "float": {
      return {
        cam: { pos: [0.8, 1.4, 1.5 - u * 0.1], look: [0, 1.1, 0] },
        body: <Siphonophore t={t} spin={spin} />,
        overlay: <Pop t={t} at={w(3, 6)} size={100} color="#ffcf5a">GAS FLOAT</Pop>,
      };
    }
    case "bells": {
      // bells contract in waves; little water jets squirt out
      const r = rng(5);
      return {
        cam: { pos: [1.6, 0.7, 2.2], look: [0, 0.45, 0] },
        body: (
          <>
            <Siphonophore t={t} spin={spin} pulse={1.6} />
            {Array.from({ length: 14 }, (_, i) => {
              const ph = (t * 1.2 + r()) % 1;
              const a = r() * Math.PI * 2;
              const y = 0.2 + r() * 0.8;
              const rad = 0.15 + (1.1 - y) * 0.35 + ph * 0.5;
              return (
                <mesh key={i} position={[Math.cos(a) * rad, y - ph * 0.3, Math.sin(a) * rad]} scale={0.012}>
                  <tetrahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial color="#9fdcff" transparent opacity={1 - ph} />
                </mesh>
              );
            })}
          </>
        ),
        overlay: <Pop t={t} at={w(4, 3)} size={92} color="#9fdcff">SWIMMING BELLS</Pop>,
      };
    }
    case "twirl": {
      return {
        cam: { pos: [3.2, 0.2, 5.0], look: [lerp(-0.4, 0.4, u), -0.1, 0] },
        body: (
          <group position={[lerp(-0.6, 0.6, u), bob + u * 0.3, 0]} rotation={[0, 0, Math.sin(t * 1.2) * 0.12]}>
            <Siphonophore t={t} spin={t * 1.6} />
          </group>
        ),
      };
    }
    case "decor": {
      return {
        cam: { pos: [1.7, -0.5, 2.5], look: [0.1, -0.8, 0] },
        body: <Siphonophore t={t} spin={spin * 0.5} sting={0.15} />,
      };
    }
    case "sting": {
      return {
        cam: { pos: [1.4, -0.8, 1.8 - u * 0.15], look: [0.2, -0.95, 0] },
        body: <Siphonophore t={t} spin={0.2} sting={glide(s, 0, 0.6, 0, 1)} />,
        overlay: <Pop t={t} at={w(7, 4)} size={92} color="#ff6b7a">STINGING CELLS</Pop>,
      };
    }
    case "prey": {
      // a shrimp and a tiny fish bump into the "ornaments": flash, then they go limp
      const hit = w(8, 6);
      const k = glide(t, S, hit, 0, 1);
      const stun = glide(t, hit, hit + 0.4, 0, 1);
      return {
        cam: { pos: [1.9, -0.6, 2.8], look: [0.2, -0.9, 0] },
        body: (
          <>
            <Siphonophore t={t} spin={0.2} sting={0.4 + stun * 0.6} />
            <group position={[lerp(1.6, 0.55, k), -0.9 - stun * 0.1, lerp(0.6, 0.15, k)]} rotation={[0, -Math.PI / 2, stun * 2]} scale={0.6}>
              <Shrimp t={t * (1 - stun)} swim={1 - stun} />
            </group>
            <group position={[lerp(-1.4, -0.45, k), -1.15, lerp(0.5, 0.2, k)]} rotation={[0, Math.PI / 2, 0]}>
              <SmallFish t={t} stunned={stun} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={hit} size={120} color="#ffd34d">ZAP!</Pop>,
      };
    }
    case "eat": {
      // the prey is pulled up to a feeding polyp and disappears inside
      const k = glide(s, 0.1, D * 0.8, 0, 1);
      return {
        cam: { pos: [1.5, -0.5, 2.2], look: [0.15, -0.75, 0] },
        body: (
          <>
            <Siphonophore t={t} spin={0.2} sting={0.3} feed={glide(s, D * 0.6, D, 0, 1)} />
            <group position={[lerp(0.55, 0.1, k), lerp(-1.0, -0.5, k), lerp(0.15, 0.05, k)]} rotation={[0, -Math.PI / 2, 2]} scale={0.6 * (1 - k * 0.9)}>
              <Shrimp t={0} swim={0} />
            </group>
          </>
        ),
      };
    }
    case "fragile": {
      // a gentle bump and the colony falls apart into pieces
      const tTouch = w(10, 5);
      const broken = glide(t, tTouch - 0.2, tTouch + 1.2, 0, 0.9);
      return {
        cam: { pos: [0.4, 0.0, 5.6], look: [0, -0.1, 0] },
        body: <Siphonophore t={t} spin={spin} broken={broken} />,
        overlay: <Pop t={t} at={w(10, 3)} size={110} color="#ff6b7a">FRAGILE</Pop>,
      };
    }
    case "rov": {
      // an ROV hovers at a distance, lights on, filming without touching
      return {
        cam: { pos: [2.6, 0.5, 6.0], look: [0.6, 0.0, 0] },
        body: (
          <>
            <group position={[0, bob, 0]}><Siphonophore t={t} spin={spin} /></group>
            <group position={[1.35, 0.85, 0.4]} rotation={[0, -1.35, 0]} scale={0.5}>
              <Rov t={t} lights={1} />
            </group>
          </>
        ),
      };
    }
    case "final": {
      const a = -0.4 + u * 0.6;
      return {
        cam: { pos: [Math.sin(a) * 5.0, 0.2, Math.cos(a) * 5.0], look: [0, -0.1, 0] },
        body: <group position={[0, bob, 0]}><Siphonophore t={t} spin={spin} sting={0.7} /></group>,
        overlay: <Pop t={t} at={w(12, 5)} size={110} color="#ff6b7a">DON'T TOUCH</Pop>,
      };
    }
    default: {
      return {
        light: 0.8,
        cam: { pos: [0, 0.6, 5.4 - u * 0.4], look: [0, 0.9, 0] },
        body: <group position={[0, -0.4 + bob, -1]}><Siphonophore t={t} spin={spin} sting={0.5} /></group>,
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

export const SiphonShort: React.FC<ShortProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!timeline) return null;
  const t = frame / fps;
  const shot = shotAt(timeline, t);
  const last = timeline.words[timeline.words.length - 1];
  const blackAt = Math.min(timeline.total - 0.1, last.t + last.d + 0.25);
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop dim={0.35} />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, near: 0.05, far: 60 }}>
        <CameraRig {...shot.cam} />
        <DeepSeaLights light={shot.light ?? 1} />
        <MarineSnow t={t} count={60} />
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
