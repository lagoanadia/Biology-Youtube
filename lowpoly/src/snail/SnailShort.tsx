// "POV: You're a Snail Glued to a Card for 4 Years" — POV short (owner queue 2026-10-24 #1, snail sleep schedule).
// Scenes follow shorts/en/snail-sleep-pov.yaml. Facts: British Museum desert snail 1846-1850 (Wikipedia / Guinness),
// Stephenson & Lewis 2011 J Exp Biol (pond snail nap clusters ~7 bouts / ~13 h, then ~37 h active, weak time-of-day effect).
import { AbsoluteFill } from "remotion";
import { Basin, Card, Dust, MuseumBackdrop, MuseumLights, MuseumRoom, RainThought } from "../env/Museum";
import { GodRays, RiverBackdrop, RiverLights, Riverbed, Silt, Surface } from "../env/River";
import { clamp01, glide, lerp, pop } from "../lib/lowpoly";
import { loadFont } from "../lib/montserrat";
import { Pop, Shot, ShortShell, V3 } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Snail } from "../models/Snail";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });
const KEYWORDS = ["snail", "glued", "museum", "1846", "dead", "sealed", "rain", "Four", "years", "warm", "water", "crawl",
  "pond-snail", "weirder", "Seven", "naps", "thirteen", "two", "days", "awake", "night", "never"];

const museumEnv = (dim = 0, light = 1): Pick<Shot, "bg" | "world"> => ({
  bg: <MuseumBackdrop dim={dim} />,
  world: <MuseumLights light={light} />,
});
const pondEnv = (dim = 0, light = 1): Pick<Shot, "bg" | "world"> => ({
  bg: <RiverBackdrop dim={dim} />,
  world: <RiverLights light={light} fogNear={2} fogFar={11} />,
});

// the museum table: our snail glued on its card at the origin + two other specimen cards
const Specimens: React.FC<{ t: number; dust?: number }> = ({ t, dust = 0.6 }) => (
  <>
    <MuseumRoom />
    <Card />
    <Card pos={[-1.75, 0, -0.45]} yaw={0.08} w={1.2} d={0.8} tint="#e9dcc0" />
    <Card pos={[1.75, 0, -0.4]} yaw={-0.06} w={1.2} d={0.8} tint="#e9dcc0" />
    <group position={[-1.75, 0.01, -0.5]} rotation={[0, 0.6, 0]} scale={0.7}>
      <Snail t={t} out={0} shell="#c9b48a" band="#7d5c3a" />
    </group>
    <group position={[1.75, 0.01, -0.45]} rotation={[0, -0.9, 0]} scale={0.6}>
      <Snail t={t} out={0} shell="#e0d2b0" band="#a3683e" />
    </group>
    <Dust t={t} amount={dust} />
  </>
);
const Glued: React.FC<{ t: number }> = ({ t }) => (
  <group position={[0, 0.012, -0.1]}>
    <Snail t={t} out={0} seal={1} />
  </group>
);

// FRAME 0 / LOOP: over the shell of the glued snail, looking across the table to the cabinets
const HOOK_CAM = { pos: [-0.55, 1.55, -2.5] as V3, look: [0.3, 0.05, 1.8] as V3 };

// nap timeline bar: 50 h = 13 h nap cluster (7 naps) + 37 h awake
const NapBar: React.FC<{ naps: number; awake: number }> = ({ naps, awake }) => {
  const W = 880;
  const cluster = W * 0.26;
  return (
    <AbsoluteFill style={{ top: 560, alignItems: "center" }}>
      <div style={{ position: "relative", width: W, height: 70, borderRadius: 16, background: "rgba(6,10,24,0.55)",
        border: "6px solid #060a18" }}>
        {Array.from({ length: 7 }, (_, i) => {
          const k = clamp01(naps * 7 - i);
          return (
            <div key={i} style={{ position: "absolute", left: 8 + i * (cluster - 16) / 7, top: 8, width: (cluster - 16) / 7 - 6,
              height: 54, borderRadius: 8, background: "#7d8cff", opacity: k, transform: `scaleY(${k})` }} />
          );
        })}
        <div style={{ position: "absolute", left: cluster, top: 8, height: 54, width: (W - cluster - 12) * awake, borderRadius: 8,
          background: "#9cf07a" }} />
      </div>
      <div style={{ display: "flex", width: W, marginTop: 10, fontFamily, fontWeight: 900, fontSize: 40, color: "#fff",
        WebkitTextStroke: "8px #060a18", paintOrder: "stroke fill" }}>
        <div style={{ width: cluster, opacity: naps > 0 ? 1 : 0, color: "#b9c2ff" }}>13 H</div>
        <div style={{ flex: 1, textAlign: "center", opacity: awake > 0.05 ? 1 : 0, color: "#c8ff9e" }}>~37 H AWAKE</div>
      </div>
    </AbsoluteFill>
  );
};

const Zzz: React.FC<{ t: number; on: number }> = ({ t, on }) => (
  <AbsoluteFill style={{ top: 820, left: 600 }}>
    {[0, 1, 2].map((i) => {
      const k = (t * 0.8 + i / 3) % 1;
      return (
        <div key={i} style={{ position: "absolute", left: k * 120, top: -k * 260, fontFamily, fontWeight: 900, fontSize: 60 + k * 50,
          color: "#ffffff", opacity: on * (1 - k), WebkitTextStroke: "8px #060a18", paintOrder: "stroke fill" }}>Z</div>
      );
    })}
  </AbsoluteFill>
);

const PondSet: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Riverbed y={-0.02} color="#4a3d26" />
    <Surface t={t} y={3.2} />
    <GodRays t={t} amount={1.2} />
    <Silt t={t} count={50} spread={5} />
    {[[-1.2, -1.5], [1.4, -2.2], [-0.4, -3], [2.2, -0.8], [-2.3, -0.6]].map(([x, z], i) => (
      <group key={i} position={[x, 0, z]}>
        {[0, 1, 2].map((j) => (
          <mesh key={j} position={[j * 0.12 - 0.12, 0.7 + j * 0.1, 0]} rotation={[0, j, Math.sin(t * 0.8 + i + j) * 0.12 + (j - 1) * 0.15]}
            scale={[0.08, 0.75 + j * 0.15, 0.02]}>
            <coneGeometry args={[1, 2, 3]} />
            <meshStandardMaterial color={j % 2 ? "#5d8f3a" : "#4a7a2e"} flatShading />
          </mesh>
        ))}
      </group>
    ))}
  </>
);

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);

  switch (scene.visual) {
    case "hook": {
      return {
        ...museumEnv(),
        cam: { pos: [HOOK_CAM.pos[0] + Math.sin(t * 1.2) * 0.02, HOOK_CAM.pos[1], HOOK_CAM.pos[2] + u * 0.12], look: HOOK_CAM.look },
        body: (
          <>
            <Specimens t={t} />
            <Glued t={t} />
          </>
        ),
      };
    }
    case "museum": {
      // wide shot of the room, slow push in on the card
      return {
        ...museumEnv(),
        cam: { pos: [lerp(3.6, 2.7, u), lerp(2.7, 2.1, u), lerp(5.4, 4.3, u)], look: [0, 0.25, -0.2] },
        body: (
          <>
            <Specimens t={t} />
            <Glued t={t} />
          </>
        ),
        overlay: (
          <>
            <Pop t={t} at={w(1, 0)} until={w(1, 2)} top={300} size={110} color="#ffd34d">LONDON · 1846</Pop>
            <Pop t={t} at={w(1, 5)} top={300} size={140} color="#ff6b7a">"DEAD"</Pop>
          </>
        ),
      };
    }
    case "seal": {
      // close on the shell's opening: white mucus door; a thought cloud dreams of rain
      return {
        ...museumEnv(),
        cam: { pos: [0.75, 0.55, lerp(3.0, 2.6, u)], look: [0, 0.45, 0] },
        body: (
          <>
            <Specimens t={t} dust={0.3} />
            <Glued t={t} />
            <group position={[-0.15, 0.95, -0.2]} scale={pop(t, w(2, 7) - 0.2, w(2, 7) + 0.15)}>
              <RainThought t={t} s={0.55} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(2, 3)} top={300} size={110} color="#7dd6ff">SEALED SHUT</Pop>,
      };
    }
    case "years": {
      // time-lapse: light pulses day/night, dust thickens, the year counts up
      const yr = Math.min(1850, 1846 + Math.floor(s * 4.6));
      const dn = 0.5 + 0.5 * Math.sin(t * 16);
      return {
        ...museumEnv(dn * 0.7, 1 - dn * 0.45),
        cam: { pos: [1.8, 1.5, 3.4], look: [0, 0.3, 0] },
        body: (
          <>
            <Specimens t={t * 3} dust={1} />
            <Glued t={t} />
          </>
        ),
        overlay: <Pop t={t} at={scene.start} top={300} size={170} color="#ffd34d">{yr}</Pop>,
      };
    }
    case "bath": {
      // in the basin: the snail comes out, tentacles up, then glides toward the rim
      const outK = glide(t, w(4, 6) - 0.2, w(4, 9), 0, 1);
      const go = glide(t, w(4, 9), scene.end + 0.2, 0, 1);
      return {
        ...museumEnv(),
        cam: { pos: [0.35, 1.75, 2.7 - u * 0.3], look: [0, 0.3, 0.1] },
        body: (
          <>
            <MuseumRoom />
            <group position={[0, 0.01, -0.3]}>
              <Basin t={t} />
              <group position={[0, 0.06 + go * 0.12, lerp(-0.1, 0.55, go)]} rotation={[-go * 0.45, 0, 0]} scale={0.62}>
                <Snail t={t} out={outK} tent={glide(t, w(4, 9) - 0.3, w(4, 10) + 0.2, 0, 1)} crawl={go} seal={1 - outK} />
              </group>
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(4, 9)} top={300} size={150} color="#9cf07a">ALIVE!</Pop>,
      };
    }
    case "cousins": {
      // underwater pond: pond snails gliding on the mud
      return {
        ...pondEnv(),
        cam: { pos: [lerp(2.6, 2.2, u), 1.2, lerp(4.4, 3.8, u)], look: [-0.3, 0.45, -0.4] },
        body: (
          <>
            <PondSet t={t} />
            <group position={[0, 0, s * 0.25]} rotation={[0, 0.5, 0]}>
              <Snail t={t} pond crawl={1} />
            </group>
            <group position={[-1.1, 0, -1.2 + s * 0.15]} rotation={[0, 1.2, 0]} scale={0.8}>
              <Snail t={t + 1} pond crawl={1} />
            </group>
          </>
        ),
        overlay: <Pop t={t} at={w(5, 1)} top={300} size={110} color="#9cf07a">POND SNAIL</Pop>,
      };
    }
    case "naps": {
      // seven quick naps: the snail droops and perks up again as the blue blocks fill
      const n = s;
      const relax = 0.5 + 0.5 * Math.sin(n * Math.PI * 2 * 3.5 - Math.PI / 2);
      return {
        ...pondEnv(0.25),
        cam: { pos: [1.9, 0.9, 2.7], look: [0, 0.4, 0] },
        body: (
          <>
            <PondSet t={t} />
            <group rotation={[0, 0.7, 0]}>
              <Snail t={t} pond relax={relax} />
            </group>
          </>
        ),
        overlay: (
          <>
            <NapBar naps={glide(t, w(6, 0), scene.end, 0, 1)} awake={0} />
            <Pop t={t} at={w(6, 0)} top={300} size={110} color="#b9c2ff">7 NAPS</Pop>
            <Zzz t={t} on={relax} />
          </>
        ),
      };
    }
    case "awake": {
      // then ~37 h of non-stop activity: the snail cruises across the pond floor
      return {
        ...pondEnv(),
        cam: { pos: [lerp(0.3, 1.2, u), 1.0, 3.8], look: [lerp(-0.4, 0.6, u), 0.4, 0] },
        body: (
          <>
            <PondSet t={t} />
            <group position={[lerp(-0.9, 0.9, u), 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <Snail t={t * 2} pond crawl={1.5} />
            </group>
          </>
        ),
        overlay: (
          <>
            <NapBar naps={1} awake={glide(t, scene.start, scene.end - 0.2, 0, 1)} />
            <Pop t={t} at={w(7, 2)} top={300} size={110} color="#9cf07a">2 DAYS AWAKE</Pop>
          </>
        ),
      };
    }
    case "daynight": {
      // the sky flips day/night fast; the snail ignores it
      const dn = 0.5 + 0.5 * Math.sin(t * 9);
      return {
        ...pondEnv(dn * 0.85, 1 - dn * 0.6),
        cam: { pos: [1.8, 1.0, 3.2], look: [0, 0.45, 0] },
        body: (
          <>
            <PondSet t={t} />
            <group position={[0, 0, s * 0.2]} rotation={[0, 0.4, 0]}>
              <Snail t={t} pond crawl={1} relax={glide(s, 0.55, 0.75, 0, 0.8)} />
            </group>
          </>
        ),
        overlay: (
          <>
            <AbsoluteFill style={{ alignItems: "center", top: 470 }}>
              <div style={{ fontSize: 170, filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6))" }}>{dn < 0.5 ? "☀️" : "🌙"}</div>
            </AbsoluteFill>
            <Pop t={t} at={w(8, 3)} top={300} size={120} color="#ffd34d">NO BEDTIME</Pop>
          </>
        ),
      };
    }
    default: {
      // loop: back in the museum, glide to the exact frame-0 shot over the glued shell
      const k = glide(u, 0, 0.85, 0, 1);
      return {
        ...museumEnv(),
        cam: (() => {
          // orbit around the snail from the front to the exact frame-0 spot behind its shell
          const a1 = Math.atan2(HOOK_CAM.pos[0], HOOK_CAM.pos[2]);
          const r1 = Math.hypot(HOOK_CAM.pos[0], HOOK_CAM.pos[2]);
          const a = lerp(0.55, a1, k), rad = lerp(4.6, r1, k);
          const kl = k * k;
          return { pos: [Math.sin(a) * rad, lerp(2.0, HOOK_CAM.pos[1], k), Math.cos(a) * rad] as V3,
            look: [lerp(0, HOOK_CAM.look[0], kl), lerp(0.3, HOOK_CAM.look[1], kl), lerp(0, HOOK_CAM.look[2], kl)] as V3 };
        })(),
        body: (
          <>
            <Specimens t={t} />
            <Glued t={t} />
          </>
        ),
      };
    }
  }
};

export const SnailShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["YOU'RE GLUED", "TO A CARD"]}
    label={{ name: "DESERT SNAIL", latin: "Eremina desertorum" }} question="Would you survive 4 years in a shell? YES or NO?" />
);
