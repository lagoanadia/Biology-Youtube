// Shared building blocks for low-poly shorts made after the 2026-10-18 analytics rules (CLAUDE.md):
// hook card on screen from frame 0, the name as a small label (never an "It's a ___" sentence), CTA and an end
// question as on-screen text only, and a loop ending (no black frame: the last shot flows back into the first).
// A short only writes `shotAt(tl, t)` and passes it to <ShortShell>.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "./Captions";
import { clamp01, lerp, pop } from "./lowpoly";
import { loadFont } from "./montserrat";
import { scenesOf, Timeline } from "./timeline";

const { fontFamily } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

export type V3 = [number, number, number];
export type Cam = { pos: V3; look: V3; fov?: number; roll?: number };

export const CameraRig: React.FC<Cam> = ({ pos, look, fov = 35, roll = 0 }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
    camera.rotateZ(roll);
    if ("fov" in camera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
};

// Zack-style pop-up text (numbers, short claims). Sits at top ≈ 250-420 px, clear of the captions (1190 px).
export const Pop: React.FC<{ t: number; at: number; until?: number; top?: number; size?: number; color?: string;
  children: React.ReactNode }> = ({ t, at, until, top = 300, size = 110, color = "#ffffff", children }) =>
  t < at || (until !== undefined && t >= until) ? null : (
    <AbsoluteFill style={{ alignItems: "center", top }}>
      <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1.05, color, textAlign: "center",
        WebkitTextStroke: "14px #060a18", paintOrder: "stroke fill", textShadow: "0 10px 26px rgba(0,0,0,0.6)",
        padding: "0 60px", scale: String(pop(t, at, at + 0.25, 0.4, 1)),
        rotate: `${lerp(-6, 0, clamp01((t - at) / 0.25))}deg` }}>
        {children}
      </div>
    </AbsoluteFill>
  );

// Flat red ❌ stamped over the picture (CSS, so it is never clipped by the 3D camera)
export const RedCross: React.FC<{ t: number; at: number; until?: number; size?: number; top?: number }> = ({ t, at, until, size = 420, top = 640 }) =>
  t < at || (until !== undefined && t >= until) ? null : (
    <AbsoluteFill style={{ alignItems: "center", top }}>
      <div style={{ position: "relative", width: size, height: size, scale: String(pop(t, at, at + 0.22, 1.6, 1)),
        opacity: clamp01((t - at) / 0.08) }}>
        {[45, -45].map((r) => (
          <div key={r} style={{ position: "absolute", left: 0, top: size / 2 - size * 0.07, width: size, height: size * 0.14,
            background: "#ff2a3d", border: "8px solid #060a18", borderRadius: 18, rotate: `${r}deg`,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />
        ))}
      </div>
    </AbsoluteFill>
  );

// Small name label (top-left) — replaces the old "It's a ___" sentence.
export const NameLabel: React.FC<{ t: number; at: number; until: number; name: string; latin: string }> = ({
  t, at, until, name, latin,
}) => {
  if (t < at || t >= until) return null;
  const k = pop(t, at, at + 0.3);
  const out = clamp01((until - t) / 0.25);
  return (
    <AbsoluteFill style={{ top: 520, left: 70, opacity: out }}>
      <div style={{ transform: `translateX(${lerp(-60, 0, k)}px)`, opacity: k, borderLeft: "10px solid #ffd34d",
        paddingLeft: 22, fontFamily, textShadow: "0 6px 18px rgba(0,0,0,0.7)" }}>
        <div style={{ fontWeight: 900, fontSize: 64, color: "#fff", letterSpacing: 2 }}>{name}</div>
        <div style={{ fontWeight: 800, fontSize: 36, color: "#ffd34d", fontStyle: "italic" }}>{latin}</div>
      </div>
    </AbsoluteFill>
  );
};

// Hook card: on screen from frame 0 (no pop-in delay) until `until`.
export const HookCard: React.FC<{ t: number; until: number; lines: string[]; color?: string }> = ({ t, until, lines, color = "#ffd34d" }) =>
  t >= until ? null : (
    <AbsoluteFill style={{ alignItems: "center", top: 250, opacity: clamp01((until - t) / 0.2) }}>
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily, fontWeight: 900, fontSize: 112, lineHeight: 1.04, textAlign: "center",
          color: i === lines.length - 1 ? color : "#fff", WebkitTextStroke: "16px #060a18", paintOrder: "stroke fill",
          textShadow: "0 10px 30px rgba(0,0,0,0.7)", padding: "0 50px",
          scale: String(1 + Math.sin(t * 5) * 0.012) }}>
          {l}
        </div>
      ))}
    </AbsoluteFill>
  );

// End card: question (to get comments) + follow text. Voice never says the CTA (analytics rule).
export const EndQuestion: React.FC<{ t: number; at: number; question: string }> = ({ t, at, question }) =>
  t < at ? null : (
    <AbsoluteFill style={{ alignItems: "center", top: 260, gap: 18 }}>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 78, lineHeight: 1.1, color: "#fff", textAlign: "center",
        WebkitTextStroke: "12px #060a18", paintOrder: "stroke fill", padding: "0 80px",
        scale: String(pop(t, at, at + 0.3, 0.5, 1)) }}>
        {question}
      </div>
      <div style={{ fontFamily, fontWeight: 800, fontSize: 44, letterSpacing: 14, color: "#d9b45a",
        opacity: pop(t, at + 0.3, at + 0.6), textShadow: "0 6px 20px rgba(0,0,0,0.7)" }}>
        FOLLOW BIONICHE
      </div>
    </AbsoluteFill>
  );

// Quick flash-dip on every scene change (cuts feel snappy, not hard).
export const dipAt = (tl: Timeline, t: number) => {
  const cuts = scenesOf(tl).slice(1).map((sc) => sc.start);
  return Math.max(0, ...cuts.map((c) => 1 - Math.abs(t - c) / 0.07)) * 0.6;
};

export type Shot = {
  cam: Cam;
  bg: React.ReactNode; // CSS backdrop behind the transparent canvas
  world: React.ReactNode; // lights, fog, particles (inside the canvas)
  body: React.ReactNode; // animals and props (inside the canvas)
  overlay?: React.ReactNode; // pop-ups over the canvas
};

export const ShortShell: React.FC<{
  timeline?: Timeline;
  shotAt: (tl: Timeline, t: number) => Shot;
  keywords: string[];
  hook: string[];
  hookUntil?: number; // default: start of the 2nd beat
  label: { name: string; latin: string; beat?: number };
  question: string;
  vignette?: number;
}> = ({ timeline, shotAt, keywords, hook, hookUntil, label, question, vignette = 0.55 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!timeline) return null;
  const t = frame / fps;
  const shot = shotAt(timeline, t);
  const beats = timeline.beats;
  const last = timeline.words[timeline.words.length - 1];
  const speechEnd = last.t + last.d;
  const lb = label.beat ?? 1;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {shot.bg}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, near: 0.05, far: 80 }}>
        <CameraRig {...shot.cam} />
        {shot.world}
        {shot.body}
      </ThreeCanvas>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,${vignette}) 100%)` }} />
      {shot.overlay}
      <HookCard t={t} until={hookUntil ?? beats[1]?.start ?? 1.5} lines={hook} />
      <NameLabel t={t} at={beats[lb]?.start ?? 1.5} until={beats[lb + 1]?.start ?? (beats[lb]?.end ?? 4)} name={label.name}
        latin={label.latin} />
      <Captions tl={timeline} keywords={keywords} hideAfter={speechEnd + 0.1} />
      <EndQuestion t={t} at={speechEnd + 0.15} question={question} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: dipAt(timeline, t) }} />
    </AbsoluteFill>
  );
};

// Thumbnail (1080×1920 still): the animal + 2 lines of huge text at the top (second line in colour).
export const ThumbShell: React.FC<{ bg: React.ReactNode; world: React.ReactNode; cam: Cam; body: React.ReactNode;
  lines: [string, string]; color?: string; size?: number }> = ({ bg, world, cam, body, lines, color = "#ffd34d", size = 140 }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      {bg}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35, near: 0.05, far: 80 }}>
        <CameraRig {...cam} />
        {world}
        {body}
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 220, gap: 12, textAlign: "center" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1, color: i ? color : "#fff",
            WebkitTextStroke: "16px #060a18", paintOrder: "stroke fill", textShadow: "0 10px 30px rgba(0,0,0,0.7)", padding: "0 40px" }}>
            {l}
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
