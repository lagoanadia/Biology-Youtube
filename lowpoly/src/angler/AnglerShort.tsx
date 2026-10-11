// "This Fish Fuses With Its Mate Forever" — low-poly short. Scenes follow shorts/en/anglerfish-fusion.yaml.
// Facts: Swann et al. 2020 (Science) + UW News, see the package sources.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { Captions } from "../lib/Captions";
import { clamp01, glide, lerp, pop, rng } from "../lib/lowpoly";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { FemaleAngler, ImmuneCell, MaleAngler } from "../models/Angler";

const { fontFamily } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

type V3 = [number, number, number];
const KEYWORDS = ["partner", "anglerfish", "female", "glowing", "dark", "tiny", "sixty", "nostrils", "scent", "never", "fuse",
  "blood", "food", "immune", "BioNiche"];
// where the male latches onto her belly (female local space) and how he is turned (nose into her skin)
export const ATTACH: V3 = [0.32, -0.86, 0.3];
export const ATTACH_ROT: V3 = [-Math.PI / 2 + 0.5, 0, 0.3];

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

// Pulsing blood vessels between her and the attached male (stylized glowing red lines, no gore).
const Vessels: React.FC<{ t: number; amount: number }> = ({ t, amount }) => {
  if (amount <= 0) return null;
  return (
    <group position={ATTACH}>
      {[-0.06, 0, 0.06].map((x, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 6 - i);
        return (
          <mesh key={i} position={[x, 0.1, -0.05]} rotation={[0.6, 0, x * 3]} scale={[1, amount, 1]}>
            <cylinderGeometry args={[0.018, 0.018, 0.5, 4]} />
            <meshBasicMaterial color={new THREE.Color("#ff3b4a").multiplyScalar(0.6 + 0.6 * pulse)} transparent opacity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
};

type Shot = { cam: { pos: V3; look: V3; fov?: number }; light?: number; dim?: number; body: React.ReactNode; overlay?: React.ReactNode };

const Pair: React.FC<{ t: number; fused?: number; vessels?: number }> = ({ t, fused = 1, vessels = 0 }) => (
  <group rotation={[0, Math.sin(t * 0.4) * 0.15, 0]}>
    <FemaleAngler t={t} />
    <group position={ATTACH} rotation={ATTACH_ROT} scale={0.55}>
      <MaleAngler t={t} fused={fused} swim={0} />
    </group>
    <Vessels t={t} amount={vessels} />
  </group>
);

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const u = s / D;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);

  switch (scene.visual) {
    case "hook": {
      // teaser: the tiny male swims in and latches on, on "never lets go"
      const k = glide(t, S, w(0, 6), 0, 1);
      const male: V3 = [lerp(-2.6, ATTACH[0], k), lerp(-1.6, ATTACH[1], k), lerp(1.2, ATTACH[2], k)];
      return {
        light: 0.9,
        cam: { pos: [2.2, 0.3, 7.0 - u * 0.6], look: [0, 0.0, 0.2] },
        body: (
          <>
            <FemaleAngler t={t} />
            <group position={male} rotation={[lerp(0, ATTACH_ROT[0], k), lerp(1.2, 0, k), lerp(0, ATTACH_ROT[2], k)]} scale={0.55}>
              <MaleAngler t={t} swim={1 - k} />
            </group>
          </>
        ),
      };
    }
    case "female": {
      // close on her face, then up to the glowing lure on "glowing lure"
      const toLure = glide(t, w(2, 5) - 0.3, w(2, 5) + 0.6, 0, 1);
      return {
        light: 0.9,
        cam: { pos: [lerp(2.0, 1.4, u), lerp(0.3, 1.1, toLure), lerp(5.6, 4.6, u)], look: [0, lerp(0.1, 0.9, toLure), lerp(0.4, 1.2, toLure)] },
        body: <FemaleAngler t={t} mouth={0.6} />,
        overlay: (
          <>
            <Pop t={t} at={S + 0.1} size={96}>ANGLERFISH</Pop>
            <Pop t={t} at={w(2, 3)} top={420} size={64} color="#ff9ad5">♀ FEMALE</Pop>
          </>
        ),
      };
    }
    case "dark": {
      // huge darkness: her lure is a tiny dot far away, the male is a speck on the other side
      return {
        light: 0.35,
        dim: 0.85,
        cam: { pos: [0, 0, 12 - u * 1.0], look: [0, 0, 0] },
        body: (
          <>
            <group position={[-1.0, 2.2, 0]} scale={0.6} rotation={[0, 0.6, 0]}>
              <FemaleAngler t={t} halo={4} />
            </group>
            <group position={[1.0, -2.4, 3]} rotation={[0, -0.8, 0]} scale={0.45}>
              <MaleAngler t={t} />
            </group>
          </>
        ),
      };
    }
    case "size": {
      // he swims beside her: a speck next to a giant; "60× LONGER" on "sixty"
      return {
        light: 1,
        cam: { pos: [0.8, 0.1, 5.6 - u * 0.4], look: [0.5, -0.2, 0.3] },
        body: (
          <>
            <FemaleAngler t={t} />
            <group position={[0.75, -1.05, 1.4]} rotation={[0, -1.2, 0]} scale={0.35}>
              <MaleAngler t={t} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(5, 3)} size={150} color="#ffd34d">60× LONGER</Pop>,
      };
    }
    case "scent": {
      // close on the male: huge nostrils, following a drifting scent trail
      const r = rng(5);
      const trail = Array.from({ length: 26 }, (_, i) => {
        const p = ((i / 26 + t * 0.25) % 1);
        return { p, y: Math.sin(p * 6 + i) * 0.12 + (r() - 0.5) * 0.15, x: (r() - 0.5) * 0.25 };
      });
      return {
        light: 1,
        cam: { pos: [1.1, 0.3, 1.8], look: [0, 0, 0.5] },
        body: (
          <>
            <group position={[0, 0, 0]} rotation={[0, 0, Math.sin(t * 2) * 0.05]}>
              <MaleAngler t={t} />
            </group>
            {trail.map((p, i) => (
              <mesh key={i} position={[p.x, p.y, 0.6 + p.p * 4]} scale={0.03 * (1 - p.p * 0.5)}>
                <tetrahedronGeometry args={[1, 0]} />
                <meshBasicMaterial color="#ff9ad5" transparent opacity={0.7 * (1 - p.p)} />
              </mesh>
            ))}
          </>
        ),
        overlay: <Pop t={t} at={w(6, 2)} size={88} color="#ff9ad5">HUGE NOSTRILS</Pop>,
      };
    }
    case "bite": {
      // he reaches her belly and bites on (on "on"); "never lets go": a little shake, he stays
      const tBite = w(7, 6);
      const k = glide(t, S, tBite, 0, 1);
      const shake = t > w(8, 2) ? Math.sin(t * 40) * 0.015 * Math.max(0, 1 - (t - w(8, 2)) * 1.5) : 0;
      const male: V3 = [lerp(1.4, ATTACH[0], k) + shake, lerp(-1.6, ATTACH[1], k), lerp(1.4, ATTACH[2], k)];
      return {
        light: 1,
        cam: { pos: [3.0, -2.3, 3.9], look: [0.4, -0.85, 0.4] },
        body: (
          <>
            <FemaleAngler t={t} />
            <group position={male} rotation={[lerp(0, ATTACH_ROT[0], k), lerp(-1.6, 0, k), lerp(0, ATTACH_ROT[2], k)]} scale={0.55}>
              <MaleAngler t={t} swim={1 - k} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(8, 2)} size={120} color="#ff6b7a">FOREVER</Pop>,
      };
    }
    case "fuse": {
      // their bodies merge and pulsing vessels connect them; he takes all his food from her blood
      const fused = glide(s, 0, D * 0.55, 0, 1);
      return {
        light: 1,
        cam: { pos: [2.3, -2.1, 2.9 - u * 0.2], look: [0.35, -0.95, 0.35] },
        body: <Pair t={t} fused={fused} vessels={glide(s, D * 0.2, D * 0.6, 0, 1)} />,
      };
    }
    case "immune": {
      // a body normally attacks foreign tissue: immune cells rush at an orange block and swarm it
      const k = glide(s, 0.2, D * 0.8, 0, 1);
      const r = rng(9);
      return {
        light: 0.8,
        cam: { pos: [0, 0.3, 4.4], look: [0, 0, 0] },
        body: (
          <>
            <mesh rotation={[0.3, t * 0.5, 0]} position={[Math.sin(t * 30) * 0.02 * k, 0, 0]} scale={0.45}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#ff9a3c" emissive="#ff9a3c" emissiveIntensity={0.25} flatShading />
            </mesh>
            {Array.from({ length: 9 }, (_, i) => {
              const a = (i / 9) * Math.PI * 2;
              const far = 2 + r();
              const d = lerp(far, 0.62, k);
              return (
                <group key={i} position={[Math.cos(a) * d, Math.sin(a) * d * 1.3, Math.sin(a * 2) * 0.3]}>
                  <ImmuneCell t={t} seed={i + 1} />
                </group>
              );
            })}
          </>
        ),
        overlay: <Pop t={t} at={S + 0.2} size={84} color="#ffb36b">FOREIGN TISSUE</Pop>,
      };
    }
    case "lost": {
      // in anglerfish, the immune cells go dim and drift: nothing attacks the fused male
      const dim = glide(s, D * 0.25, D * 0.7, 0, 1);
      const r = rng(9);
      return {
        light: 1,
        cam: { pos: [2.2, -0.6, 5.0], look: [0.2, -0.4, 0] },
        body: (
          <>
            <Pair t={t} vessels={1} />
            {Array.from({ length: 7 }, (_, i) => (
              <group key={i} position={[ATTACH[0] + (r() - 0.5) * 2.4, ATTACH[1] + (r() - 0.5) * 1.6 - dim * 0.4, ATTACH[2] + 0.6 + r() * 0.6]} scale={0.6}>
                <ImmuneCell t={t} seed={i + 3} dim={dim} />
              </group>
            ))}
          </>
        ),
        overlay: <Pop t={t} at={w(12, 5)} size={84} color="#9fe9ff">IMMUNE GENES: LOST</Pop>,
      };
    }
    case "together": {
      const orbit = lerp(0.9, 0.2, u);
      return {
        light: 0.9,
        cam: { pos: [Math.sin(orbit) * 5.8, 0.1, Math.cos(orbit) * 5.8], look: [0, 0, 0] },
        body: <Pair t={t} vessels={1} />,
      };
    }
    default: {
      return {
        light: 0.3,
        dim: 0.4,
        cam: { pos: [0, 0.3, 6.5 - u * 0.4], look: [0, 0.6, 0] },
        body: (
          <group position={[0, -0.6 + s * 0.15, -1]} scale={0.8}>
            <Pair t={t} vessels={1} />
          </group>
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

export const AnglerShort: React.FC<ShortProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!timeline) return null;
  const t = frame / fps;
  const shot = shotAt(timeline, t);
  const last = timeline.words[timeline.words.length - 1];
  const blackAt = Math.min(timeline.total - 0.1, last.t + last.d + 0.25);
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop dim={shot.dim ?? 0.3} />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, near: 0.05, far: 60 }}>
        <CameraRig {...shot.cam} />
        <DeepSeaLights light={shot.light ?? 0.9} rim={1} />
        <MarineSnow t={t} count={50} />
        {shot.body}
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,0.65) 100%)" }} />
      {shot.overlay}
      <Captions tl={timeline} keywords={KEYWORDS} hideAfter={blackAt} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: dipAt(timeline, t) }} />
      {t >= blackAt && <AbsoluteFill style={{ backgroundColor: "#000" }} />}
    </AbsoluteFill>
  );
};
