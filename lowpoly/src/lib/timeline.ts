// Timeline written by scripts/render_lowpoly.py: real word timings from the TTS voice (or a planned
// timeline when the voice is not recorded yet). Every scene and caption is driven from this file.
import { CalculateMetadataFunction, staticFile } from "remotion";

export type Beat = { text: string; visual: string; start: number; end: number };
export type Word = { t: number; d: number; w: string };
export type Timeline = {
  total: number;
  voice?: string | null;
  planned?: boolean; // true = timings estimated from the shot list, voice not recorded yet
  beats: Beat[];
  words: Word[];
};

export type ShortProps = { timelineFile: string; timeline?: Timeline };

export const FPS = 30;

// Loads public/<timelineFile> and sets the duration from it (rendered length = voice + tail).
export const loadTimeline: CalculateMetadataFunction<ShortProps> = async ({ props, abortSignal }) => {
  const res = await fetch(staticFile(props.timelineFile), { signal: abortSignal });
  const timeline = (await res.json()) as Timeline;
  return { durationInFrames: Math.round(timeline.total * FPS), props: { ...props, timeline } };
};

export type Scene = { visual: string; start: number; end: number; beats: Beat[] };

// Consecutive beats that share a `visual` form one scene (one continuous camera move).
export const scenesOf = (tl: Timeline): Scene[] => {
  const out: Scene[] = [];
  for (const b of tl.beats) {
    const last = out[out.length - 1];
    if (last && last.visual === b.visual) {
      last.end = b.end;
      last.beats.push(b);
    } else {
      out.push({ visual: b.visual, start: b.start, end: b.end, beats: [b] });
    }
  }
  return out;
};

// Current scene + local time. `u` = 0..1 progress, `s` = seconds since the scene started.
export const sceneAt = (scenes: Scene[], t: number) => {
  const i = Math.max(0, scenes.findIndex((sc) => t >= sc.start && t < sc.end));
  const sc = scenes[t >= scenes[scenes.length - 1].end ? scenes.length - 1 : i];
  const dur = sc.end - sc.start;
  const s = Math.min(Math.max(t - sc.start, 0), dur);
  return { scene: sc, s, dur, u: s / dur };
};

// Start time (s) of the n-th word of a beat: lets an action land exactly on a spoken word.
export const wordTime = (tl: Timeline, beatIndex: number, wordInBeat: number) => {
  let idx = 0;
  for (let i = 0; i < beatIndex; i++) idx += countWords(tl.beats[i].text);
  return tl.words[Math.min(idx + wordInBeat, tl.words.length - 1)]?.t ?? tl.beats[beatIndex].start;
};

export const TOKEN_RE = /[\w'’]+(?:-[\w'’]+)*/g; // same tokenizer as biotube TOKEN_RE
export const countWords = (text: string) => (text.match(TOKEN_RE) ?? []).length;
