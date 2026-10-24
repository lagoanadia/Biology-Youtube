// "POV: You're a Lizard That Shoots Blood From Its Eyes" — POV short (owner queue 2026-10-24 #7: horned lizard).
// Scenes follow shorts/en/horned-lizard-pov.yaml. Facts: Sherbrooke & Mason 2005 (coyotes, oral receptors), AskNature
// (vein-constricting muscles, sinus rupture), Sherbrooke & Kimball 2024 (plasma factor; birds unaffected).
import { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { IslandBackdrop, IslandLights, Sand } from "../env/Island";
import { clamp01, glide, lerp, pop, rng } from "../lib/lowpoly";
import { loadFont } from "../lib/montserrat";
import { Pop, RedCross, Shot, ShortShell, V3 } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Coyote, HornedLizard, LIZARD_EYES } from "../models/HornedLizard";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });
const KEYWORDS = ["horned", "lizard", "coyote", "camouflage", "Puffing", "squeeze", "veins", "Pressure", "blood", "meter",
  "dogs", "coyotes", "awful", "drop", "drool", "Birds", "Worth"];

const desert = (light = 1.05): Pick<Shot, "bg" | "world"> => ({
  bg: <IslandBackdrop sky="warm" />,
  world: <IslandLights sky="warm" light={light} fogNear={8} fogFar={28} />,
});

const Desert: React.FC = () => {
  const cacti = useMemo(() => {
    const r = rng(21);
    return Array.from({ length: 7 }, () => ({ x: (r() - 0.5) * 8, z: -2 - r() * 6, h: 0.6 + r() * 1.0 }));
  }, []);
  return (
    <>
      <Sand color="#d6ad74" rocks={6} size={30} seed={11} />
      {cacti.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <mesh position={[0, c.h / 2, 0]}>
            <cylinderGeometry args={[0.08, 0.1, c.h, 6]} />
            <meshStandardMaterial color="#5c8a4a" flatShading />
          </mesh>
          <mesh position={[0.13, c.h * 0.6, 0]} rotation={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.05, 0.06, c.h * 0.4, 5]} />
            <meshStandardMaterial color="#5c8a4a" flatShading />
          </mesh>
        </group>
      ))}
    </>
  );
};

// blood jets out of both eyes along an arc; k 0..1 = progress; L = reach
const Jets: React.FC<{ k: number; dir?: number; L?: number; lift?: number }> = ({ k, dir = 0, L = 1.2, lift = 0.35 }) => {
  if (k <= 0) return null;
  const n = 18;
  return (
    <group rotation={[0, dir, 0]}>
      {LIZARD_EYES.map((e, j) => (
        <group key={j}>
          {Array.from({ length: n }, (_, i) => {
            const u = k * 1.25 - i / n * 0.6;
            if (u <= 0 || u > 1) return null;
            const p = new THREE.Vector3(e[0] * (1 + u * 2), e[1] + u * lift - u * u * (lift + e[1]), e[2] + u * L);
            return (
              <mesh key={i} position={p} scale={[0.012, 0.012, 0.035]}>
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#c0102a" emissive="#5a0010" emissiveIntensity={0.4} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
};

// simple hawk: brown body, flapping wings, hooked beak (faces +z)
const Hawk: React.FC<{ t: number }> = ({ t }) => {
  const f = Math.sin(t * 12) * 0.6;
  return (
    <group>
      <mesh scale={[0.12, 0.1, 0.3]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#7a5232" flatShading />
      </mesh>
      <mesh position={[0, 0.05, 0.3]} scale={[0.08, 0.08, 0.09]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#e8dcc8" flatShading />
      </mesh>
      <mesh position={[0, 0.02, 0.4]} rotation={[Math.PI / 2 + 0.4, 0, 0]} scale={[0.025, 0.06, 0.025]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color="#e0b030" />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} rotation={[0, 0, s * f]}>
          <mesh position={[s * 0.38, 0, 0]} scale={[0.32, 0.015, 0.14]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#6b4528" flatShading />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0, -0.38]} scale={[0.1, 0.012, 0.12]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#a8522e" flatShading />
      </mesh>
    </group>
  );
};

const Gauge: React.FC<{ k: number }> = ({ k }) => (
  <AbsoluteFill style={{ top: 560, alignItems: "center" }}>
    <div style={{ width: 700, height: 64, borderRadius: 14, border: "6px solid #060a18", background: "rgba(6,10,24,0.5)", position: "relative" }}>
      <div style={{ position: "absolute", left: 6, top: 6, height: 40, width: 676 * k, borderRadius: 8,
        background: k > 0.85 ? "#ff2a3d" : "#ff9a3c" }} />
    </div>
    <div style={{ fontFamily, fontWeight: 900, fontSize: 44, color: "#fff", WebkitTextStroke: "8px #060a18", paintOrder: "stroke fill", marginTop: 8 }}>
      PRESSURE
    </div>
  </AbsoluteFill>
);

const Emoji: React.FC<{ t: number; at: number; top?: number; size?: number; children: string }> = ({ t, at, top = 600, size = 160, children }) =>
  t < at ? null : (
    <AbsoluteFill style={{ alignItems: "center", top }}>
      <div style={{ fontSize: size, scale: String(pop(t, at, at + 0.3, 0.3, 1)), filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.6))" }}>{children}</div>
    </AbsoluteFill>
  );

// coyote standing over the lizard (lizard at origin facing +z, coyote in front facing it)
const COY: V3 = [0.05, 0, 0.95];
const Standoff: React.FC<{ t: number; puff?: number; jaw?: number; shake?: number; drool?: number; headDown?: number; coyPos?: V3; jets?: number;
  liz?: V3; lizYaw?: number; walk?: number; blood?: number; jetL?: number; jetLift?: number }> = ({
  t, puff = 0, jaw = 0.5, shake = 0, drool = 0, headDown = 1, coyPos = COY, jets = 0, liz = [0, 0, 0], lizYaw = 0, walk = 0, blood = 0, jetL = 1.2, jetLift = 0.35,
}) => (
  <>
    <Desert />
    <group position={liz} rotation={[0, lizYaw, 0]}>
      <HornedLizard t={t} puff={puff} walk={walk} />
      <Jets k={jets} L={jetL} lift={jetLift} />
    </group>
    <group position={coyPos} rotation={[0, Math.PI, 0]}>
      <Coyote t={t} jaw={jaw} shake={shake} drool={drool} headDown={headDown} />
      {blood > 0 && (
        <mesh position={[0, 0.27, 0.68]} scale={[0.05 * blood, 0.03 * blood, 0.05 * blood]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#c0102a" />
        </mesh>
      )}
    </group>
  </>
);

// FRAME 0 / LOOP: from just behind the lizard, looking up at the coyote's open jaws
const HOOK_CAM = { pos: [0.22, 0.45, -0.8] as V3, look: [0.0, 0.3, 1.0] as V3 };

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const hookShot = (): Shot => ({
    ...desert(),
    cam: { pos: [HOOK_CAM.pos[0] + Math.sin(t * 3) * 0.01, HOOK_CAM.pos[1], HOOK_CAM.pos[2]], look: HOOK_CAM.look },
    body: <Standoff t={t} jaw={0.6 + Math.sin(t * 2) * 0.1} />,
  });

  switch (scene.visual) {
    case "hook":
      return hookShot();
    case "camo":
      return {
        ...desert(),
        cam: { pos: [0.6, 1.6, -1.2], look: [0, 0, 0.3] },
        body: <Standoff t={t} jaw={0.2} />,
        overlay: (
          <>
            <Pop t={t} at={w(1, 1)} top={300} size={110} color="#ffd34d">CAMOUFLAGE</Pop>
            <RedCross t={t} at={w(1, 2)} size={240} top={560} />
          </>
        ),
      };
    case "puff": {
      const puff = glide(t, w(2, 0), w(2, 1) + 0.2, 0, 1);
      return {
        ...desert(),
        cam: { pos: [0.9, 0.6, -0.6], look: [0, 0.1, 0.2] },
        body: <Standoff t={t} puff={puff} jaw={0.3} />,
        overlay: (
          <>
            <Pop t={t} at={w(2, 0)} top={300} size={120} color="#ffd34d">PUFF UP</Pop>
            <RedCross t={t} at={w(2, 2)} size={240} top={560} />
          </>
        ),
      };
    }
    case "squeeze": {
      // close on the head: pressure builds (gauge), head trembles
      const k = glide(t, w(3, 1), scene.end + 0.4, 0, 0.9);
      const tremble = Math.sin(t * 50) * 0.004 * k;
      return {
        ...desert(),
        cam: { pos: [0.32 + tremble, 0.22, 0.62], look: [0, 0.07, 0.17] },
        body: <Standoff t={t} puff={0.3} jaw={0.4} />,
        overlay: (
          <>
            <Pop t={t} at={w(3, 2)} top={300} size={120} color="#ff6b7a">SQUEEZE</Pop>
            <Gauge k={k} />
          </>
        ),
      };
    }
    case "squirt": {
      const k = glide(t, w(4, 7) - 0.1, w(4, 11), 0, 1);
      return {
        ...desert(),
        cam: { pos: [2.3, 0.45, 0.25], look: [0, 0.3, 0.3] },
        body: <Standoff t={t} puff={0.3} jaw={0.6} jets={k} blood={k} jetL={0.42} jetLift={0.75} />,
        overlay: (
          <>
            {t < w(4, 7) && <Gauge k={glide(t, scene.start, w(4, 7), 0.9, 1)} />}
            <Pop t={t} at={w(4, 7)} top={300} size={150} color="#ff2a3d">SQUIRT!</Pop>
          </>
        ),
      };
    }
    case "meter": {
      // side view without the coyote: the jet arcs over a ruler
      return {
        ...desert(),
        cam: { pos: [3.6, 0.7, 0.5], look: [0, 0.2, 0.5] },
        body: (
          <>
            <Desert />
            <HornedLizard t={t} puff={0.2} />
            <Jets k={(((t - scene.start) * 0.8) % 1) * 1.1} L={1.25} />
            <mesh position={[0.12, 0.005, 0.7]}>
              <boxGeometry args={[0.04, 0.01, 1.05]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {Array.from({ length: 11 }, (_, i) => (
              <mesh key={i} position={[0.12, 0.01, 0.2 + i * 0.1]}>
                <boxGeometry args={[i % 5 ? 0.06 : 0.1, 0.012, 0.012]} />
                <meshBasicMaterial color="#060a18" />
              </mesh>
            ))}
          </>
        ),
        overlay: <Pop t={t} at={w(5, 3)} top={300} size={140} color="#ffd34d">1+ METER</Pop>,
      };
    }
    case "taste":
      return {
        ...desert(),
        cam: { pos: [2.2, 0.9, 2.7], look: [0, 0.35, 0.6] },
        body: <Standoff t={t} jaw={0.3} headDown={0.5} blood={1} />,
        overlay: (
          <>
            <Pop t={t} at={w(6, 6)} top={300} size={140} color="#9cf07a">YUCK!</Pop>
            <Emoji t={t} at={w(6, 7)} top={560}>🤢</Emoji>
          </>
        ),
      };
    case "drop": {
      // the coyote backs off shaking its head and drooling; the lizard scuttles away
      const back = glide(t, scene.start, scene.end, 0, 0.8);
      return {
        ...desert(),
        cam: { pos: [1.8, 0.8, 0.0], look: [0, 0.3, 0.8] },
        body: (
          <Standoff t={t} jaw={0.4} headDown={0.2} shake={t > w(7, 3) ? 1 : 0} drool={t > w(7, 6) ? 1 : 0} blood={1}
            coyPos={[COY[0], 0, COY[2] + back]} liz={[lerp(0, -0.35, back), 0, -back * 0.3]} lizYaw={-2.4} walk={back > 0 ? 1 : 0} />
        ),
        overlay: <Pop t={t} at={w(7, 1)} top={300} size={130} color="#ffd34d">DROPPED!</Pop>,
      };
    }
    case "birds": {
      // a hawk swoops by — the lizard doesn't waste its blood on it
      const k = clamp01((t - scene.start) / (scene.end - scene.start));
      return {
        ...desert(),
        cam: { pos: [0.4, 0.55, -1.5], look: [0, 0.4, 0.8] },
        body: (
          <>
            <Desert />
            <HornedLizard t={t} />
            <group position={[lerp(-2.5, 2.5, k), 1.4 - Math.sin(k * Math.PI) * 0.8, 1.2]} rotation={[0, Math.PI / 2, 0]}>
              <Hawk t={t} />
            </group>
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(8, 0)} until={w(8, 4)} top={300} size={110} color="#ffffff">BIRDS?</Pop>
            <Pop t={t} at={w(8, 4)} top={300} size={110} color="#ffd34d">DOGS ONLY</Pop>
          </>
        ),
      };
    }
    default: {
      if (u < 0.5) {
        return {
          ...desert(),
          cam: { pos: [0.9, 0.5, 1.0], look: [0, 0.08, 0] },
          body: (
            <>
              <Desert />
              <group rotation={[0, 0.6, 0]}>
                <HornedLizard t={t} walk={0} />
              </group>
            </>
          ),
          overlay: <Pop t={t} at={scene.start + 0.05} top={300} size={140} color="#ffd34d">WORTH IT 😎</Pop>,
        };
      }
      return hookShot();
    }
  }
};

export const LizardShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["A COYOTE", "GRABBED YOU"]}
    label={{ name: "TEXAS HORNED LIZARD", latin: "Phrynosoma cornutum" }} question="Blood from your eyes or never fight back?" />
);

export const LizardJets = Jets;
