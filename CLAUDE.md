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
Opt-in via `editing.style: documentary` (+ `transition_seconds: 0.5`). Owner asked: more elegant, nature-documentary
feel, image **full screen**, voice **deeper and slower**. Full-bleed photos/clips (one shot per sentence, Ken Burns
zoom 0.06; low-res `fit` clips are upscaled full screen with lanczos + unsharp instead of the blurred band), dark
gradients top/bottom, letter-spaced gold "B I O N I C H E" label, Playfair Display serif title with soft shadow,
Poppins SemiBold captions (active word white, rest light gray, `\pos(540,1560)`), 4 px muted-gold progress bar.
Voice: `voice.rate_shorts: "-6%"`, `voice.pitch_shorts: "-8Hz"` (edge-tts `pitch`; non-default pitch is part of the
TTS cache key). Music/whoosh unchanged. Output to `output/<id>/documentary/` so the approved render isn't overwritten.
Context: the plant short had 79 % swipe-away (20.7 % "viewed").
