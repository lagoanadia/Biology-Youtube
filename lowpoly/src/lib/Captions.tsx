// One short caption line at a time, synced to the voice's word timings. Bold white with a dark outline;
// the line's key word pops in rainbow colors. Kept in the lower-middle third, clear of the right edge and the
// bottom ~15 % (YouTube Shorts buttons).
import { loadFont } from "./montserrat";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, rainbow } from "./lowpoly";
import { Timeline, TOKEN_RE } from "./timeline";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

type Line = { start: number; end: number; words: string[] };

// Split each beat into lines of at most `maxWords`, keeping the beat's punctuation in the shown text.
export const captionLines = (tl: Timeline, maxWords = 4): Line[] => {
  const lines: Line[] = [];
  let w = 0;
  for (const beat of tl.beats) {
    const shown = beat.text.split(/\s+/); // display tokens (with punctuation)
    const n = (beat.text.match(TOKEN_RE) ?? []).length;
    let spoken = 0;
    for (const chunk of splitLine(shown, maxWords)) {
      const k = chunk.reduce((a, s) => a + (s.match(TOKEN_RE) ?? []).length, 0);
      const first = tl.words[w + spoken];
      lines.push({ start: first ? first.t : beat.start, end: 0, words: chunk });
      spoken += k;
    }
    w += n;
  }
  lines.forEach((l, i) => {
    const last = tl.words[Math.min(tl.words.length - 1, tl.words.findIndex((x) => x.t >= l.start) + 3)];
    l.end = i + 1 < lines.length ? lines[i + 1].start : Math.min(tl.total, (last?.t ?? l.start) + 1.2);
  });
  return lines;
};

// Lines of at most `maxWords`: break after a comma when there is one, else split evenly (5 words → 3 + 2).
export const splitLine = (shown: string[], maxWords: number): string[][] => {
  if (shown.length <= maxWords) return [shown];
  const comma = shown.findIndex((s, i) => s.endsWith(",") && i >= 1 && i < shown.length - 1);
  if (comma >= 0)
    return [...splitLine(shown.slice(0, comma + 1), maxWords), ...splitLine(shown.slice(comma + 1), maxWords)];
  const parts = Math.ceil(shown.length / maxWords);
  const per = Math.ceil(shown.length / parts);
  const out: string[][] = [];
  for (let i = 0; i < shown.length; i += per) out.push(shown.slice(i, i + per));
  return out;
};

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export const Captions: React.FC<{ tl: Timeline; keywords: string[]; hideAfter?: number }> = ({ tl, keywords, hideAfter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (hideAfter !== undefined && t >= hideAfter) return null;
  const lines = captionLines(tl);
  const line = lines.find((l) => t >= l.start && t < l.end);
  if (!line) return null;
  const keys = new Set(keywords.map(clean));
  const scale = pop(t, line.start, line.start + 0.18, 0.82, 1);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 170, // clear of the Shorts like/comment buttons
          top: 1190,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          columnGap: 22,
          fontFamily,
          fontWeight: 800,
          fontSize: 64,
          lineHeight: 1.12,
          textAlign: "center",
          scale: String(scale),
        }}
      >
        {line.words.map((word, i) => {
          const isKey = keys.has(clean(word));
          return (
            <span
              key={i}
              style={{
                color: "#ffffff",
                WebkitTextStroke: "11px #060a18",
                paintOrder: "stroke fill",
                textShadow: "0 8px 18px rgba(0,0,0,0.55)",
                whiteSpace: "nowrap",
              }}
            >
              {isKey
                ? [...word].map((ch, j) => (
                    <span key={j} style={{ color: rainbow(j / Math.max(word.length, 2) + t * 0.15, 0.62).getStyle() }}>
                      {ch}
                    </span>
                  ))
                : word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
