// "POV: You're the Hedgehog Before It Had Spikes" — first short of the "more educational" batch (owner 2026-11-02).
// Explains the mechanism step by step: furry ancestor → hair is keratin → stiffer-haired babies survive bites (natural
// selection) → hairs become spines → drawstring muscle → ball; moonrats (closest relatives) kept fur; porcupines and
// echidnas evolved spines separately. Scenes follow shorts/en/hedgehog-spines-pov.yaml (sources there).
import { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { ForestBack, JungleBackdrop, JungleLights, Motes, Trunk } from "../env/Jungle";
import { facet, glide, lerp, pop, rng } from "../lib/lowpoly";
import { loadFont } from "../lib/montserrat";
import { Pop, Shot, ShortShell, V3 } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Beetle, Finger, Hedgehog, HogKind } from "../models/Hedgehog";
import { Coyote } from "../models/HornedLizard";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });
const KEYWORDS = ["ancestor", "defenseless", "night", "outrun", "keratin", "nails", "stiffer", "survive", "spines", "muscle",
  "drawstring", "spiky", "moonrats", "fur", "porcupines", "echidnas", "own"];

export const env = (t: number, light = 1.25): Pick<Shot, "bg" | "world"> => ({
  bg: <JungleBackdrop time="dusk" />,
  world: (
    <>
      <JungleLights time="dusk" light={light} fogNear={5} fogFar={16} />
      <Motes t={t} night count={18} spread={5} />
    </>
  ),
});

// forest floor: dark soil, autumn leaf litter, a few trunks and the far forest
export const Floor: React.FC = () => {
  const litter = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 140 }, () => ({
      p: [(r() - 0.5) * 7, 0.005, 1.5 - r() * 7] as V3, ry: r() * 6.28, s: 0.04 + r() * 0.05,
      c: ["#8a4f24", "#a8692a", "#6b3e1e", "#7a6a2a", "#5a3a20"][Math.floor(r() * 5)],
      g: facet(new THREE.CircleGeometry(1, 5), 0.2, Math.floor(r() * 99)),
    }));
  }, []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[16, 18]} />
        <meshStandardMaterial color="#3a2c20" flatShading roughness={1} />
      </mesh>
      {litter.map((l, i) => (
        <mesh key={i} geometry={l.g} position={l.p} rotation={[-Math.PI / 2, 0, l.ry]} scale={[l.s, l.s * 0.6, 1]}>
          <meshStandardMaterial color={l.c} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Trunk x={-1.3} z={-3} r={0.28} y0={0} y1={7} seed={2} />
      <Trunk x={1.6} z={-4.2} r={0.35} y0={0} y1={7} seed={5} />
      <Trunk x={0.3} z={-6.5} r={0.3} y0={0} y1={7} seed={7} />
      <ForestBack z={-10} />
    </>
  );
};

// a hedgehog-family animal at a position / yaw
const Hog: React.FC<{ t: number; p?: V3; yaw?: number; s?: number; kind?: HogKind; evo?: number; curl?: number;
  walk?: number; sniff?: number; xray?: number }> = ({ p = [0, 0, 0], yaw = 0, s = 1, ...rest }) => (
  <group position={p} rotation={[0, yaw, 0]} scale={s}>
    <Hedgehog {...rest} />
  </group>
);

const Dog: React.FC<{ t: number; p: V3; yaw?: number; walk?: number; jaw?: number; headDown?: number; shake?: number }> = ({
  p, yaw = 0, ...rest
}) => (
  <group position={p} rotation={[0, yaw, 0]} scale={1.3}>
    <Coyote {...rest} />
  </group>
);

// frame-0 / loop composition: the furry ancestor in front, a coyote closing in from behind-left
const HOOK_CAM = { pos: [0.95, 1.0, 3.2] as V3, look: [-0.15, 0.22, -0.5] as V3 };
const DOG_END: V3 = [-0.45, 0, -1.25];

// big "=" card: two words side by side (keratin = nails)
const Equals: React.FC<{ t: number; at: number; a: string; b: string; at2: number }> = ({ t, at, a, b, at2 }) =>
  t < at ? null : (
    <AbsoluteFill style={{ top: 300, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 26, alignItems: "center", fontFamily, fontWeight: 900, fontSize: 96,
        WebkitTextStroke: "14px #060a18", paintOrder: "stroke fill", textShadow: "0 10px 26px rgba(0,0,0,0.6)" }}>
        <span style={{ color: "#ffd34d", scale: String(pop(t, at, at + 0.25, 0.4, 1)) }}>{a}</span>
        {t >= at2 && <span style={{ color: "#fff", scale: String(pop(t, at2, at2 + 0.25, 0.4, 1)) }}>=</span>}
        {t >= at2 && <span style={{ color: "#7dd6ff", scale: String(pop(t, at2, at2 + 0.25, 0.4, 1)) }}>{b}</span>}
      </div>
    </AbsoluteFill>
  );

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D, u } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);

  switch (scene.visual) {
    case "hook": {
      // the coyote lunges, jaw open; the furry ancestor flinches — nothing to protect it
      const k = glide(s, 0, D, 0, 1);
      const dog: V3 = [lerp(DOG_END[0], -0.25, k), 0, lerp(DOG_END[2], -0.75, k)];
      return {
        ...env(t),
        cam: { pos: [HOOK_CAM.pos[0], HOOK_CAM.pos[1], HOOK_CAM.pos[2] - k * 0.35], look: HOOK_CAM.look },
        body: (
          <>
            <Hog t={t} p={[0.12, 0, 0.1]} yaw={0.9} kind="ancestor" sniff={1} />
            <Dog t={t} p={dog} yaw={0.45} walk={0.4} jaw={lerp(0.4, 1, k)} headDown={lerp(0.7, 1, k)} />
            <Floor />
          </>
        ),
      };
    }
    case "hunt": {
      // sniffing out a beetle in the leaf litter… then a coyote sprints past: too slow to escape
      const dogX = lerp(-3, 3, glide(t, w(1, 6), w(1, 10) + 0.4, 0, 1));
      return {
        ...env(t),
        cam: { pos: [1.25, 0.5, 2.4 - u * 0.2], look: [0.05, 0.1, -0.2] },
        body: (
          <>
            <Hog t={t} yaw={1.0} kind="ancestor" sniff={1} walk={0.4} />
            <group position={[0.42, 0, 0.3]}>
              <Beetle t={t} />
            </group>
            <Dog t={t} p={[dogX, 0, -1.6]} yaw={Math.PI / 2} walk={1.5} />
            <Floor />
          </>
        ),
        overlay: <Pop t={t} at={w(1, 6)} size={110} color="#ff5a6a">TOO SLOW</Pop>,
      };
    }
    case "keratin": {
      // the furry ancestor glows ("hair = keratin"), then a human fingertip slides in: same material as your nails
      const fin = glide(t, w(2, 7) - 0.4, w(2, 8), 0, 1);
      const hair = pop(t, w(2, 3), w(2, 4) + 0.2) * (0.6 + Math.sin(t * 8) * 0.2);
      return {
        ...env(t, 1.4),
        cam: { pos: [0.45, 0.55, 2.35 - u * 0.15], look: [0.12, 0.08, 0] },
        body: (
          <>
            <Hog t={t} p={[-0.12, 0, 0]} yaw={0.7} kind="ancestor" sniff={1} />
            <pointLight position={[-0.1, 0.4, 0.3]} intensity={hair * 0.5} distance={1.0} color="#7dd6ff" />
            <group position={[lerp(1.5, 0.36, fin), 0.2, 0.15]} rotation={[0, -0.35, 0]} scale={0.8}>
              <Finger glow={glide(t, w(2, 8), w(2, 8) + 0.3, 0, 1)} />
            </group>
            <Floor />
          </>
        ),
        overlay: <Equals t={t} at={w(2, 4)} a="HAIR" b="NAILS" at2={w(2, 8)} />,
      };
    }
    case "babies": {
      // four furry babies; the coyote bites at them — the one with stiffer hair makes it spit (OUCH)
      const bite = w(3, 6);
      const recoil = glide(t, bite + 0.15, bite + 0.6, 0, 1);
      const lunge = glide(t, bite - 0.5, bite, 0, 1) * (1 - recoil);
      return {
        ...env(t),
        cam: { pos: [1.15, 1.05, 2.7], look: [0, 0.12, -0.3] },
        body: (
          <>
            <Hog t={t} p={[-0.32, 0, 0.1]} yaw={0.6} s={0.55} kind="ancestor" sniff={1} />
            <Hog t={t} p={[-0.08, 0, 0.32]} yaw={0.3} s={0.55} kind="ancestor" />
            <Hog t={t} p={[0.22, 0, 0.12]} yaw={0.9} s={0.6} kind="hedgehog" evo={0.35} />
            <Hog t={t} p={[0.38, 0, 0.42]} yaw={1.4} s={0.55} kind="ancestor" sniff={1} />
            <Dog t={t} p={[lerp(0.05, 0.12, lunge), 0, lerp(-1.35, -0.9, lunge) - recoil * 0.25]} yaw={0.1}
              jaw={t < bite ? lunge : 0.2} headDown={lerp(0.3, 0.9, lunge)} shake={recoil * (1 - glide(t, bite + 1.2, bite + 1.6, 0, 1))} />
            {t > w(3, 9) && (
              <mesh position={[0.22, 0.1, 0.12]} rotation={[-Math.PI / 2, 0, 0]} scale={0.22 * pop(t, w(3, 9), w(3, 9) + 0.3)}>
                <ringGeometry args={[0.9, 1, 24]} />
                <meshBasicMaterial color="#7dff6a" transparent opacity={0.85} />
              </mesh>
            )}
            <Floor />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(3, 6)} until={w(3, 9)} size={120} color="#ff5a6a">OUCH!</Pop>
            <Pop t={t} at={w(3, 9)} size={110} color="#7dff6a">SURVIVES</Pop>
          </>
        ),
      };
    }
    case "spines": {
      // turntable: over generations, the soft coat turns into spines
      const e = glide(t, S + 0.3, w(4, 10), 0, 1);
      return {
        ...env(t, 1.35),
        cam: { pos: [Math.sin(0.35 + u * 0.6) * 2.3, 0.6, Math.cos(0.35 + u * 0.6) * 2.3], look: [0, 0.08, 0] },
        body: (
          <>
            <Hog t={t} kind="hedgehog" evo={e} />
            <Floor />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={S + 0.2} until={w(4, 10)} size={96} color="#ffd34d">GENERATIONS</Pop>
            <Pop t={t} at={w(4, 10)} size={110} color="#ffffff">SPINES = HAIR</Pop>
          </>
        ),
      };
    }
    case "muscle": {
      // x-ray: the ring muscle along the edge of the spiny coat tightens and the hedgehog rolls up
      const c = glide(t, w(5, 6) - 0.1, w(5, 10) + 0.3, 0, 1);
      return {
        ...env(t, 1.3),
        cam: { pos: [1.25, 1.0, 1.55], look: [0, 0.06, 0] },
        body: (
          <>
            <Hog t={t} kind="hedgehog" curl={c} xray={glide(t, S, S + 0.4, 0, 1)} />
            <Floor />
          </>
        ),
        overlay: <Pop t={t} at={w(5, 2)} size={100} color="#ff8fa0">RING MUSCLE</Pop>,
      };
    }
    case "ball": {
      // the coyote noses the ball… and backs off
      const nose = glide(s, 0, D * 0.45, 0, 1);
      const back = glide(s, D * 0.55, D, 0, 1);
      return {
        ...env(t),
        cam: { pos: [1.7, 0.7, 2.3], look: [-0.2, 0.22, -0.35] },
        body: (
          <>
            <Hog t={t} kind="hedgehog" curl={1} />
            <Dog t={t} p={[-0.1, 0, lerp(-1.2, -0.85, nose) - back * 0.45]} yaw={0.1} headDown={lerp(0.2, 0.9, nose) * (1 - back)}
              shake={back} />
            <Floor />
          </>
        ),
        overlay: <Pop t={t} at={w(6, 3)} size={120} color="#ffd34d">NOPE.</Pop>,
      };
    }
    case "moonrat": {
      // the closest living cousin: a moonrat, still furry, next to the hedgehog
      return {
        ...env(t, 1.35),
        cam: { pos: [0.3, 0.65, 3.0 - u * 0.2], look: [0, 0.08, 0] },
        body: (
          <>
            <Hog t={t} p={[-0.26, 0, 0]} yaw={0.55} kind="moonrat" sniff={1} />
            <Hog t={t} p={[0.3, 0, 0.15]} yaw={-0.5} kind="hedgehog" />
            <Floor />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(7, 3)} until={w(7, 6)} size={110} color="#ffffff">MOONRAT</Pop>
            <Pop t={t} at={w(7, 6)} size={110} color="#ffd34d">STILL FURRY</Pop>
          </>
        ),
      };
    }
    case "convergent": {
      // porcupine and echidna pop in on each side: same answer, evolved separately
      const pp = pop(t, w(8, 0) - 0.05, w(8, 0) + 0.3);
      const ep = pop(t, w(8, 2) - 0.05, w(8, 2) + 0.3);
      return {
        ...env(t, 1.3),
        cam: { pos: [0.0, 1.35, 4.9 - u * 0.25], look: [0, 0.12, 0] },
        body: (
          <>
            <Hog t={t} p={[0, 0, 0.35]} yaw={0} kind="hedgehog" />
            {pp > 0 && <Hog t={t} p={[-0.48, 0, -0.35]} yaw={0.5} s={pp} kind="porcupine" />}
            {ep > 0 && <Hog t={t} p={[0.5, 0, -0.2]} yaw={-0.5} s={ep} kind="echidna" sniff={1} />}
            <Floor />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(8, 0)} until={w(8, 2)} top={300} size={100} color="#ffffff">PORCUPINE</Pop>
            <Pop t={t} at={w(8, 2)} until={w(8, 4)} top={300} size={100} color="#ffd34d">ECHIDNA</Pop>
            <Pop t={t} at={w(8, 4)} top={290} size={92} color="#7dff6a">NOT RELATED!</Pop>
          </>
        ),
      };
    }
    default: {
      // loop: back to the soft furry ancestor; the coyote walks in and ends exactly where frame 0 starts
      const k = glide(s, 0, D, 0, 1);
      const dog: V3 = [lerp(-1.6, DOG_END[0], k), 0, lerp(-3.2, DOG_END[2], k)];
      return {
        ...env(t),
        cam: HOOK_CAM,
        body: (
          <>
            <Hog t={t} p={[0.12, 0, 0.1]} yaw={0.9} kind="ancestor" sniff={1} />
            <Dog t={t} p={dog} yaw={0.45} walk={1 - k * 0.6} jaw={glide(s, D * 0.8, D, 0, 0.4)} headDown={glide(s, D * 0.5, D, 0, 0.7)} />
            <Floor />
          </>
        ),
      };
    }
  }
};

const lifted = (tl: Timeline, t: number): Shot => {
  const sh = shotAt(tl, t);
  const [px, py, pz] = sh.cam.pos;
  const [lx, ly, lz] = sh.cam.look;
  const d = Math.hypot(px - lx, py - ly, pz - lz);
  return { ...sh, cam: { ...sh.cam, look: [lx, ly - 0.05 * d, lz] } };
};

export const HedgehogShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={lifted} keywords={KEYWORDS} hook={["NO SPIKES", "YET"]}
    label={{ name: "EUROPEAN HEDGEHOG", latin: "Erinaceus europaeus", beat: 4 }} question="Hedgehog or porcupine: who has the better spikes?" />
);
