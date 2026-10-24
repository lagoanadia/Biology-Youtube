// "POV: You're a Male Seahorse and You're Pregnant" — POV short (owner queue 2026-10-24 #4).
// Scenes follow shorts/en/seahorse-pov.yaml. Facts: Project Seahorse (morning dance, egg transfer, brood sizes),
// National Geographic (mate again right away), Univ. Sydney (placenta-like pouch), GEOMAR / Roth 2020 (MHC II loss).
import * as THREE from "three";
import { ReefBackdrop, ReefFloor, ReefLights, Seagrass } from "../env/Reef";
import { clamp01, glide, lerp, pop, rng } from "../lib/lowpoly";
import { Pop, RedCross, Shot, ShortShell, V3 } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Seahorse } from "../models/Seahorse";

const KEYWORDS = ["male", "seahorse", "pregnant", "dance", "eggs", "pouch", "fertilize", "placenta-like", "oxygen", "immune",
  "genes", "reject", "labor", "hundreds", "babies", "again", "dad"];

const reef = (dim = 0, light = 1): Pick<Shot, "bg" | "world"> => ({
  bg: <ReefBackdrop dim={dim} />,
  world: <ReefLights light={light} />,
});

const Set: React.FC<{ t: number }> = ({ t }) => (
  <>
    <ReefFloor t={t} />
    <Seagrass t={t} />
  </>
);

// the holdfast: a tall seagrass stem the male's tail is wrapped around
const Stem: React.FC<{ t: number; pos?: V3 }> = ({ t, pos = [0, 0, 0] }) => (
  // goes through the tail curl and leans backward, so it passes behind the body
  <group position={[pos[0], 0.08, pos[2] + 0.1]} rotation={[-0.8 + Math.sin(t) * 0.02, 0, 0]}>
    <mesh position={[0, 0.6, 0]} scale={[0.035, 2.2, 0.035]}>
      <cylinderGeometry args={[1, 1, 1, 5]} />
      <meshStandardMaterial color="#5fa83f" flatShading />
    </mesh>
  </group>
);

const Horse: React.FC<{ t: number; pos?: V3; yaw?: number; s?: number; female?: boolean; pouch?: number; xray?: number;
  eggs?: number; push?: number; bright?: number }> = ({ pos = [0, 0, 0], yaw = 0, s = 1, ...p }) => (
  <group position={pos} rotation={[0, yaw, 0]} scale={s}>
    <Seahorse {...p} />
  </group>
);

// tiny baby seahorse (cheap: head + body + curl)
const Baby: React.FC<{ t: number }> = ({ t }) => (
  <group rotation={[Math.sin(t * 3) * 0.2, 0, 0]}>
    <mesh position={[0, 0.5, 0.05]} scale={[0.08, 0.09, 0.12]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#d9b23a" flatShading />
    </mesh>
    <mesh position={[0, 0.27, 0]} scale={[0.07, 0.25, 0.07]}>
      <cylinderGeometry args={[1, 0.6, 1, 5]} />
      <meshStandardMaterial color="#d9b23a" flatShading />
    </mesh>
    <mesh position={[0, 0.08, 0.05]} rotation={[0, Math.PI / 2, 0]} scale={0.07}>
      <torusGeometry args={[1, 0.35, 3, 6, Math.PI * 1.4]} />
      <meshStandardMaterial color="#d9b23a" flatShading />
    </mesh>
  </group>
);

// babies shooting out of the pouch (world pos `from`) in a fan; `k` 0..1 = how many are out
const Babies: React.FC<{ t: number; from: V3; k: number; spread?: number }> = ({ t, from, k, spread = 1 }) => {
  const r = rng(31);
  const n = 40;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const born = clamp01(k * n - i);
        const dir = new THREE.Vector3((r() - 0.5) * 1.6, r() * 1.2 - 0.1, 0.6 + r() * 0.9).normalize();
        const d = Math.min(1, born) * (0.5 + r() * 1.5) * spread;
        const spin = r() * 6;
        if (born <= 0) return null;
        const age = born;
        return (
          <group key={i} position={[from[0] + dir.x * d * age, from[1] + dir.y * d * age + Math.sin(t * 2 + i) * 0.03, from[2] + dir.z * d * age]}
            scale={0.22 * pop(age, 0, 0.3)} rotation={[0, spin, 0]}>
            <Baby t={t + i} />
          </group>
        );
      })}
    </>
  );
};

// beads travelling along a short arc from a to b; k 0..1
const EggStream: React.FC<{ a: V3; b: V3; k: number }> = ({ a, b, k }) => (
  <>
    {Array.from({ length: 14 }, (_, i) => {
      const u = clamp01(k * 1.6 - i / 14);
      if (u <= 0 || u >= 1) return null;
      const p = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), u);
      p.y += Math.sin(u * Math.PI) * 0.12;
      return (
        <mesh key={i} position={p} scale={0.03}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#ff8a2a" emissive="#ff6a00" emissiveIntensity={0.5} />
        </mesh>
      );
    })}
  </>
);

// immune "guards": blue spiky balls that drift toward the pouch and then vanish
const ImmuneCells: React.FC<{ t: number; center: V3; gone: number }> = ({ t, center, gone }) => (
  <>
    {Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + t * 0.4;
      const rad = 0.55 + Math.sin(t * 2 + i) * 0.05;
      const s = 0.07 * (1 - clamp01(gone * 1.4 - i * 0.06));
      if (s <= 0.001) return null;
      return (
        <group key={i} position={[center[0] + Math.cos(a) * rad, center[1] + Math.sin(a) * rad, center[2] + 0.1]} scale={s}>
          <mesh>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#6aa8ff" flatShading />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((j) => (
            <mesh key={j} rotation={[j, j * 1.3, 0]} position={[0, 0, 0]}>
              <coneGeometry args={[0.25, 2.6, 4]} />
              <meshStandardMaterial color="#9cc6ff" flatShading />
            </mesh>
          ))}
        </group>
      );
    })}
  </>
);

// FRAME 0 / LOOP: from behind the male's head, looking at his partner in the seagrass
const HOOK_CAM = { pos: [0.35, 0.95, 2.85] as V3, look: [0, 0.6, 0] as V3 };
const POUCH: V3 = [0, 0.38, 0.13]; // pouch position for the male at the origin facing +z

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const hookShot = (pouch = 0.15): Shot => ({
    ...reef(),
    cam: { pos: [HOOK_CAM.pos[0] + Math.sin(t * 1.2) * 0.03, HOOK_CAM.pos[1] + Math.sin(t * 0.8) * 0.02, HOOK_CAM.pos[2]], look: HOOK_CAM.look },
    body: (
      <>
        <Set t={t} />
        <Horse t={t} pos={[-0.32, 0, 0]} yaw={Math.PI / 2} pouch={pouch} />
        <Horse t={t + 1} female pos={[0.34, 0.06 + Math.sin(t * 1.5) * 0.03, 0]} yaw={-Math.PI / 2} />
      </>
    ),
  });

  switch (scene.visual) {
    case "hook":
      return hookShot();
    case "dance": {
      // circling each other, glowing brighter
      const bright = 0.5 + 0.5 * Math.sin(t * 4);
      const a = t * 0.6;
      return {
        ...reef(),
        cam: { pos: [0.4, 1.0, lerp(3.6, 3.2, u)], look: [0, 0.65, 0] },
        body: (
          <>
            <Set t={t} />
            
            <group rotation={[0, Math.sin(a) * 0.5, 0]}>
              <Horse t={t} pos={[-0.38, Math.sin(t * 2) * 0.05, 0]} yaw={Math.PI / 2} bright={bright} pouch={0.15} />
              <Horse t={t + 0.3} female pos={[0.38, Math.sin(t * 2) * 0.05, 0]} yaw={-Math.PI / 2} bright={bright} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(1, 6)} top={300} size={110} color="#ffd34d">MORNING DANCE</Pop>,
      };
    }
    case "eggs": {
      // face to face; eggs stream from her into his pouch
      const k = glide(t, w(2, 2), w(2, 8), 0, 1);
      return {
        ...reef(),
        cam: { pos: [0.25, 0.85, 2.6], look: [0, 0.55, 0] },
        body: (
          <>
            <Set t={t} />
            <Horse t={t} pos={[-0.3, 0, 0]} yaw={Math.PI / 2} pouch={lerp(0.15, 0.5, k)} xray={0.7} eggs={k} />
            <Horse t={t + 0.3} female pos={[0.32, 0.06, 0]} yaw={-Math.PI / 2} />
            <EggStream a={[0.25, 0.36, 0]} b={[-0.15, 0.38, 0]} k={k} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(2, 4)} until={w(2, 10)} top={300} size={110} color="#ff9a3c">EGGS → DAD</Pop>
            <Pop t={t} at={w(2, 10)} top={300} size={110} color="#9cf07a">FERTILIZED</Pop>
          </>
        ),
      };
    }
    case "placenta": {
      // inside view of the pouch: eggs glowing, oxygen bubbles flowing in
      return {
        ...reef(0.15),
        cam: { pos: [lerp(0.9, 0.7, u), 0.5, lerp(1.0, 0.85, u)], look: [0, 0.4, 0.12] },
        body: (
          <>
            <Set t={t} />
            <Stem t={t} />
            <Horse t={t} pouch={0.7} xray={1} eggs={1} />
            {Array.from({ length: 10 }, (_, i) => {
              const k = (t * 0.7 + i / 10) % 1;
              const a = i * 2.1;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.35 * (1 - k), POUCH[1] + Math.sin(a) * 0.3 * (1 - k), POUCH[2] + 0.06]} scale={0.018}>
                  <icosahedronGeometry args={[1, 1]} />
                  <meshBasicMaterial color="#bff3ff" transparent opacity={1 - k * 0.7} />
                </mesh>
              );
            })}
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(3, 4)} until={w(3, 9)} top={300} size={100} color="#ff8fd0">PLACENTA-LIKE</Pop>
            <Pop t={t} at={w(3, 9)} top={300} size={140} color="#7dd6ff">+ OXYGEN</Pop>
          </>
        ),
      };
    }
    case "immune": {
      const gone = glide(t, w(4, 3), w(4, 8), 0, 1);
      return {
        ...reef(0.1),
        cam: { pos: [1.3, 0.7, 1.6], look: [0, 0.5, 0.1] },
        body: (
          <>
            <Set t={t} />
            <Stem t={t} />
            <Horse t={t} pouch={0.75} xray={0.8} eggs={1} />
            <ImmuneCells t={t} center={POUCH} gone={gone} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(4, 4)} top={300} size={100} color="#7dd6ff">IMMUNE GENES</Pop>
            <RedCross t={t} at={w(4, 5)} size={260} top={420} />
          </>
        ),
      };
    }
    case "labor": {
      const push = Math.max(0, Math.sin((t - scene.start) * 5)) * glide(t, w(5, 4), w(5, 7), 0, 1);
      return {
        ...reef(),
        cam: { pos: [lerp(1.9, 1.6, u), 0.8, lerp(1.4, 1.2, u)], look: [0, 0.6, 0.1] },
        body: (
          <>
            <Set t={t} />
            <Stem t={t} />
            <Horse t={t} pouch={1} push={push} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(5, 1)} until={w(5, 7)} top={300} size={110} color="#ffffff">WEEKS LATER...</Pop>
            <Pop t={t} at={w(5, 7)} top={300} size={140} color="#ff8fd0">LABOR!</Pop>
          </>
        ),
      };
    }
    case "birth": {
      // each pump shoots out a cloud of babies
      const k = glide(t, scene.start + 0.1, scene.end + 0.3, 0, 1);
      const push = Math.max(0, Math.sin((t - scene.start) * 7));
      return {
        ...reef(),
        cam: { pos: [1.8, 0.9, 2.6], look: [0, 0.6, 0.6] },
        body: (
          <>
            <Set t={t} />
            <Stem t={t} />
            <Horse t={t} pouch={lerp(1, 0.2, k)} push={push} />
            <Babies t={t} from={[0, 0.4, 0.25]} k={k} />
          </>
        ),
        overlay: <Pop t={t} at={w(6, 3)} top={300} size={140} color="#ffd34d">HUNDREDS!</Pop>,
      };
    }
    case "again": {
      // she's back with a new batch; babies drifting away
      const k = glide(t, w(7, 3), scene.end, 0, 1);
      return {
        ...reef(),
        cam: { pos: [0.3, 0.9, 2.9], look: [0, 0.55, 0] },
        body: (
          <>
            <Set t={t} />
            <Horse t={t} pos={[-0.3, 0, 0]} yaw={Math.PI / 2} pouch={lerp(0.2, 0.45, k)} xray={0.7} eggs={k} />
            <Horse t={t + 0.3} female pos={[lerp(0.9, 0.32, glide(t, scene.start, w(7, 3), 0, 1)), 0.06, 0]} yaw={-Math.PI / 2} />
            <EggStream a={[0.25, 0.36, 0]} b={[-0.15, 0.38, 0]} k={k} />
            <Babies t={t} from={[-0.3, 0.4, 0.1]} k={1} spread={1.6} />
          </>
        ),
        overlay: <Pop t={t} at={w(7, 5)} top={300} size={140} color="#ff8fd0">AGAIN!</Pop>,
      };
    }
    default: {
      if (u < 0.5) {
        return {
          ...reef(),
          cam: { pos: [1.4, 1.0, lerp(2.6, 2.3, u * 2)], look: [0, 0.65, 0.3] },
          body: (
            <>
              <Set t={t} />
              <Stem t={t} />
              <Horse t={t} pouch={0.4} />
              <Babies t={t} from={[0, 0.4, 0.25]} k={1} spread={1.3} />
            </>
          ),
          overlay: <Pop t={t} at={scene.start + 0.1} top={300} size={130} color="#ffd34d">BEST DAD</Pop>,
        };
      }
      return hookShot();
    }
  }
};

export const SeahorseShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["DAD GETS", "PREGNANT"]}
    label={{ name: "MALE SEAHORSE", latin: "Hippocampus" }} question="Should human dads get pregnant too? YES or NO?" />
);
