// "This Animal Is Named After Medusa" — low-poly basket star short. Scenes follow shorts/en/basket-star-medusa.yaml.
// Facts: Monterey Bay Aquarium + Gorgonocephalus literature, see the package sources.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "../lib/montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { Captions } from "../lib/Captions";
import { clamp01, facet, glide, lerp, pop, rng, taperedTube } from "../lib/lowpoly";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { BasketStar, Copepod, HookedBranch } from "../models/BasketStar";

const { fontFamily } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

type V3 = [number, number, number];
const KEYWORDS = ["monster", "snakes", "basket", "Gorgon's", "Medusa", "branches", "current", "net", "hooks", "claws", "knot",
  "mouth", "meter", "BioNiche"];
const TILT = 0.55; // the whole animal leans so its net faces the current coming from +z

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

// small faceted rock the basket star perches on, plus a patch of seafloor
const Perch: React.FC = () => {
  const rock = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    g.scale(0.7, 0.9, 0.7);
    return facet(g, 0.15, 13);
  }, []);
  return (
    <>
      <mesh geometry={rock} position={[0, -0.9, 0]}>
        <meshStandardMaterial color="#4a4f5c" flatShading roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0]}>
        <circleGeometry args={[8, 12]} />
        <meshStandardMaterial color="#30384a" flatShading />
      </mesh>
    </>
  );
};

export const Star: React.FC<{ t: number; open?: number; writhe?: number; grow?: number; roll?: number }> = (p) => (
  <>
    <Perch />
    <group rotation={[TILT, 0, 0]}>
      <BasketStar {...p} />
    </group>
  </>
);

// current: faint streaks flowing from +z through the net
const Current: React.FC<{ t: number; amount: number }> = ({ t, amount }) => {
  const r = rng(4);
  const lines = Array.from({ length: 22 }, () => ({ x: (r() - 0.5) * 3.2, y: (r() - 0.5) * 2.4 + 0.6, ph: r() }));
  if (amount <= 0) return null;
  return (
    <>
      {lines.map((l, i) => {
        const z = 4 - ((t * 1.4 + l.ph * 8) % 8);
        return (
          <mesh key={i} position={[l.x, l.y, z]}>
            <boxGeometry args={[0.012, 0.012, 0.6]} />
            <meshBasicMaterial color="#9fdcff" transparent opacity={0.35 * amount} />
          </mesh>
        );
      })}
    </>
  );
};

// knot: thin branch tips curling around a copepod
const KnotTips: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const tips = useMemo(() => [0, 1, 2, 3], []);
  const geos = tips.map((i) => {
    const a = (i / 4) * Math.PI * 2;
    const pts = Array.from({ length: 6 }, (_, j) => {
      const u = j / 5;
      // straight up from below at k=0, wrapping around the prey at the origin at k=1
      const ang = a + u * Math.PI * 1.6 * k;
      const rad = lerp(0.7 - u * 0.2, 0.32, u * k);
      return new THREE.Vector3(Math.cos(ang) * rad * (0.4 + 0.6 * k), lerp(-1.6 + u * 1.6, -0.4 + u * 0.6, k), Math.sin(ang) * rad * (0.4 + 0.6 * k));
    });
    return taperedTube(pts, 0.07, 0.03, 16, 5);
  });
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  return (
    <>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={i % 2 ? "#e09a5c" : "#f2c08a"} flatShading />
        </mesh>
      ))}
      <group rotation={[0, t * 0.3, 0]}>
        <Copepod t={t} kick={1 - k} />
      </group>
    </>
  );
};

type Shot = { cam: { pos: V3; look: V3; fov?: number }; light?: number; body: React.ReactNode; overlay?: React.ReactNode };

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const u = s / D;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);

  switch (scene.visual) {
    case "hook": {
      // coiled arms writhing like snakes, slow orbit close above
      const a = 0.4 + u * 0.6;
      return {
        light: 0.8,
        cam: { pos: [Math.sin(a) * 2.6, 2.3 - u * 0.3, Math.cos(a) * 2.6], look: [0, 0.2, 0] },
        body: <Star t={t} open={0.35} writhe={1.2} />,
      };
    }
    case "name": {
      return {
        light: 1,
        cam: { pos: [0.6, 1.2, lerp(4.2, 3.7, u)], look: [0, 0.3, 0] },
        body: <Star t={t} open={lerp(0.35, 0.65, u)} writhe={0.8} />,
        overlay: (
          <>
            <Pop t={t} at={S + 0.1} size={100}>BASKET STAR</Pop>
            <Pop t={t} at={w(2, 4)} top={430} size={70} color="#ffd34d">"GORGON'S HEAD"</Pop>
          </>
        ),
      };
    }
    case "branch": {
      // the arms fork level by level while the camera looks down on one arm
      return {
        light: 1,
        cam: { pos: [0.4, 2.6, 2.0], look: [0, 0.4, 0.6] },
        body: <Star t={t} open={0.8} writhe={0.25} grow={glide(s, 0, D * 0.9, 0.1, 1)} />,
      };
    }
    case "open": {
      // the net opens into the current
      const open = glide(s, 0, D * 0.6, 0.3, 1);
      return {
        light: 1,
        cam: { pos: [1.2, 1.4, lerp(4.6, 4.0, u)], look: [0, 0.5, 0] },
        body: (
          <>
            <Star t={t} open={open} writhe={0.25} />
            <Current t={t} amount={glide(s, 0, 1, 0, 1)} />
          </>
        ),
        overlay: <Pop t={t} at={w(5, 3)} size={110} color="#9fdcff">NET</Pop>,
      };
    }
    case "drift": {
      // copepods drift with the current into the net
      const r = rng(11);
      return {
        light: 1,
        cam: { pos: [0.3, 1.0, 4.4], look: [0, 0.6, 0] },
        body: (
          <>
            <Star t={t} open={1} writhe={0.2} />
            <Current t={t} amount={1} />
            {Array.from({ length: 8 }, (_, i) => {
              const z = lerp(3.2, 0.6, clamp01(u * 1.3 - r() * 0.3));
              return (
                <group key={i} position={[(r() - 0.5) * 1.8, 0.4 + r() * 1.2, z]} rotation={[0, Math.PI, 0]} scale={0.22}>
                  <Copepod t={t + i} />
                </group>
              );
            })}
          </>
        ),
      };
    }
    case "hooks": {
      // macro: a branch covered in hooks; a copepod drifts in and the hooks clamp on it like claws
      const tGrab = w(8, 1);
      const cz = lerp(1.4, 0.42, glide(t, S + 0.2, tGrab, 0, 1));
      const grip = glide(t, tGrab, tGrab + 0.35, 0, 1);
      return {
        light: 1.1,
        cam: { pos: [0.7, 0.6, 2.8], look: [0, 0.1, 0] },
        body: (
          <>
            <HookedBranch t={t} grip={grip} />
            <group position={[0.2, 0.15, cz]} rotation={[0, Math.PI + 0.4, 0]} scale={0.7}>
              <Copepod t={t} kick={1 - grip} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(7, 5)} size={84} color="#ffd34d">MICROSCOPIC HOOKS</Pop>,
      };
    }
    case "knot": {
      return {
        light: 1.1,
        cam: { pos: [0.9, 0.3, 2.2], look: [0, -0.3, 0] },
        body: <KnotTips t={t} k={glide(s, 0.1, D * 0.75, 0, 1)} />,
      };
    }
    case "mouth": {
      // one arm rolls inward and carries the food (glowing dot) to the mouth
      const roll = glide(s, 0, D * 0.8, 0, 1);
      return {
        light: 1,
        cam: { pos: [1.4, 1.6, 2.6], look: [0, 0.3, 0.2] },
        body: (
          <>
            <Star t={t} open={1} writhe={0.15} roll={roll} />
            <mesh position={[0, lerp(1.0, 0.1, roll), lerp(1.3, 0.1, roll)]} scale={0.06}>
              <icosahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#9fdcff" />
            </mesh>
          </>
        ),
        overlay: <Pop t={t} at={w(10, 6)} size={96}>→ MOUTH</Pop>,
      };
    }
    case "size": {
      // wide: the fully open net, with a 60 cm bar
      return {
        light: 1,
        cam: { pos: [0, 1.6, lerp(6.4, 6.0, u)], look: [0, 0.4, 0] },
        body: <Star t={t} open={1} writhe={0.3} />,
        overlay: (
          <>
            <Pop t={t} at={w(11, 5)} size={130} color="#ffd34d">60+ CM</Pop>
            {t >= w(11, 5) && (
              <AbsoluteFill style={{ alignItems: "center", top: 470 }}>
                <div style={{ width: lerp(0, 760, clamp01((t - w(11, 5)) / 0.4)), height: 14, background: "#ffd34d",
                  border: "4px solid #060a18", borderRadius: 4 }} />
              </AbsoluteFill>
            )}
          </>
        ),
      };
    }
    case "medusa": {
      const a = -0.5 + u * 0.8;
      return {
        light: 0.85,
        cam: { pos: [Math.sin(a) * 3.4, 1.6, Math.cos(a) * 3.4], look: [0, 0.4, 0] },
        body: <Star t={t} open={0.6} writhe={1.3} />,
        overlay: <Pop t={t} at={w(12, 5)} size={150} color="#9cf07a">MEDUSA</Pop>,
      };
    }
    default: {
      return {
        light: 0.7,
        cam: { pos: [0, 1.2, 6.2 - u * 0.4], look: [0, 0.8, 0] },
        body: (
          <group position={[0, -0.8, -1]} scale={0.8}>
            <Star t={t} open={1} writhe={0.3} />
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

export const BasketShort: React.FC<ShortProps> = ({ timeline }) => {
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
