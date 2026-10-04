# CLAUDE.md — BioNiche video playbook

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

## Long-form documentary (story style, 16:9) — `documentaries/en/deep-sea-weirdest.yaml`
- Engine: `render.render_documentary_story(pkg, out_dir)`. Each `scene` = chapter (`on_screen_text` "Chapter 1|The Slime
  Fish", species in `curated["doc.s<i>"]`), each sentence = `curated["doc.s<i>.b<j>"]` clip (or `{hold: true}`).
  Sentences split with `SENTENCE_RE` → one script entry must be exactly one sentence.
- Render overrides: `editing.update(style='documentary', transition_seconds=0.6, ambience='deep_sea_drone.mp3',
  ambience_volume=0.12, ambience_duck=True)`, `voice.update(voice_en=Andrew, rate='+2%', pitch='-10Hz', broadcast_eq=True)`.
  Full render ≈ 15 min → run it in the background. 1080p file ≈ 200 MB → send a 960p ~620 kbps preview.
- Landscape shows the WHOLE frame: avoid NOAA captions/logos (2023 "ex2301" clips have a top-left logo → zoom 1.15;
  the Böni lab video has left-side captions → zoom 1.45 cx 0.66). No burned subtitles: upload the `.srt` to YouTube.
- v1 = 844 words → 5:17 (voice ≈ 160 wpm). Mid-roll ads need ≥ 8:00 → ~1,300 words.
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
