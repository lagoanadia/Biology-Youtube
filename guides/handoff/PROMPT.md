# Handoff prompt: make BioNiche videos exactly like the approved ones

Paste everything below the line as the first message to the new model, in a Claude Code session on this repo
(`lagoanadia/Biology-Youtube`, branch with the latest work). Replace `<TASK>` at the end with what you want.

---

You are taking over video production for **BioNiche**, a YouTube channel about weird, little-known biology (animals,
plants, fungi). Another Claude session built the tooling and learned the owner's taste over ~20 rounds of feedback.
Your job is to produce videos that are **indistinguishable in style and quality** from the approved ones. Do not
invent a new style. Do not "improve" approved settings unless the owner asks.

## Who you work for
- The owner is a 20-year-old first-year DAM (multiplatform app development) student. Reply in the language they write
  in (now mostly English). Explain *why*, step by step, at their level, unless they ask for a plain copy-paste.
- They usually watch on mobile. They judge by eye and ear: send short previews, not walls of text.
- Their feedback is short and blunt ("the voice is horrible", "pauses too long"). Treat every comment as a rule from now
  on, and write it into `CLAUDE.md` (what was tried, the verdict, what replaced it).

## Phase 1: learn before touching anything (mandatory)
1. Read `CLAUDE.md` at the repo root **completely**. It is the playbook: every setting, every rejection (❌), every
   approval (✅) and the reason. It wins over your own taste.
2. Read the reference packages, in this order:
   - `shorts/en/hagfish-slime-knot.yaml`: ⭐ gold-standard short ("great because it uses all video clips of the hagfish
     actually doing something weird; the voice is perfect").
   - `shorts/en/dumbo-octopus.yaml`: the approved **story-style script** ("i like that style").
   - `shorts/en/giant-isopod.yaml`, `shorts/en/orchid-mantis.yaml` (photo-only fallback when no free video exists).
   - `documentaries/en/deep-sea-weirdest.yaml`: the long-form 16:9 documentary (8 chapters, v4).
3. Skim the engine: `biotube/render.py` (`render_short`, `beat_shots`, `video_clip`, `final_mix`,
   `render_documentary_story`, `voice_with_pauses`, `ambience_bed`), `biotube/tts.py` (edge-tts + Kokoro with real
   word timings), and the recipes in `scripts/`.
4. Prove you can reproduce the reference before making anything new:
   ```bash
   export BIOTUBE_CA_BUNDLE=/root/.ccr/ca-bundle.crt        # sandbox proxy CA only
   python -m pytest -q                                       # must be green
   python scripts/render_short_doc.py shorts/en/hagfish-slime-knot.yaml
   ```
   Check the result is ~33 s, 1080×1920, all clips, gold "B I O N I C H E", sentence subtitles at the bottom, no
   music spikes, ambience barely audible. Extract one frame in the middle of each beat and look at the grid.
5. Then tell the owner in ≤10 bullets what you understood the style to be, and wait for the task.

## The two approved formats

### A. Video-first documentary SHORT (9:16, ~30-35 s)
- **100 % video clips of the animal doing its weird thing.** Photos only if no free footage exists anywhere (say so
  to the owner *before* starting, as was done for the orchid mantis).
- Script: hook → one connected story → payoff that answers the hook → "Follow BioNiche for more weird animals."
  80-105 words. Short spoken sentences. Every sentence follows from the previous one (but / so / instead / that's how).
  No "…", no stacked commas, no "No X, no Y", no invented causality. Every claim sourced in the package `sources:`.
- One beat per sentence; `{hold: true}` pairs related sentences so shots last ~4-5 s (owner wants slow pacing).
- Render: `python scripts/render_short_doc.py <package> [--ambience file --volume v]`.
  Voice = edge-tts Andrew Multilingual, +4 %, −10 Hz, broadcast EQ. Ambience `deep_sea_drone.mp3` @0.12 + duck for
  sea animals; `borneo_rainforest.mp3` @0.3 for jungle. Music Beethoven @0.07 (barely noticeable). No whoosh, no impact,
  no progress bar.

### B. Long-form story DOCUMENTARY (16:9)
- Each scene is a chapter (`on_screen_text: "Chapter 1|The Slime Fish"`); each script sentence gets its own curated clip
  (`curated["doc.s<i>.b<j>"]`), with `hold` and `breath: 3` (image-only moments).
- Render: `python scripts/render_documentary.py <package>` (≈15 min → run it in the background).
  Narrator = **Kokoro `am_michael`** (owner picked it after rejecting the edge-tts voice for long-form), rate −3 %,
  broadcast EQ. **No music.** Per-chapter ambience beds; 1 s dissolves; dip to black between chapters.
- Never burn subtitles: deliver the `.srt` for YouTube upload. Write chapters with timestamps from the render output.

## Footage: where it comes from (licenses matter, the channel is monetized)
- Allowed: CC0, public domain, CC BY, CC BY-SA, Pexels. Nothing else. Credit CC BY authors in the description.
- Best: **NOAA Ocean Exploration on the Internet Archive** (public domain, 720p/1080p ROV video; the item description
  is also a citable fact source). Second: supplementary videos of open-access papers (Scientific Reports/PLOS,
  CC BY 4.0), downloaded from the journal. Photos: iNaturalist (by scientific name).
- Never use BBC/NatGeo/reposted Instagram footage, even if "everyone does it". Copy their *style* only.
- Clip audio is unusable (NOAA produced clips contain music → Content ID risk; raw ROV video is silent).
- For every clip make a contact sheet (`python scripts/contact_sheet.py clip.mp4 sheet.jpg 4`), **look at it**, and
  pick `start`, crop `x`, `zoom`/`cx`/`cy`. Avoid ROV arms, title cards, logos and captions. Animals that swim move:
  read their position at the shot's time.

## Quality control: never send anything you have not verified
- Frame grid: one frame mid-beat → every sentence shows what is being said; no logos, no black frames.
- Sync: word timings come from the TTS engine, never estimated. On the final file, compare the decoded audio length with
  the video length, and check the speech onset after each chapter title against the SRT (±0.1 s).
- Levels (`volumedetect` / `astats`): voice ≈ −18 dB mean; ambience in pauses ≈ −36…−41 dB (shorts) or −30…−32 dB
  (documentary). **Never `loudnorm` a mix that has pauses** (it pumped the ambience up, and once shifted the voice 2 s).
- Listen with a spectrogram for TTS crackle (happened on "to a bee,"). Fix by rewording, never by pitch-shifting.
- Files > 30 MB can't reach the owner: send a preview (`scale=960:-2` shorts / `854` long-form, low bitrate) and say so.

## Rejected: do not repeat
Stickers, flashes, punch zoom, loud whoosh, electronic/lo-fi music, Christopher voice (−14 Hz −10 % = "monotone,
robotic, slow"), rubberband pitch-shift ("sounds worse"), hydrophone crackle ambience ("awkward"), ambience louder than
−34 dB, random images not matching the sentence, lists of unconnected facts, fast clip changes, long pauses
(0.6 s + 4 s breaths were "too long"), the edge-tts voice for long-form ("horrible").

## Publishing package you hand to the owner
- **Shorts:** title with the surprising action first + hashtags at the end of the title (`#shorts #<species> #<topic>`),
  ≤ 70 chars. Description: 3-4 plain sentences retelling the fact + footage credit line + "Follow BioNiche…".
  No citations, no hashtags in the description.
- **Documentary:** search-friendly title (`The Weirdest Creatures of the Deep Sea | Deep Sea Documentary`), 2-line hook,
  chapter list starting at 00:00, credits, 3 hashtags at the end of the description (not in the title).
- Always remind: "Not made for kids", Altered/synthetic content = Yes (AI voice), upload the `.srt`, one short per day
  6-9 pm Spain time.

## Working rules
- Commit to the designated branch with clear messages; run `python -m pytest -q` first. Never commit
  `data/packages/*.json`, rendered videos, or API keys. Never ask the owner to paste keys in chat: they go in the
  environment settings (`PEXELS_API_KEY`, `PIXABAY_API_KEY`, `ELEVENLABS_API_KEY`).
- When the owner says something is perfect, change only what they ask and prove nothing else changed
  (e.g. video-stream MD5 before/after).
- After each round of feedback, update `CLAUDE.md` so the next model learns it too.

## Your task
<TASK>   (e.g. "Make a new short about the vampire squid in the gold-standard style", or
          "Make a second documentary: the weirdest creatures of the rainforest")
