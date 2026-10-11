"""Render a low-poly animated short (Zack D. Films style, owner request 2026-10-10).

Pipeline: voice + real word timings (biotube) -> lowpoly/public/<id>/timeline.json -> Remotion renders the 3D
animation and captions (silent) -> biotube.final_mix adds voice, deep-sea pad and soft SFX.

Usage:
    python scripts/render_lowpoly.py shorts/en/comb-jelly-rainbow.yaml CombJelly --total 28 --pause 7:1.0 \
        --cue shimmer.wav:6:8 --cue squish.wav:8:8
    --voice andrew   approved edge-tts voice (default)
    --voice kokoro   am_michael (fallback)
    --voice planned  no voice yet: timings estimated from word counts, so the animation can be built and checked;
                     the preview has pad + SFX only, and the .srt / timings are for recording the narration
    --stage prepare  only voice + timeline (then preview in Remotion Studio: cd lowpoly && npx remotion studio)
    --frames 0,90    only these frames as PNG stills, to check the look

Output: output/<package-id>/lowpoly/short_<n>.mp4 (+ .srt)
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))  # repo root, so `biotube` imports
import argparse
import json
import re
import subprocess

from biotube import ffmpeg
from biotube.config import load_config
from biotube.render import (BROADCAST_EQ, TOKEN_RE, _h, beat_times, final_mix, mean_db, pad_audio, sfx_track,
                            voice_with_pauses, write_srt)
from biotube.store import load_package
from biotube.tts import cache_suffix, load_words, synthesize, voice_for

ap = argparse.ArgumentParser()
ap.add_argument("package")
ap.add_argument("composition", help="Remotion composition id, e.g. CombJelly")
ap.add_argument("--index", type=int, default=0)
ap.add_argument("--voice", choices=["andrew", "kokoro", "planned"], default="andrew")
ap.add_argument("--total", type=float, help="exact length in seconds (e.g. 28); default = voice + 0.5 s")
ap.add_argument("--pause", action="append", default=[], help="BEAT:SECONDS extra silence after a beat (image-only hold)")
ap.add_argument("--cue", action="append", default=[], help="FILE:BEAT:WORD sound effect from assets/sfx on a spoken word")
ap.add_argument("--rate", default="+4%", help="voice speed (approved Andrew: +4%%)")
ap.add_argument("--max-gap", type=float, default=0.0, help="shorten silences between sentences to this (s); 0 = off")
ap.add_argument("--stage", choices=["prepare", "all"], default="all")
ap.add_argument("--frames", help="render only these frames as PNG (comma list) into output/<id>/lowpoly/frames")
ap.add_argument("--ambience", default="deep_sea_drone.mp3", help="the deep-sea pad (assets/ambience)")
ap.add_argument("--volume", type=float, default=0.12)
ap.add_argument("--whoosh", type=float, default=0.1, help="soft whoosh on scene changes (0 = off)")
args = ap.parse_args()

cfg = load_config()
# The brief's "low ambient deep-sea pad" IS the music: no Beethoven on top of it.
cfg["editing"].update(style="default", whoosh_on="none", impact_volume=0, progress_bar=False, music_volume=0,
                      ambience=args.ambience, ambience_volume=args.volume, ambience_duck=True)
voices = {"andrew": ("edge", "en-US-AndrewMultilingualNeural", "-10Hz"), "kokoro": ("kokoro", "am_michael", "+0Hz")}

pkg = load_package(args.package)
short = pkg.shorts[args.index]
out_dir = cfg.path("output") / pkg.id / "lowpoly"
work = out_dir / f"work_short{args.index + 1}"
work.mkdir(parents=True, exist_ok=True)
public = ROOT / "lowpoly" / "public" / pkg.id
public.mkdir(parents=True, exist_ok=True)
pauses = {int(b): float(s) for b, s in (p.split(":") for p in args.pause)}
counts = [len(TOKEN_RE.findall(b.text)) for b in short.beats]
gaps = [pauses.get(k, 0.0) for k in range(len(short.beats) - 1)]

# 1. voice (or a planned timeline) with word timings
voice = None
if args.voice == "planned":
    # ~0.30 s per word + 0.22 s between sentences: Andrew at +4 % measured on the approved hagfish short
    words, t = [], 0.0
    for k, beat in enumerate(short.beats):
        for tok in TOKEN_RE.findall(beat.text):
            d = 0.12 + 0.045 * len(tok)
            words.append({"t": round(t, 3), "d": round(d, 3), "w": tok})
            t += d + 0.06
        t += 0.22 + (gaps[k] if k < len(gaps) else 0)
    speech_end = words[-1]["t"] + words[-1]["d"]
    total = args.total or speech_end + 0.5
    if speech_end > total - 0.4:  # squeeze to fit the requested length
        f = (total - 0.6) / speech_end
        words = [dict(w, t=round(w["t"] * f, 3), d=round(w["d"] * f, 3)) for w in words]
else:
    provider, name, pitch = voices[args.voice]
    cfg["voice"].update(provider=provider, voice_en=name, rate_shorts=args.rate, pitch_shorts=pitch, broadcast_eq=True)
    voice_name, _ = voice_for(short=True, lang=pkg.language)
    key = short.narration + voice_name + provider + args.rate + cache_suffix(short=True, lang=pkg.language)
    mp3 = cfg.path("cache") / "tts" / f"{_h(key)}.mp3"
    voice_len = synthesize(short.narration, mp3, short=True, provider=provider, lang=pkg.language)
    total = args.total or voice_len + sum(gaps) + 0.5
    if voice_len + sum(gaps) > total - 0.3 and not args.max_gap:
        sys.exit(f"voice {voice_len:.2f} s + pauses {sum(gaps):.2f} s does not fit in {total} s: shorten the script")
    voice_eq = work / "voice_eq.wav"
    ffmpeg.run(["-i", str(mp3), "-af", BROADCAST_EQ, str(voice_eq)])
    words = load_words(mp3)
    if args.max_gap:  # Kokoro leaves ~0.45 s between sentences: shorten every silence to max_gap, shift the words
        err = ffmpeg.run_capture(["-i", str(voice_eq), "-af", "silencedetect=n=-40dB:d=0.15", "-f", "null", "-"])
        sil = [(float(a), float(b)) for a, b in
               re.findall(r"silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)", err)]
        cuts = [(a + args.max_gap / 2, b - args.max_gap / 2) for a, b in sil if b - a > args.max_gap and a > 0.05]
        lead = next((b - 0.08 for a, b in sil if a <= 0.05 and b > 0.1), 0.0)  # leading silence → 0.08 s
        if lead:
            cuts.insert(0, (0.0, lead))
        end = words[-1]["t"] + words[-1]["d"] + 0.15  # trailing silence → 0.15 s
        keep, prev = [], 0.0
        for a, b in cuts:
            if b - prev > 0 and a > prev:
                keep.append((prev, a))
            prev = b
        keep.append((prev, end))
        graph = ";".join(f"[0:a]atrim=start={a:.3f}" + (f":end={b:.3f}" if b else "") + f",asetpts=PTS-STARTPTS[k{i}]"
                         for i, (a, b) in enumerate(keep))
        graph += ";" + "".join(f"[k{i}]" for i in range(len(keep))) + f"concat=n={len(keep)}:v=0:a=1[a]"
        tight = work / "voice_tight.wav"
        ffmpeg.run(["-i", str(voice_eq), "-filter_complex", graph, "-map", "[a]", str(tight)])
        words = [dict(w, t=w["t"] - sum(b - a for a, b in cuts if b <= w["t"] + 0.01)) for w in words]
        print(f"pauses: {len(cuts)} trimmed to {args.max_gap} s, saved {sum(b - a for a, b in cuts):.2f} s")
        voice_eq, voice_len = tight, ffmpeg.duration(tight)
        total = args.total or voice_len + sum(gaps) + 0.5
        if voice_len + sum(gaps) > total - 0.3:
            sys.exit(f"voice {voice_len:.2f} s + pauses {sum(gaps):.2f} s does not fit in {total} s: shorten the script")
    words = voice_with_pauses(voice_eq, words, counts, 0.0, gaps, total, work / "voice_paused.wav")
    voice = pad_audio(work / "voice_paused.wav", total, work / "voice.wav")

# 2. timeline: one entry per beat, timed from the first word of each sentence
times = beat_times(short.beats, words, total)
timeline = {
    "total": round(total, 3),
    "planned": args.voice == "planned",
    "beats": [{"text": b.text, "visual": b.visual, "start": round(s, 3), "end": round(e, 3)}
              for b, (s, e) in zip(short.beats, times)],
    "words": [{"t": round(w["t"], 3), "d": round(w["d"], 3), "w": w["w"]} for w in words],
}
props = public / "timeline.json"
props.write_text(json.dumps(timeline, indent=1), encoding="utf-8")
print(f"timeline: {props} ({total:.2f} s, {len(words)} words, {len(short.beats)} beats)")

# .srt for YouTube: same lines as the burned captions (lowpoly/src/lib/Captions.tsx splitLine)
def split_line(shown: list[str], max_words: int = 4) -> list[list[str]]:
    """≤ max_words per line; break after a comma when there is one, else split evenly (5 words → 3 + 2)."""
    if len(shown) <= max_words:
        return [shown]
    comma = next((i for i, x in enumerate(shown) if x.endswith(",") and 1 <= i < len(shown) - 1), -1)
    if comma >= 0:
        return split_line(shown[:comma + 1], max_words) + split_line(shown[comma + 1:], max_words)
    per = -(-len(shown) // -(-len(shown) // max_words))
    return [shown[i:i + per] for i in range(0, len(shown), per)]


chunks, w = [], 0
for beat, n in zip(short.beats, counts):
    spoken = 0
    for part in split_line(beat.text.split()):
        chunks.append([words[w + spoken]["t"], None, " ".join(part)])
        spoken += sum(len(TOKEN_RE.findall(p)) for p in part)
    w += n
for i, c in enumerate(chunks):
    last = words[-1]
    c[1] = chunks[i + 1][0] - 0.02 if i + 1 < len(chunks) else last["t"] + last["d"] + 0.2
srt = write_srt([tuple(c) for c in chunks], out_dir / f"short_{args.index + 1}.srt")
print(f"srt: {srt}")
if args.stage == "prepare":
    sys.exit(0)

# 3. Remotion: silent animation with captions. npx is a .cmd on Windows
npx = "npx.cmd" if sys.platform == "win32" else "npx"
common = [f"--props={json.dumps({'timelineFile': f'{pkg.id}/timeline.json'})}", "--gl=angle", "--log=warn"]
if args.frames:
    frames_dir = out_dir / "frames"
    subprocess.run([npx, "remotion", "render", args.composition, str(frames_dir), f"--frames={args.frames}",
                    "--image-format=png", "--sequence", *common], cwd=ROOT / "lowpoly", check=True)
    print(frames_dir)
    sys.exit(0)
silent = work / "animation.mp4"
subprocess.run([npx, "remotion", "render", args.composition, str(silent), "--muted", "--crf=21", "--pixel-format=yuv420p",
                "--concurrency=2", *common], cwd=ROOT / "lowpoly", check=True)

# 4. sound effects: soft whoosh on scene changes, cues on spoken words
starts = [0] + [sum(counts[:k]) for k in range(1, len(counts) + 1)]
events = []
if args.whoosh > 0:
    events += [(b["start"] - 0.3, "whoosh2.mp3", args.whoosh)
               for prev, b in zip(timeline["beats"], timeline["beats"][1:]) if b["visual"] != prev["visual"]]
for cue in args.cue:
    name, beat, word = cue.split(":")
    events.append((words[starts[int(beat)] + int(word)]["t"] - 0.05, name, 0.35))
fx = sfx_track(events, total, work / "sfx.wav")

# 5. final mix: voice (or silence while the voice is not recorded) + pad + SFX; video stream copied.
# The pad is pre-levelled to PAD_DB and passed as `ambience_track`, so final_mix uses a FIXED voice gain + limiter:
# no loudnorm (it pumps the pad up in the pauses, see CLAUDE.md).
if voice is None:
    voice = work / "voice_silent.wav"
    ffmpeg.run(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", f"{total:.3f}", str(voice)])
PAD_DB = -38.0  # shorts: ambience in pauses ≈ -36…-41 dB
pad_src = ROOT / "assets" / "ambience" / args.ambience
gain = PAD_DB - mean_db(pad_src)
pad = work / "pad.wav"
ffmpeg.run(["-stream_loop", "-1", "-i", str(pad_src), "-t", f"{total:.3f}", "-af",
            f"volume={gain:.2f}dB,afade=t=in:d=1,afade=t=out:st={max(total - 1.5, 0):.2f}:d=1.5", str(pad)])
final = final_mix(silent, voice, out_dir / f"short_{args.index + 1}.mp4", sfx=fx, ambience_track=pad)
print({"path": str(final), "seconds": round(ffmpeg.duration(final), 2)})
