# CLAUDE.md — BioNiche video playbook

> **Since 2026-10-10 all new SHORTS are low-poly 3D animations** — go straight to "LOW-POLY 3D ANIMATION" and its
> "▶ Recipe" below. The real-footage/glass-frog notes that follow are history (still valid for documentaries).

Read this before touching any video work. It captures everything the channel owner approved
(and rejected) while building the first 12 shorts. **When in doubt, copy what the glass-frog
English shorts do** (`examples/en/glass-frog.yaml`) — they are the approved reference.

## The channel
- Name: **BioNiche** (never "BioRaro").
- Niche biology facts (animals, plants, fungi). Educational, advertiser-friendly, no gore.
- Current focus: **English** shorts + documentaries (`examples/en/*.yaml`). Spanish packages exist in `examples/*.yaml`.
- Talk to the owner in the language they write in. They are a 1st-year DAM student: explain *why*, step by step,
  unless they ask for copy-paste.

## Approved short style (DO NOT change without being asked)
These settings live in `config.yaml → editing` and were tuned through many rejected versions:

| Setting | Value | History |
|---|---|---|
| `transition` / `transition_seconds` | `fade` / `0.2` | Hard cuts felt cheap. The fade **ends exactly when the sentence starts** (see `xfade_concat`). |
| `whoosh_on` / `whoosh_volume` | `all` / `0.1` | 0.22 was too loud; "none" was missed. Keep it subtle. |
| `music_volume` | `0.07` | Must be *barely noticeable*. Beethoven Egmont excerpt (dramatic classical, CC0). Electronic 140 BPM = "rave" ❌, lo-fi ❌. |
| `punch_zoom` | `0` | Punch-in + fades looked wrong. |
| `flashes` | `false` | Too much. |
| `stickers` | `false` | "They look cheap." ❌ |
| `impact_volume` | `0.5` | Soft low hit under the hook — accepted. |
| Voice EN | `en-US-AndrewMultilingualNeural` | Voice ES: `fr-FR-RemyMultilingualNeural` (owner picked "Remy" by ear). |
| Captions | karaoke, 1-3 words, active word yellow, **pinned with `\an2\pos(540,1360)`** | Without `\pos`, libass shifts lines for 1 frame when events touch → "glitch". |

When the owner says "PERFECT, don't touch anything else": change **only** what they ask, then prove it
(e.g. compare the video stream MD5 before/after: `ffmpeg -i f.mp4 -map 0:v -f md5 -`).

## Script-writing rules (shorts)
- Structure: **hook → one fact → CTA** ("Follow BioNiche…"), 80-105 words (~26-34 s).
- **Short, clear sentences, like a person talking.** Short 4 of the frog ("In this species it's dad who babysits…") is the model.
- ❌ No "…" and no stacked commas mid-sentence: the TTS pauses on every one → "tone is weird".
- ❌ But also no comma-less run-on sentences: they become confusing. Use periods instead.
- ❌ Avoid "No X, no Y" phrasing ("No red, no outline") — the voice gave it a weird accent.
- **Tell ONE connected story, not a list of facts.** Owner: "it looks like random facts … no correlation … unnatural".
  Each sentence must follow from the previous one (mystery → reveal → *but* → *so/instead* → *that's why* → payoff
  that answers the hook). Use connectors (but, so, instead, that's how, just like). Reference: dumbo octopus v2 ✅ APPROVED ("i like that style").
- Connected ≠ invented causality: don't write "X, so Y" unless a source says so (e.g. ❌ "gliding lets it reach depths").
- Every claim must be real and sourced (sources go in the package, **not** in YouTube descriptions — the owner can't paste citations).

## Visuals: every sentence shows what is being said
The owner rejected random images. The workflow that works:
1. Split the short into `beats` (one per sentence/phrase, 9-11 per short). `" ".join(beat.text)` must equal hook+fact+cta.
2. Build candidate mosaics: `python -m biotube curate "Genus species" --source inat` or `--source openverse "query"`
   → `output/curate/<name>.jpg` (numbered) + `.json`.
3. **Look at the mosaic** (and zoom into the best ones) and pick by eye. Scientific names on iNaturalist give real photos;
   generic English words on Openverse can return junk (glass figurines, blue frogs, bowls…).
4. Write picks into the package `curated:` block: `shortN.beatM: {type: photo|clip, url, license, attribution, source_url, [start, fit]}`.
5. Render, then **extract one frame at the middle of each beat** and check the grid before sending anything.

Sources that work from this sandbox: iNaturalist API + S3 photos, Openverse (≤20 per page anonymously), Freesound previews,
Wikimedia **transcoded** video (`/transcoded/.../<file>.1080p.vp9.webm`). Wikimedia originals/API often return 429.
Only licenses allowed for monetization: CC0, PD, CC BY, CC BY-SA, Pexels (checked by `compliance.is_commercial_license`).
Video clips: Commons research videos and nature clips are great for motion beats (blood flow, trap closing, stung cockroach).
Low-res clips (≤480p) use `fit: true` (centered over a blurred copy) instead of cropping.

## Timing & sync (hard-won lessons)
- Word timings come from edge-tts `WordBoundary` events (`*.words.json` next to each mp3). Never estimate.
- `TOKEN_RE` (render.py) tokenizes text the same way the voice does. edge-tts sometimes groups tokens ("in 2020") —
  `tts.load_words` splits them. If you ever see "[aviso] las frases no cuadran con la voz", find the mismatch and fix it.
- Beat start = time of its first word; the crossfade finishes on that instant.
- edge-tts occasionally fails with `NoAudioReceived`: it is retried automatically.

## Rendering commands
```bash
export BIOTUBE_CA_BUNDLE=/root/.ccr/ca-bundle.crt   # only needed in this sandbox (proxy CA)
python -c "from biotube.store import load_package; from biotube.render import render_short; \
from biotube.config import load_config; p=load_package('examples/en/glass-frog.yaml'); \
render_short(p, 0, load_config().path('output')/p.id)"          # one short (index 0-3)
python -m biotube render examples/en/glass-frog.yaml             # whole package (doc + shorts)
python -m biotube kit <package-id>                              # copy-paste upload guide
python -m pytest -q                                             # must stay green before committing
python scripts/render_short_doc.py shorts/en/<pkg>.yaml        # gold-standard documentary short (hagfish recipe)
python scripts/render_documentary.py documentaries/en/<pkg>.yaml  # long-form v4 recipe (Kokoro am_michael)
```
- Files > 30 MB can't be sent to the owner: make a preview (`scale=960:-2`, ~330 kbps) and say so.
- Don't commit `data/packages/*.json` generated by local renders (they contain sandbox paths); delete them before committing.

## Publishing advice given to the owner
- Upload manually in YouTube Studio (OAuth `auth` didn't work for them). One short per day, ~6-9 pm Spain time.
- Descriptions: plain text + 3 hashtags (`#shorts` first), no citations. Audience "not made for kids", Altered content "Yes".
- English and Spanish should ideally live on separate channels.

## Status / next steps
- ✅ 12 English shorts rendered and approved: glass frog, Venus flytrap, emerald wasp (4 each).
- ⏭️ English documentaries for the same 3 topics, using the same per-sentence visual curation.

## TikTok "minimal" style (beauty / TikTok Shop, `tiktok/*.yaml`)
Opt-in via `editing.style: minimal` (BioNiche keeps `default`). Cream background, photo in a rounded card with soft
shadow, Poppins captions (dark gray, active word soft rose, no uppercase/outline, `\pos(540,1640)`), small dark title
(emojis stripped), 6 px rose progress bar, gentle zoom without drift. Rendered with overrides:
`cfg['channel']['name']=''; cfg['editing'].update(style='minimal', music_volume=0, whoosh_on='none', impact_volume=0)`.
Fonts: `assets/fonts/Poppins-*.ttf` (SIL OFL, passed to libass with `fontsdir`).

## "documentary" style (trial for BioNiche shorts, not yet approved)
Owner: "more elegant, like a nature documentary", image **full screen**, voice **deeper**. Then: "great, but it doesn't
feel documentary enough" → added ambience, sentence subtitles, species caption, film grade, removed social-media SFX.
Render overrides used for the plant short (`output/<id>/documentary/`, never overwrite the approved render):
```python
cfg['editing'].update(style='documentary', transition_seconds=0.6, whoosh_on='none', impact_volume=0,
                      progress_bar=False, ambience='forest_morning.mp3', ambience_volume=0.6)
cfg['voice'].update(voice_en='en-US-ChristopherNeural', rate_shorts='-10%', pitch_shorts='-14Hz', broadcast_eq=True)
```
- Visuals: full-bleed photos/clips, one shot per sentence, Ken Burns 0.06; low-res `fit` clips upscaled (lanczos+unsharp).
- Grade (final_mix): `eq=contrast=1.06:saturation=0.88:gamma=0.97,vignette=PI/5,noise=alls=3` (alls=5 → 42 MB file).
- Text: gold letter-spaced "B I O N I C H E", Playfair serif title (beat 0), italic scientific name lower-third (beat 1),
  sentence subtitles (`write_sentence_ass`, ≤7 words per line, split at a comma near the middle, `\pos(540,1640)`).
- Audio: CC0 ambience bed (`assets/ambience/`, ~18-20 dB under the voice), Beethoven at 0.07, no whoosh/impact.
  Voice EQ `BROADCAST_EQ` (+5 dB @110 Hz, -2 dB @6.5 kHz, compressor) only changes tone, so word timings stay valid.
- Context: the plant short had 79 % swipe-away (20.7 % "viewed"). Slower voice → 44 s instead of 33 s.

## ⭐ GOLD STANDARD: `shorts/en/hagfish-slime-knot.yaml` (owner: "great because it uses all video clips … of the
## hagfish actually doing something weird/cool; the voice is perfect")
- **100 % video clips, 0 photos**, and the clips show the animal *doing* its weird behaviour (slime pores, knot).
  → Only pick animals with enough free footage of the behaviour itself. If none exists (orchid mantis), say so first.
- Voice exactly as rendered there: Andrew Multilingual, `rate_shorts: +4%`, `pitch_shorts: -10Hz`, `broadcast_eq: True`.
- Documentary style, `deep_sea_drone.mp3` @0.12 + `ambience_duck`, `transition_seconds: 0.5`, ~33 s.

## Video-first shorts (owner: "more video clips than pictures, following a weird animal doing weird things")
- **Best clip source: NOAA Ocean Exploration on the Internet Archive** — ~584 deep-sea ROV videos, **public domain**,
  mostly 720p/1080p. List: `https://archive.org/advancedsearch.php?q=identifier:noaa-oe-video*&fl[]=identifier&fl[]=title&rows=2000&output=json`;
  files: `https://archive.org/metadata/<id>`; download: `https://archive.org/download/<id>/<file>`. The item description
  (NOAA's own text) is a citable source for the facts. Rich topics: sea cucumbers (12), squid, octopus/dumbo (6),
  jellies, ctenophores (6), hagfish (4, knot-tying), isopods, chimaeras, siphonophores.
- Wikimedia Commons API is 429 most of the time; `api.wikimedia.org/core/v1/commons/search/page` works if slow (≥3 s/query).
- Make a labelled contact sheet per clip (frame every 4 s) to pick `start` per sentence; avoid ROV shots, title cards, watermarks.
- Curated clips accept `x` (0-1): horizontal crop centre for the 9:16 crop (documentary style), since the animal is often off-centre.
- Only say "it" about the species named; clips of *other* species go on sentences phrased generally ("Some swimming sea cucumbers…").
- Curated clips also accept `zoom` (>1) + `cx`/`cy` (0-1 centre of interest) when the animal is tiny or sits under
  the subtitles; test a clip alone with `render.video_clip(...)` + 3 frames before re-rendering the whole short.
- **Second clip source: open-access papers.** Scientific Reports / PLOS supplementary videos are CC BY 4.0. Commons mirrors
  them but `upload.wikimedia.org` often 429s → download the same file from the journal (nature.com article page →
  `media.springernature.com/original/.../MOESM<n>_ESM.mov`). Lab footage is great for close-ups (slime, knots).
- Shorts-only packages live in `shorts/en/` (tests require `examples/**` to be full doc+4 shorts packages).
- `shorts/en/headless-chicken-monster.yaml` (Enypniastes eximia) = first video-only documentary short; ambience `deep_sea.mp3` @0.35.
- `shorts/en/hagfish-slime-knot.yaml` (Myxine glutinosa): NOAA + NIOZ + Böni et al. 2016 (CC BY 4.0). Owner loved the chicken monster one.

### Voice & ambience for video-first documentary shorts (owner feedback on the hagfish)
- Christopher -14Hz/-10% was "too monotone, robotic and slow" ❌. **Use exactly the gold-standard voice: Andrew
  Multilingual, `rate_shorts: +4%`, `pitch_shorts: -10Hz`, `broadcast_eq: True`** (hagfish "perfect", dumbo liked).
  (-6Hz was tried once on the orchid mantis after "take a higher voice"; the owner then praised -10Hz again.)
- edge-tts pitch can crackle on a word before a comma ("to a bee," → broken F0 band in the spectrogram) → **reword the
  sentence** and check its spectrogram. ❌ Don't use `pitch_semitones_post` (rubberband): "the voice sounds worse".
- Ambience: owner wants it **like the music — barely noticeable, just enough to notice at times**. Crackle/bubbles
  (hydrophone) felt "awkward" ❌ (removed), and -34 dB was "too loud" ❌. Deep sea now: `deep_sea_drone.mp3`
  (CC0 underwater drone with slow swells + rumble, low-passed) at `ambience_volume: 0.12` **with `ambience_duck: True`**
  (sidechain on the voice, ratio 4, release 800 ms): measured -36…-41 dB in pauses vs -15 dB speech.
- To verify levels without ears: `volumedetect` on the longest word gaps (from `*.words.json`) vs a speech stretch.
- `shorts/en/orchid-mantis.yaml` (Hymenopus coronatus): **no free video exists** (checked Commons, Archive, Figshare/PLOS/
  Sci Rep supplements — only lab arena clips of other flower mantids) → iNaturalist photos (CC BY/CC0) in documentary
  style. Photos also accept `x` (horizontal crop) in documentary style. Ambience `borneo_rainforest.mp3` (CC0, Borneo
  daytime) at 0.3 + duck → -39…-45 dB in pauses. Facts: O'Hanlon et al. 2014 Am Nat; Svenson et al. 2016 Sci Rep.
- Reference the owner liked: Instagram "Land Of Predator" reel (only cover visible: cinematic close-up, letterbox bars).
  Such pages repost copyrighted BBC/NatGeo footage → copy the *style* only, never the footage.
- **Pacing:** owner wants clips to change *slower*. Curated `shortN.beatM: {hold: true}` keeps the previous shot through
  that sentence (pair related sentences → ~4-5 s per shot, 7 shots in 32 s). `transition_seconds: 0.6`.
- Owner wants **more video than photos**. Pexels/Pixabay pages are Cloudflare-blocked here; the Pexels API needs a free
  key (`PEXELS_API_KEY`) the owner would have to add to the environment. Commons transcoded video works in bursts (429s).
- `shorts/en/dumbo-octopus.yaml`: 5 NOAA dumbo clips (Atlantis 2014, Key West 2019 1080p, Arctic umbrella, dive07
  Cirrothauma magna close-up, Windows to the Deep 2019). Mixed species → talk about "dumbo octopuses", species label
  `Cirrata`. No serif title (it covered the close-up head). Facts: NOAA (fins, jet propulsion abandoned, Dumbo name),
  Jamieson & Vecchione 2020 (Grimpoteuthis at 6,957 m). Pexels API keys are paused (owner checked).
- `shorts/en/giant-isopod.yaml` (Bathynomus giganteus): NOAA "Fish Head Dinner" (2019, isopod lifts a fish head and
  swims off with it, upside down) + "Giant Isopod" (Gulf of Mexico 2017, swim-in + close crawl). Story-style script.
  Swimming animals move across the frame: read their x/y on the contact sheet at the *shot's* time, not the clip start.

## 🆕 2026-10-10: shorts switch to LOW-POLY 3D ANIMATION (owner: "change the style to low poly animations,
## like Zack D. Films on YouTube")
- Scope (owner's choice): **shorts only**. Documentaries stay real NOAA footage (format B, Kokoro am_michael).
- Tool (owner's choice): **Three.js + Remotion** (code-based 3D, renders on the owner's laptop: Ryzen 3 4300U,
  7 GB RAM, integrated graphics, no Blender). Models: CC0 low-poly (Quaternius, Poly Pizza CC0) or built from primitives
  with `flatShading`. Copy Zack D. Films' *style* only, never his assets.
- The real-footage short rules above (NOAA clips, contact sheets, `x`/`zoom` crops) no longer apply to new shorts.
  Script rules (story style, 80-105 words, sourced facts, CTA) still apply.
- edge-tts (Andrew) has been down since 2026-10-10 (upstream rany2/edge-tts#490). A Kokoro am_michael version of the
  hagfish short was rendered as a sample (`output/hagfish-slime-knot/kokoro_sample/`) for the owner to judge.
  Owner then chose **"wait for Andrew"** for the comb jelly short: build the animation on planned timings now, add the
  voice when edge-tts works again (re-run without `--voice planned`; captions/scenes re-sync to the real words).
- Owner: "ok now we're working with animations, not real footage". They now send a full **brief** per short (shot list
  with times, style, captions, audio, facts). Follow it, but still fact-check it: the comb jelly brief said "it makes no
  light at all", which is false for Mnemiopsis (bioluminescent) → owner approved the corrected lines.

### Low-poly pipeline (`lowpoly/` Remotion project + `scripts/render_lowpoly.py`)
- Package = normal short YAML in `shorts/en/`; each beat's `visual` is a **scene id** of the composition
  (e.g. `lowpoly/src/combjelly/CombJellyShort.tsx`). Consecutive beats with the same id = one continuous shot.
- `python scripts/render_lowpoly.py <pkg> <CompositionId> --total 28 --pause 7:1.0 --cue shimmer.wav:6:8 ...`
  → voice + word timings → `lowpoly/public/<id>/timeline.json` → Remotion (`--gl=angle`, ~1 s/frame on the owner's
  laptop) → mix. `--frames 30,120,...` renders stills only: **always check a still per scene before a full render.**
  `--voice planned` = estimated timings (0.12 s + 0.045 s/letter per word), no narration.
- Reusable kit: `models/CombJelly.tsx` (980-triangle faceted body, 8 rows × 20 paddle plates, rainbow/lit/beat/light/
  cut/knit props), `models/Props.tsx` (jellyfish, red ❌, light ray + spectrum, ripples), `env/DeepSea.tsx`
  (gradient backdrop, fog, key + cyan rim lights, marine snow), `lib/Captions.tsx` (≤4 words/line, break at commas,
  Montserrat 800 white + dark outline, key words in rainbow letters, top 1190 px, right margin 170 px).
- Everything animates from `useCurrentFrame()`/`t` (never `useFrame` or clocks). Actions land on spoken words with
  `wordTime(tl, beat, word)`.
- 9:16 is narrow (horizontal FOV ≈ 20° at fov 35): two animals side by side need scale ~0.6 or a vertical layout.
- Audio: the deep-sea pad (`deep_sea_drone.mp3`) is pre-levelled to −38 dB and passed as `ambience_track`, so
  `final_mix` uses a fixed voice gain + limiter (no loudnorm pumping in pauses). No Beethoven when the brief asks for
  an ambient pad. SFX made by us: `scripts/make_sfx.py` (shimmer, squish); whoosh2 at 0.1 on scene changes.
- Owner asked "why is there no voice" on the planned preview → then **"add michael"**: comb jelly short voiced with
  Kokoro am_michael: `--voice kokoro --rate +7% --max-gap 0.25` (Kokoro leaves ~0.45 s between sentences and ~0.4 s
  at start/end; trimmed so 83 words + 1 s hold fit 28 s). Result: voice −18 dB, pad −40 dB in the hold.
  Don't deliver a voiceless preview again without saying so loudly up front.
- Kokoro cache gotcha: `cache_suffix` ignores the rate when pitch is +0Hz, so render_lowpoly adds `args.rate` to the
  key (otherwise a new `--rate` silently reuses the old audio).
- Short #2 low-poly: `shorts/en/brooding-octopus.yaml` → composition `Octopus` (`lowpoly/src/octopus/`), Michael +7 %,
  max-gap 0.25, 32.7 s. New reusable models: `Octopus` (pale/cup/push/swim), `Eggs` (grow/embryo/empty), `Rov`,
  `Crab`, `Shrimp`, `env/Rock`. Zack-style pop-up graphics (`Pop`: "4.5 YEARS", counters, "53 MONTHS") sit at
  top ≈ 250-330 px so they never collide with the captions.
- Thumbnails: Remotion `<Still>` per short (`CombJellyThumb`, `OctopusThumb`): whole animal visible + 2 lines of huge
  Montserrat 900 text. Owner uploads them from the YouTube mobile app.
- First stills of a new model are always too close/too big: check framing in 9:16 before the full render.
- Short #3 low-poly: `shorts/en/orca-wave-wash.yaml` → `Orca` (`lowpoly/src/orca/`), Antarctic surface env
  `env/Polar.tsx` (sky, fog, faceted water with travelling push waves via `waveHeight`), `models/PolarAnimals.tsx`
  (Orca with per-facet vertex colors, Seal weddell/crabeater, breakable IceFloe). No gore: ends with the seal in the
  water. Gotchas: Euler order — to stand an animal up, yaw in an outer group and tilt in an inner one; orca white
  belly must be a narrow ventral stripe or it reads as a penguin.
- **Fuente recomendada por el dueño (2026-10-11):** Monterey Bay Aquarium, "Deep-sea animals A to Z"
  https://www.montereybayaquarium.org/visit/exhibits/into-the-deep/deep-sea-animals-a-to-z — buen sitio para elegir
  animales, sacar datos (citar la ficha del animal en `sources:`) y referencias visuales (forma, colores, postura)
  para modelarlos en low-poly. Copiar solo la *referencia* visual, nunca sus fotos/vídeos.
- Owner queue (2026-10-11): anglerfish, basket star, droopy sea pen, Christmas tree siphonophore, owlfish —
  "render them one by one" (send each when done).
- 2026-10-11 queue delivered (each with title + description + thumbnail, as the owner asked "so I can schedule
  them"): anglerfish-fusion (`Angler`), basket-star-medusa (`Basket`), droopy-sea-pen (`SeaPen`),
  christmas-tree-siphonophore (`Siphon`), owlfish-eyes (`Owlfish`). Owner now writes in Spanish → reply in Spanish;
  scripts/titles stay in English (English channel).
- Lessons from these: long fish in 9:16 → 3/4 views, not side views; avoid repeating the same "it's a colony" angle in
  consecutive shorts; drop any number a source doesn't support ("up to 8 males", "3 m sea pen", "hundreds of polyps").
- **Visibility rules for the NEXT shorts (owner 2026-10-11: "take a note for the next generations").** The 8 shorts above
  are already scheduled — don't re-render them. Apply to every new short:
  1. **Hook card at frame 0**: big pop-up text with the hook (e.g. "HE NEVER LETS GO") on screen from 0 s, animal already
     moving / mid-action. No calm establishing shot first. (Plant short had 79 % swipe-away; target ≥ 60-70 % viewed.)
  2. **Loop ending**: end on the payoff line and make the last frame flow back into the first. Test dropping the
     "Follow BioNiche…" CTA (costs ~3 s where viewers swipe) on some shorts and compare retention.
  3. **Shorter**: aim 20-25 s (≈ 65-80 words) for some, A/B against ~32 s ones.
  4. Topic mix: alternate famous animals (searched: orca, anglerfish) with niche ones.
  5. With each short, also deliver a **pinned-comment question** (e.g. "Which deep-sea animal should we animate next?").
  6. Owner schedules 1 short/day, 6-9 pm Spain time; later link each short to the matching documentary ("Related video").
  7. Same files can go to TikTok / Instagram Reels.
  Check analytics (viewed vs swiped away, avg % viewed, subs per short) after ~10 shorts and copy what wins.
- YAML gotcha: an unquoted title with ` #shorts` is cut at the `#` (YAML comment) → always quote titles.

### 📊 Analytics of the 8 low-poly shorts (read from YouTube Studio, 2026-10-18) → data-driven rules
Channel: youtube.com/@BiologyNiche (22 subs). Retention % sampled from the Studio curve (>100 % = rewatches).
| short (age) | views | stayed to watch | avg viewed | ret@5s | @8s | @12s | @20s | end | likes |
|---|---|---|---|---|---|---|---|---|---|
| orca (6 d) | 1,703 | 48.8 % | 22/32 s (69 %) | 97 | 77 | 71 | 62 | 41 | 1.8 % |
| octopus (7 d) | 1,521 | 51.7 % | 22/33 s (67 %) | 90 | 79 | 71 | 60 | 29 | 1.7 % |
| anglerfish (5 d) | 1,316 | 39.8 % | 21/32 s (66 %) | 96 | 80 | 69 | 62 | 28 | 2.5 % |
| basket star (4 d) | 676 | 68.7 % | 18/33 s (55 %) | 93 | 71 | 60 | 45 | 17 | 2.1 % |
| comb jelly (8 d) | 320 | 56.3 % | 14/29 s (48 %) | 93 | 72 | 48 | 27 | 12 | 2.2 % |
| siphonophore (3 d) | 145 | 44.5 % | 17/35 s (49 %) | 90 | 66 | 53 | 47 | 24 | 4.1 % |
| sea pen (2 d) / owlfish (<1 d) | 1,183 / 242 | n/a yet | | | | | | | 0.3 % / 2 % |
Findings: (1) views follow **avg % viewed**, not "stayed": ~67 % → 1.3-1.7 K, ~48 % → < 350 (basket star had the best
"stayed" but weak mid-video retention → 676). (2) "Stayed to watch" is only 40-56 % → the first frame doesn't stop the
scroll (target ≥ 65 %). (3) **Every short loses 25-45 points between 3 s and 12 s** — exactly the 2nd/3rd sentence, which
is always exposition ("It's a basket star.", "It's a deep-sea anglerfish.", "In Antarctica, seals rest on floating ice").
(4) Concrete action stories (orca wave, octopus mother, male biting) hold; abstract mechanisms (light scattering, colony
anatomy) bleed (comb jelly 27 % at 20 s). (5) Famous animals > niche. (6) Shorts were scheduled at 01:00 PT = 10:00 Spain
= 4 am New York: bad for an English audience. (7) Almost no comments.
**Rules for every new short (on top of the visibility rules above):**
- Frame 0 = the climax moment (the wave hitting, the bite), already moving, + 3-5-word hook card. Never a calm intro.
- **No "It's a ___" sentence.** The name goes on screen as a small label; the 2nd sentence must escalate ("and it does
  it with ___"). Every 3-5 s a new visual surprise or pop-up number.
- First 10 s: cut/strong camera move every ~1.5-2.5 s; later shots can breathe (3-4 s).
- Script 70-80 words → 22-26 s (Michael `--rate +10%` if needed); avg viewed target ≥ 80 %.
- Concrete, visual cause→effect; if the fact is abstract, show it as an action/metaphor, don't explain physics.
- Niche animal → compare to something famous in the hook ("eyes like an owl", "named after Medusa").
- End = loop line that flows into the first frame; CTA only as on-screen text, not spoken.
- On-screen question at the end + pinned comment to get comments.
- Schedule 18:00-20:00 Spain time (12-2 pm New York), not 10:00.
- Re-check this table after the next 8 and update it.

### ▶ Recipe: make a NEW low-poly short from scratch (follow in order)
**Setup (once per machine, Windows):**
```bash
py -3.11 -m venv .venv                     # Python 3.11: kokoro/spaCy do NOT build on 3.14
.venv/Scripts/python -m pip install -r requirements.txt tzdata kokoro soundfile
cd lowpoly && npm install && cd ..         # Remotion + three + @react-three/fiber
export PYTHONIOENCODING=utf-8              # Windows console + emoji in titles
```
ffmpeg comes from `imageio-ffmpeg` (`.venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-*.exe`), no system install.

**Default voice now:** Kokoro `am_michael`, `--voice kokoro --rate +7% --max-gap 0.25` (owner said "add michael").
edge-tts Andrew was down (403) since 2026-10-10 — test it first; only switch back if the owner asks.

**Steps:**
1. **Facts**: pick the animal (Monterey Bay Aquarium A-Z page is the owner's preferred source + MBARI/NOAA/papers).
   Verify every claim; drop numbers no source supports. Note what you dropped and tell the owner.
2. **Script** (80-105 words, or 65-80 for the shorter test versions): story style, hook → connected story → payoff →
   CTA (or loop ending, see visibility rules). Count words with TOKEN_RE.
3. **Package** `shorts/en/<id>.yaml`: copy an existing one (e.g. `owlfish-eyes.yaml`). Beats = one per sentence,
   `visual` = scene id. `sources:` with what each source says. Quoted title ≤ 70 chars with `#shorts #<animal> #deepsea`,
   plain description ending "Animation: BioNiche. Follow BioNiche for more weird animals." Check
   `' '.join(beat.text) == narration`.
4. **Voice + timeline**: `python scripts/render_lowpoly.py shorts/en/<id>.yaml <Comp> --voice kokoro --rate +7%
   --max-gap 0.25 --stage prepare` → prints each beat's start/end; the actions you animate land on those times.
5. **Model(s)** in `lowpoly/src/models/` (reuse first, see catalogue below) + **scene file**
   `lowpoly/src/<animal>/<Name>Short.tsx`: copy `owlfish/OwlfishShort.tsx` — it has `CameraRig`, `Pop` (pop-up text),
   `shotAt(tl, t)` = `switch (scene.visual)` returning `{cam, light, dim, body, overlay}`, `dipAt`, captions, black end.
   Use `wordTime(tl, beat, word)` to land actions on words. Add the hook card at 0 s (visibility rule 1).
6. **Register** in `lowpoly/src/Root.tsx`: a `<Composition id="<Comp>" … defaultProps={{ timelineFile: "<id>/timeline.json" }}
   calculateMetadata={loadTimeline} />`. Then `cd lowpoly && npx tsc --noEmit` must be clean.
7. **Stills check**: `--frames <one frame per scene, ~70 % into it>` → make a grid with PIL and LOOK at it. Expect to
   fix framing 1-2 times (always too close at first; 9:16 is narrow). Re-check only the shots you changed.
8. **Full render** (~2-4 min): same command without `--stage/--frames`; add `--cue shimmer.wav:<beat>:<word>` for SFX.
9. **QC**: audio vs video length (decode both), `volumedetect` mean ≈ −18/−19 dB, 1-fps contact sheet of the final.
10. **Deliverable** (standard range, < 30 MB so it can be sent):
    `ffmpeg -i short_1.mp4 -vf "scale=in_range=pc:out_range=tv,format=yuv420p" -c:v libx264 -preset slow -crf 23
    -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart <id>.mp4`
    and copy `short_1.srt` → `<id>.srt`.
11. **Thumbnail**: `lowpoly/src/<animal>/<Name>Thumb.tsx` (copy `owlfish/OwlfishThumb.tsx`), register a `<Still>` in
    Root, `npx remotion still <Name>Thumb ../output/<id>/lowpoly/<id>_thumbnail.png --gl=angle`. Whole animal visible
    (3/4 view for long animals) + 2 lines of huge text that don't cover the animal.
12. **Send** with SendUserFile: mp4 + srt + thumbnail, and in the message: title, description, pinned-comment
    question, upload reminders (Not made for kids, Altered content = Yes, upload .srt, 6-9 pm Spain time).
13. Add a line here (what was made, what the owner said), then commit when the owner asks.

**Model catalogue (`lowpoly/src/models/`, all props driven by `t`):** `CombJelly`, `Props` (Jellyfish, RedX, LightRay,
Ripples), `Octopus` (pale/cup/push/swim — also baby octopuses), `Eggs`, `Rov` (lights + beams), `Critters` (Crab,
Shrimp), `PolarAnimals` (Orca, Seal weddell/crabeater, IceFloe crack), `Angler` (FemaleAngler with glowing lure/halo,
MaleAngler fused, ImmuneCell), `BasketStar` (recursive branching arms open/writhe/grow/roll, HookedBranch, Copepod),
`SeaPen` (grow/bud/bend/swell/feed/pump), `Siphonophore` (pulse/spin/sting/broken/feed), `Owlfish` (eyeGlow) + `Owl`.
Environments: `env/DeepSea` (backdrop, lights, marine snow), `env/Rock` (outcrop + floor), `env/Polar` (sky, water,
push waves). Helpers: `lib/lowpoly.ts` (rng, facet, taperedTube, pop/glide easing, rainbow), `lib/timeline.ts`,
`lib/Captions.tsx`.

## Long-form documentary (story style, 16:9) — `documentaries/en/deep-sea-weirdest.yaml`
- Engine: `render.render_documentary_story(pkg, out_dir)`. Each `scene` = chapter (`on_screen_text` "Chapter 1|The Slime
  Fish", species in `curated["doc.s<i>"]`), each sentence = `curated["doc.s<i>.b<j>"]` clip (or `{hold: true}`).
  Sentences split with `SENTENCE_RE` → one script entry must be exactly one sentence.
- Render overrides: `editing.update(style='documentary', transition_seconds=0.6, ambience='deep_sea_drone.mp3',
  ambience_volume=0.12, ambience_duck=True)`, `voice.update(voice_en=Andrew, rate='+2%', pitch='-10Hz', broadcast_eq=True)`.
  Full render ≈ 15 min → run it in the background. 1080p file ≈ 200 MB → send a 960p ~620 kbps preview.
- Landscape shows the WHOLE frame: avoid NOAA captions/logos (2023 "ex2301" clips have a top-left logo → zoom 1.15;
  the Böni lab video has left-side captions → zoom 1.45 cx 0.66). No burned subtitles: upload the `.srt` to YouTube.
- v1 = 844 words → 5:17. v3 (pauses + breaths + lead-ins, rate -3%) = 7:47 with the same words. Mid-roll ads need ≥ 8:00.
- **v2 feedback (owner): "add fitting ambience; music not necessary; slow down — this is a video, not a short".**
  → No music (`music_volume=0`), voice `rate='-3%'`, dissolves `transition_seconds=1.0`, `doc_lead` 2.5 s (3.0 intro) of
  image + ambience before the narrator speaks, `doc_sentence_pause` 0.6 s extra after every sentence
  (`voice_with_pauses` cuts at the mid-point of the natural gap and shifts word times → clips/SRT stay in sync).
- Ambience per chapter: `curated["doc.s<i>"]["ambience"] = [{file, db, from, to}]` (db = target mean level, negative
  from/to = seconds from the chapter end), `doc.end` for the end card. Intro: waves → underwater; seafloor chapters:
  drone + rumble; open water: `underwater_open.mp3`; ending: back to the waves.
- ⚠️ Never `loudnorm` the whole mix when there are pauses: it pumps the ambience up to voice level (measured −15 dB).
  With `ambience_track`, `final_mix` normalizes only the voice and ends with `alimiter`. Target: voice ≈ −18 dB,
  ambience in pauses ≈ −30…−32 dB.
- **v3 feedback: "audio random, cuts in between"; "let the real clip sound play; 5-6 s scenes of just the clip".**
  → Chapters now dip to black (0.8 s fade out/in); curated `{..., breath: 4}` on a sentence = seconds of image only
  (no narrator) after it, ambience rises as the duck releases (~11 breaths, 47 s in total).
  → ❌ Original clip audio is NOT usable: NOAA "produced" clips carry background music (tonal lines + beats in the
  spectrogram, possible Content ID) or interviews; the rest are silent (−91 dB). ROVs don't record sea sound.
- **v4 feedback: "chapter 1 starts mid-sentence"; "pauses and breaks too long"; "voice is horrible".**
  → BUG: `loudnorm` on the voice inside `final_mix` shifted the narration ~2.2 s EARLY vs the picture and dropped 12 s
  of audio (decoded audio 454.8 s vs video 467.1 s). Now a FIXED gain (voice peak → −2 dB). Always verify sync by
  decoding the final audio sequentially and comparing a chapter's speech onset with the SRT time.
  → Pacing trimmed: `doc_sentence_pause` 0.3, `doc_lead` 1.5 (2.0 intro), 6 breaths of 3 s.
  → Voices: Kokoro-82M (Apache 2.0, local CPU, `pip install kokoro`, gives per-word start_ts/end_ts) samples sent:
  am_michael, am_fenrir, bm_george, bm_fable. Paid alternative: ElevenLabs (API key in env).
- ✅ Owner picked **Kokoro `am_michael`** for the documentary. `voice.provider='kokoro'`, `voice_en='am_michael'`,
  `rate='-3%'` (→ speed 0.97), `broadcast_eq=True`. `tts._synth_kokoro` maps Kokoro tokens to TOKEN_RE words
  (all 8 chapters align 1:1). Render overrides: `doc_sentence_pause=0.3, doc_lead=1.5, doc_lead_intro=2.0, doc_tail=1.2`.
