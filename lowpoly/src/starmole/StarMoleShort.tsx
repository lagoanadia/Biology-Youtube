// "This Mole Eats Faster Than Any Other Mammal" — star-nosed mole (Condylura cristata) low-poly short with the
// 2026-10-18 analytics rules (hook card at frame 0, name label, loop ending, on-screen CTA). Scenes follow
// shorts/en/star-nosed-mole-fastest.yaml. Facts: Catania 2026 (Brain Behav Evol), Animal Diversity Web,
// Catania 2006 (Nature) — see the package sources.
import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { GodRays, RiverBackdrop, Riverbed, RiverLights, Silt, Surface } from "../env/River";
import { clamp01, facet, glide, lerp, rng } from "../lib/lowpoly";
import { Pop, Shot, ShortShell } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { StarMole, Worm } from "../models/StarMole";

const KEYWORDS = ["faster", "mammal", "quarter", "second", "face", "star", "twenty-two", "twenty-five", "twelve", "underwater", "bubbles", "smells", "snack"];

// underground tunnel: warm dirt, pebbles, roots hanging from the ceiling
const Tunnel: React.FC = () => {
  const bits = useMemo(() => {
    const r = rng(7);
    return {
      pebbles: Array.from({ length: 22 }, () => ({ p: [(r() - 0.5) * 3, -0.2, -r() * 4 + 1] as [number, number, number], s: 0.02 + r() * 0.05,
        g: facet(new THREE.IcosahedronGeometry(1, 0), 0.2, Math.floor(r() * 99)) })),
      roots: Array.from({ length: 9 }, () => ({ x: (r() - 0.5) * 2.4, z: -r() * 3, len: 0.3 + r() * 0.6, rot: (r() - 0.5) * 0.5 })),
    };
  }, []);
  return (
    <>
      <mesh position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#5a4128" roughness={1} />
      </mesh>
      <mesh position={[0, 0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#3a2a18" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {bits.pebbles.map((b, i) => (
        <mesh key={i} geometry={b.g} position={b.p} scale={b.s}>
          <meshStandardMaterial color="#7a6a55" flatShading />
        </mesh>
      ))}
      {bits.roots.map((r, i) => (
        <mesh key={i} position={[r.x, 0.75 - r.len / 2, r.z]} rotation={[0, 0, r.rot]}>
          <cylinderGeometry args={[0.008, 0.02, r.len, 4]} />
          <meshStandardMaterial color="#8a6a48" flatShading />
        </mesh>
      ))}
    </>
  );
};

const soil = (): Pick<Shot, "bg" | "world"> => ({
  bg: <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, #7a5a36 0%, #3a2814 60%, #160d05 100%)" }} />,
  world: (
    <>
      <fog attach="fog" args={["#2a1c0e", 1.5, 6]} />
      <ambientLight intensity={0.55} color="#ffd9a8" />
      <directionalLight position={[1, 3, 3]} intensity={1.8} color="#ffe0b8" />
      <directionalLight position={[-2, 1, -2]} intensity={0.6} color="#ff9a6a" />
      <Tunnel />
    </>
  ),
});

const pond = (t: number): Pick<Shot, "bg" | "world"> => ({
  bg: <RiverBackdrop />,
  world: (
    <>
      <RiverLights light={1.1} fogNear={1.5} fogFar={8} />
      <GodRays t={t} />
      <Silt t={t} count={50} spread={4} />
      <Surface t={t} y={1.6} />
      <Riverbed y={-0.25} color="#3a3020" />
    </>
  ),
});

// a stopwatch counting up to `to` seconds
const Stopwatch: React.FC<{ t: number; at: number; to: number; dur: number }> = ({ t, at, to, dur }) =>
  t < at ? null : (
    <Pop t={t} at={at} size={140} color="#ffd34d">{(clamp01((t - at) / dur) * to).toFixed(2)} s</Pop>
  );

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D, u } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const mole = (p: { tap?: number; sniff?: number; dig?: number; glow?: number; swim?: number } = {}) => <StarMole t={t} {...p} />;
  // a worm that gets snapped up at time `eat`
  const worm = (eat: number, pos: [number, number, number]) =>
    t < eat ? (
      <group position={pos} rotation={[0, 0.6, 0]}>
        <Worm t={t} />
      </group>
    ) : null;

  switch (scene.visual) {
    case "hook": {
      // the star finds a worm and it's gone in a blink
      const eat = 0.9;
      const lunge = glide(t, 0.55, 0.85, 0, 0.12);
      return {
        ...soil(),
        cam: s > D * 0.5 ? { pos: [0.9, 0.18, 1.7], look: [0, -0.05, 0.45] } : { pos: [1.6, 0.4, 2.6], look: [0, -0.05, 0.3] },
        body: (
          <>
            <group position={[0, 0, lunge]}>{mole({ tap: 1 })}</group>
            {worm(eat, [0.02, -0.18, 0.72])}
          </>
        ),
        overlay: t > eat && t < eat + 0.6 ? <Pop t={t} at={eat} top={560} size={120} color="#ff5a6a">GONE!</Pop> : undefined,
      };
    }
    case "fast": {
      // stopwatch: find + eat in under a quarter of a second
      const at = w(1, 2);
      const eat = at + 0.23;
      return {
        ...soil(),
        cam: { pos: [1.6, 0.35, 2.2], look: [0, -0.05, 0.35] },
        body: (
          <>
            <group position={[0, 0, glide(t, at, eat, 0, 0.12)]}>{mole({ tap: 1 })}</group>
            {worm(eat, [0.03, -0.18, 0.72])}
          </>
        ),
        overlay: (
          <>
            <Stopwatch t={t} at={at} to={0.23} dur={0.23} />
            <Pop t={t} at={w(1, 8)} top={430} size={70} color="#fff">LESS THAN 1/4 SECOND</Pop>
          </>
        ),
      };
    }
    case "face": {
      // the camera swings round to the face
      const k = glide(s, 0, D * 0.8, 0, 1);
      return {
        ...soil(),
        cam: { pos: [lerp(1.8, 0.0, k), lerp(0.5, 0.06, k), lerp(1.0, 2.0, k)], look: [0, 0, 0.45] },
        body: mole({ tap: 0.3 }),
        overlay: <Pop t={t} at={w(2, 5)} size={130} color="#ffd34d">?</Pop>,
      };
    }
    case "star": {
      // face on: the 22-tentacle star (counter)
      const n = Math.round(glide(s, 0.1, D * 0.8, 0, 22));
      return {
        ...soil(),
        cam: { pos: [0, 0.03, 1.7 - u * 0.1], look: [0, 0, 0.5] },
        body: mole({ tap: 0.2 }),
        overlay: <Pop t={t} at={S + 0.1} size={120} color="#f08c9e">{n} TENTACLES</Pop>,
      };
    }
    case "sensors": {
      // the star lights up: >25,000 touch sensors
      const k = glide(s, 0.2, D * 0.6, 0, 1);
      const n = Math.round(k * 25000);
      return {
        ...soil(),
        cam: { pos: [0.35, 0.1, 1.6], look: [0, 0, 0.5] },
        body: mole({ glow: k, tap: 0.2 }),
        overlay: <Pop t={t} at={S + 0.1} size={96} color="#ff8fb0">{n.toLocaleString("en-US")}+ SENSORS</Pop>,
      };
    }
    case "tap": {
      // a blur of taps across the tunnel floor
      return {
        ...soil(),
        cam: { pos: [1.4, 0.6, 2.6 - u * 0.3], look: [0, -0.1, 0.3] },
        body: (
          <>
            <group position={[Math.sin(s * 2) * 0.1, 0, 0]} rotation={[0, Math.sin(s * 3) * 0.25, 0]}>{mole({ tap: 1, dig: 0.4 })}</group>
          </>
        ),
        overlay: <Pop t={t} at={w(5, 6)} size={100} color="#ffd34d">12 TOUCHES / SECOND</Pop>,
      };
    }
    case "swim": {
      // into the pond: it swims with its big paws
      return {
        ...pond(t),
        cam: { pos: [2.6, 0.8, 2.4], look: [0, 0.4, 0] },
        body: (
          <group position={[lerp(-0.6, 0.4, u), 0.4 + Math.sin(t * 3) * 0.03, 0]} rotation={[0, Math.PI / 2, 0]}>
            {mole({ swim: 1 })}
          </group>
        ),
        overlay: <Pop t={t} at={w(6, 4)} size={110} color="#9fdcff">UNDERWATER</Pop>,
      };
    }
    case "bubbles": {
      // blows a bubble onto a larva on the pond bottom…
      const blow = glide(t, w(7, 1), w(7, 2) + 0.4, 0, 1);
      return {
        ...pond(t),
        cam: { pos: [1.2, 0.1, 1.6], look: [0, -0.12, 0.45] },
        body: (
          <>
            <group position={[0, -0.05, 0]} rotation={[0.2, 0, 0]}>{mole({ sniff: blow, tap: 0.3 })}</group>
            <group position={[0.02, -0.22, 0.66]} rotation={[0, 0.6, 0]}>
              <Worm t={t} color="#c9b07a" />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(7, 2)} size={120} color="#dff6ff">BUBBLES</Pop>,
      };
    }
    case "smell": {
      // …and sniffs it back in to smell
      const back = glide(s, 0.1, D * 0.7, 1, 0);
      return {
        ...pond(t),
        cam: { pos: [0.9, 0.1, 1.5], look: [0, -0.1, 0.45] },
        body: (
          <>
            <group position={[0, -0.05, 0]} rotation={[0.2, 0, 0]}>{mole({ sniff: back, tap: 0.3, glow: 0.3 })}</group>
            <group position={[0.02, -0.22, 0.66]} rotation={[0, 0.6, 0]}>
              <Worm t={t} color="#c9b07a" />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(8, 3)} size={110} color="#7dff6a">SMELL!</Pop>,
      };
    }
    default: {
      // loop: back in the tunnel, the star closes in on the next snack (= frame 0)
      return {
        ...soil(),
        cam: { pos: [1.6, 0.4, lerp(3.0, 2.6, glide(u, 0, 1, 0, 1))], look: [0, -0.05, 0.3] },
        body: (
          <>
            {mole({ tap: 1 })}
            <group position={[0.02, -0.18, 0.72]} rotation={[0, 0.6, 0]}>
              <Worm t={t} />
            </group>
          </>
        ),
      };
    }
  }
};

export const StarMoleShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["FASTEST EATER", "OF MAMMALS"]}
    label={{ name: "STAR-NOSED MOLE", latin: "Condylura cristata", beat: 2 }} question="Which animal's superpower would you want?" />
);
