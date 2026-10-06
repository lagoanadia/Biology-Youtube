# CLAUDE.md — Producing an Apple-style ad for a note-taking app

You are making a short, premium product film for a note-taking app, in the visual language of Apple's
product ads: calm, confident, minimal, beautifully typeset, every frame intentional. This file is your
playbook. It distills what worked (and what was rejected) while producing a series of videos with an
owner who gives blunt, specific feedback. Read all of it before writing a script or a single frame.

> "Apple-like" means the **craft**, never the **brand**. Do not use Apple logos, the Apple name, product
> names (iPhone, MacBook…), "Shot on iPhone"-style taglines, Apple's SF Pro/New York fonts (their license
> limits use to Apple platforms/UI mockups), Apple's music, or footage from Apple ads. The ad must be
> unmistakably *our* app.

---

## 1. The deliverables

| Version | Size | Length | Use |
|---|---|---|---|
| Hero film | 3840×2160 or 1920×1080, 16:9, 30 or 60 fps | 30–60 s | YouTube, website, launch post |
| Vertical cut | 1080×1920, 9:16 | 15–30 s | Shorts / Reels / TikTok |
| Silent loop | 16:9 and 1:1, no voice | 6–10 s | Website hero, App Store preview |
| Stills | 1280×720 thumbnail + 3 key frames | — | Thumbnail, social |

Always produce: the final MP4 (H.264, `-crf 18`, `-movflags +faststart`), an `.srt` with the voiceover,
a frame contact sheet, and a one-paragraph description. If the file is too big to send (> 30 MB), send a
lightweight preview (`scale=960:-2`, ~600 kbps) **and say it is a preview**.

---

## 2. What "Apple-like" actually means (the rules)

1. **One idea per shot.** Each shot shows exactly one thing: a feature, a feeling, or a word. Never two.
2. **Every line of voiceover is shown on screen at that moment.** If the voice says "find any note in a
   second", the shot is the search bar finding that note *as the words are spoken*. Random B-roll was the
   single most-rejected thing in past projects.
3. **Story, not a feature list.** A list of facts sounds "random… no correlation… unnatural" (owner's words).
   Use an arc where each sentence follows from the previous one:
   *tension* (ideas get lost) → *reveal* (the app) → *but/so/instead* (how it's different) →
   *payoff* that answers the opening → *one-line CTA*.
4. **Restraint.** White (or near-black) space, one accent color, few words on screen, slow confident motion.
   Rejected in the past as "cheap": stickers, emoji pops, flashes, fast punch-in zooms, busy transitions,
   loud whooshes, yellow karaoke captions on a premium piece.
5. **The product is the hero.** Real UI, pixel-perfect, large, legible. Hands and people are optional;
   the interface carrying the story is the Apple move.
6. **Rhythm breathes.** Short ≠ fast. Hold shots long enough to read (≥ 1.5 s per word-group on screen),
   leave 2–3 s "image-only" moments after key lines, and never cut mid-word.

---

## 3. Script

- **Length:** 30 s ≈ 60–70 words; 60 s ≈ 120–140 words. Leave room for silent beats.
- **Sentences:** short, spoken, one idea each. Periods, not commas. Read it aloud.
  - ❌ "…" ellipses and stacked commas → the TTS pauses on each one and the tone goes weird.
  - ❌ Comma-less run-ons → confusing. Split them.
  - ❌ "No X, no Y" constructions → the voice gave them an odd accent.
- **Connectors carry the story:** *but, so, instead, that's how, just like, and then*.
- **Don't invent causality.** "X, so Y" only if it's true for the product.
- **Claims must be true.** Only describe features that exist and that you will show working on screen.
- **Structure template (45 s):**
  1. Hook, 0–5 s: a relatable tension, shown not told ("Your best idea. Gone by lunch.")
  2. Reveal, 5–10 s: the app appears, name + one-line promise
  3. Three feature beats, 10–35 s: each one sentence + one hero shot of the UI doing it
  4. Payoff, 35–42 s: answer the hook (the idea from the opening, found again)
  5. CTA / end card, 42–45 s: app name, one line, platform badge text (no store logos unless licensed)

Write the script as **one sentence per line**, and next to each line write the exact shot that proves it.
If you can't name the shot, cut or rewrite the line.

---

## 4. Visual language

### Typography
- Use a neutral grotesque with an open license: **Inter** (SIL OFL), or Poppins for a softer feel.
  Serif accents (e.g. **Playfair Display**, OFL) for one emotional word at most.
- Big, tight, few words: headline 120–180 px at 1080p, tracking −1 to −2 %, weight Semibold/Bold.
  Secondary text 40–56 px, Regular, 60 % opacity.
- Words appear **as they are spoken** (word-by-word or line-by-line fade + 8–12 px upward drift, 250–400 ms
  ease-out). Never bounce, never pop.

### Color and light
- Background: pure white `#FFFFFF` or near-black `#0B0B0C`; one accent from the app's brand.
- Soft shadows (large blur, low opacity), subtle depth, no gradients-for-the-sake-of-it.
- A gentle film-like finish is fine (very light grain), but the UI must stay razor sharp.

### Motion
- Easing is everything: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-expo-ish) for entrances,
  `cubic-bezier(0.65, 0, 0.35, 1)` for moves. Durations 400–900 ms. Nothing linear except slow push-ins.
- Camera feel: slow push-in (2–4 % scale over a shot), gentle parallax between UI layers, a device or
  window that floats and settles.
- **Transitions:** soft crossfades (0.3–0.6 s for ads; 1.0 s only for slow films) or match-cuts on
  motion/shape. A crossfade must **finish exactly when the next line starts** (see §7). Dip-to-black only
  between acts.
- Cursor/taps: smooth, purposeful, with a subtle press state. Typing at a believable 8–12 chars/s.

### Composition
- Center or rule-of-thirds; generous margins (≥ 8 % of width). Safe area for 9:16: keep text out of the
  top 12 % and bottom 20 % (platform UI).
- In 9:16, re-compose shots (don't just crop the 16:9 frame): stack UI vertically, scale text up.

---

## 5. How to build the shots (recommended pipeline)

The most reliable way to get Apple-grade motion with code is **HTML/CSS scenes rendered frame-by-frame**:

1. **Build each scene as an HTML page** (real app UI if it's a web app; otherwise a faithful HTML replica of
   the UI with real copy and real content — never lorem ipsum). Fonts loaded locally.
2. **Animate with the Web Animations API or CSS animations**, all paused. Drive time manually:
   ```js
   // in the page: seek every animation to time t (ms) — deterministic frames, no dropped frames
   window.seek = t => document.getAnimations().forEach(a => { a.pause(); a.currentTime = t; });
   ```
3. **Capture with Playwright** (Chromium is usually preinstalled; don't run `playwright install` if a
   managed browser exists), at the exact output size and `deviceScaleFactor` 2 for crisp text:
   ```python
   page.set_viewport_size({"width": 1920, "height": 1080})
   for f in range(frames):
       page.evaluate(f"window.seek({f * 1000 / fps})")
       page.screenshot(path=f"frames/{f:05d}.png")
   ```
4. **Encode** with ffmpeg: `ffmpeg -framerate 60 -i frames/%05d.png -c:v libx264 -crf 16 -pix_fmt yuv420p shot.mp4`
5. **Real screen recordings** (if the app runs on a device): record at native resolution, clean status bar,
   real but tidy content, then place them inside a minimal device frame you drew yourself (rounded rect +
   shadow) — not a trademarked device mockup.
6. Stock footage (people writing, desks, light) only from licenses that allow commercial use
   (CC0, public domain, CC BY with credit, Pexels/Pixabay licenses). Never use AI-generated footage presented
   as real, and never footage from other brands' ads.

---

## 6. Voice

- The voice is half the perceived quality. The owner rejected: robotic/monotone TTS, voices that are too
  slow, artificially pitched-down voices ("sounds worse"), and crackly artifacts.
- **Options, best first:**
  1. A real voice actor (best for a flagship ad).
  2. ElevenLabs (paid; free tier is non-commercial). Key in the environment as `ELEVENLABS_API_KEY`
     — never paste keys in chat or commit them.
  3. **Kokoro-82M** (Apache 2.0, runs locally on CPU, `pip install kokoro soundfile` + CPU torch).
     Owner-approved narrator: **`am_michael`** (warm, calm). Female alternative: `af_heart`.
     It returns per-token `start_ts/end_ts` → map them to your script words for exact sync.
  4. edge-tts (free, decent, word timings via `WordBoundary`), last resort for a premium ad.
- **Always generate 3–4 short samples of the same lines and let the human choose by ear.**
- Never fake depth with pitch shifting; choose a naturally deep voice instead. If you must shift with
  edge-tts, check the spectrogram: some words before a comma come out with a broken fundamental (crackle)
  → reword that sentence.
- Light "broadcast" EQ is fine: +4–5 dB around 110 Hz, −2 dB around 6.5 kHz, gentle compressor.
  It changes tone only, not timing.

---

## 7. Timing & sync (non-negotiable)

- **Use real word timings, never estimates.** Every on-screen word, cut and caption is anchored to the
  time the voice actually says it.
- A shot change happens **at the first word of its line**. A crossfade of `d` seconds therefore starts `d`
  seconds *before* that word (extend the incoming shot by `d` at its head) so the new image is fully on
  screen when the word lands.
- Breathing room: insert extra silence **at the natural gap between sentences** (cut at the midpoint
  between the last word of one sentence and the first word of the next), then shift all later word
  timings by the inserted amount. Typical ad values: 0.15–0.3 s between sentences, 1.5–2.5 s image-only
  beats after the 2–3 key lines. "Too long" pauses were rejected; so was "no air at all".
- **Verify sync on the final file**, not on the parts: decode the final audio sequentially, find the
  speech onset of each section and compare it with the subtitle/expected time (tolerance ±0.1 s).
  A past bug shifted the voice ~2 s early and nobody noticed until the owner heard a line "start in the
  middle".

---

## 8. Sound

- **Music:** for an Apple-style ad, a minimal, warm track (soft piano, light pulse, felt keys) that builds
  slightly into the payoff. It must be licensed for commercial use (CC0/royalty-free with a commercial
  license, or composed). Keep it *barely noticeable under the voice*: duck it with a sidechain on the
  voice (ratio 4–8, attack 15 ms, release 350 ms) and let it rise in image-only beats.
  Rejected in the past: "rave"-like electronic, lo-fi, music that is "too much".
- **UI sound design:** tiny, tasteful foley — key taps, a soft "swish" when a note files itself, a subtle
  chime on the payoff. Each SFX at −28 to −35 dB, never louder than the voice. Whooshes: rarely, quiet.
- **Mix levels (measure them, you can't trust your ears here):** voice ≈ −16 to −18 dB mean during speech,
  music/ambience ≈ −28 to −32 dB in pauses, peaks ≤ −1.5 dBTP.
- ⚠️ **Do not run a dynamic loudness normalizer (`loudnorm`) on the whole mix of a piece with pauses.**
  It pumps the background up to voice level in every pause, and its look-ahead shifted the voice in time.
  Instead: apply a **fixed gain** to the voice (bring its peak to −2 dB), mix, then a true-peak limiter
  (`alimiter`) at the end.
- Measure with ffmpeg `volumedetect` on: a speech stretch, the longest pauses (from the word timings),
  and the whole file (`astats` → peak level, flat factor 0 = no clipping).
- Don't reuse audio embedded in stock clips without checking it: it is often licensed music or
  interviews (spectrogram shows tonal lines + beats) → Content ID risk.

---

## 9. Quality control before you show anything

1. **Contact sheet:** one frame from the middle of every shot (or every ~1 s for a 30 s ad), labeled with
   its timestamp. Look at it. Check: the right UI state for each line, nothing cut off, no stray
   watermark/caption from a source, text inside safe areas, no typos.
2. **Sync check** (§7) on the final file.
3. **Levels check** (§8) on the final file.
4. **Spectrogram of the voice** if anything sounded odd (broken low band = TTS artifact).
5. Watch the transitions: no shot starting mid-motion, no crossfade ending after the word, no hard cut
   between acts.
6. Only then send it, with a short note: what changed, what you checked, what's still open.

---

## 10. Working with the owner (feedback style)

- Feedback is short and blunt ("cheap", "random", "too much", "robotic"). Translate each word into a
  concrete parameter change, change **only that**, and say exactly what you changed and why.
- When they say "perfect, don't touch anything else", lock it: change only what is asked and prove it
  (e.g. compare the video stream hash before/after: `ffmpeg -i f.mp4 -map 0:v -f md5 -`).
- Offer choices by ear/eye (voice samples, 2 thumbnail options), not by description.
- Be honest about limits: if a shot can't be made with licensable material, say so and propose the
  closest alternative before building it.
- Record every approval and rejection in this file (a "History" line next to the setting) so the next
  model doesn't repeat a rejected choice.

---

## 11. Settings cheat-sheet (start here, then tune)

| Parameter | Ad (30–60 s) | Why |
|---|---|---|
| Resolution / fps | 1920×1080 or 4K, 60 fps for UI motion | UI motion looks smoother at 60 |
| Shot length | 2.5–5 s | One idea per shot, readable |
| Crossfade | 0.3–0.5 s, ends on the word | Soft, never late |
| Sentence pause | 0.15–0.3 s | Breathes without dragging |
| Image-only beats | 2–3, 1.5–2.5 s each | Let the product moment land |
| Voice | real VO > ElevenLabs > Kokoro `am_michael` | Human > synthetic |
| Voice level | −16…−18 dB mean in speech | Clear on phones |
| Music level | −28…−32 dB under, rises in beats | Felt, not heard |
| Text on screen | ≤ 6 words at a time, Inter Semibold | Premium, readable |
| Effects | none flashy; push-in ≤ 4 %, parallax | Restraint = quality |

---

## 12. Rejected list (never do these)

- Random stock shots that don't show what the line says.
- Fact-list scripts; ellipses; comma-heavy or run-on sentences.
- Stickers, emoji pops, flashes, punch-in zooms, aggressive whooshes.
- Loud or energetic music under a calm voice; electronic "rave" beds.
- Monotone, robotic, too-slow, or pitch-shifted voices.
- Pauses that feel "too long"; cuts that feel "random"; voice out of sync with picture.
- Using another brand's logos, fonts, music, devices or footage.
- Sending anything without the contact sheet, sync check and level check.
