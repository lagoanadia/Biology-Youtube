"""Montaje de vídeo: documental 16:9 y shorts 9:16.

Cómo se construye un vídeo (mismo esquema para ambos formatos):

  1. AUDIO   Cada bloque de texto -> TTS -> mp3. Se convierte a WAV con la
             duración exacta del bloque (voz + pausa) y se concatenan.
  2. IMAGEN  Cada bloque tiene una imagen. Pillow la recorta/compone al tamaño
             final y dibuja los rótulos en una capa transparente aparte.
  3. VÍDEO   ffmpeg aplica un zoom lento (efecto "Ken Burns") a la imagen,
             pone encima la capa de rótulos y genera un clip MUDO que dura
             exactamente lo mismo que su audio.
  4. FINAL   Se concatenan los clips, se añade la pista de voz (+ música
             opcional), se normaliza el volumen a -14 LUFS (lo que usa
             YouTube) y, en los shorts, se queman subtítulos grandes (ASS).

Separar audio y vídeo y juntarlos al final evita desincronizaciones.
"""
from __future__ import annotations

import hashlib
import random
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

from . import ffmpeg
from .config import load_config
from .media import _font, _wrap, fetch_image
from .models import VideoPackage
from .seo import build_chapters, fmt_timestamp
from .store import save_package
from .tts import synthesize

FPS = 30
DOC_SIZE = (1920, 1080)
SHORT_SIZE = (1080, 1920)
SCENE_GAP = 0.35          # pausa entre escenas (s)
END_CARD_SECONDS = 12     # YouTube permite "pantalla final" en los últimos 5-20 s
ACCENT = (255, 204, 0)


# ------------------------------------------------------------------ imágenes

def cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Recorta centrado para llenar `size` sin deformar (como CSS object-fit: cover)."""
    return ImageOps.fit(img.convert("RGB"), size, Image.LANCZOS, centering=(0.5, 0.45))


def compose_portrait(img: Image.Image) -> Image.Image:
    """Para shorts: foto horizontal centrada sobre una copia desenfocada de sí misma."""
    w, h = SHORT_SIZE
    bg = cover(img, SHORT_SIZE).filter(ImageFilter.GaussianBlur(40))
    bg = Image.blend(bg, Image.new("RGB", SHORT_SIZE, (0, 0, 0)), 0.35)
    ratio = img.width / img.height
    if ratio < 0.75:  # la foto ya es vertical: la usamos a pantalla completa
        return cover(img, SHORT_SIZE)
    fg = ImageOps.contain(img.convert("RGB"), (w, int(h * 0.62)), Image.LANCZOS)
    bg.paste(fg, ((w - fg.width) // 2, int(h * 0.40 - fg.height / 2)))
    return bg


def doc_overlay(text: str, channel: str) -> Image.Image:
    """Capa transparente: rótulo inferior (lower third) + marca del canal."""
    w, h = DOC_SIZE
    layer = Image.new("RGBA", DOC_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    if text:
        font = _font(46)
        wrapped = _wrap(draw, text, font, int(w * 0.6))
        box = draw.multiline_textbbox((0, 0), wrapped, font=font, spacing=8)
        bw, bh = box[2] - box[0] + 60, box[3] - box[1] + 40
        x, y = 80, h - bh - 90
        draw.rectangle([x, y, x + bw, y + bh], fill=(0, 0, 0, 165))
        draw.rectangle([x, y, x + 10, y + bh], fill=ACCENT + (255,))
        draw.multiline_text((x + 35, y + 18), wrapped, font=font, fill="white", spacing=8)
    draw.text((w - 60, 50), channel, font=_font(30), fill=(255, 255, 255, 170), anchor="ra")
    return layer


def short_overlay(text: str, channel: str) -> Image.Image:
    w, h = SHORT_SIZE
    layer = Image.new("RGBA", SHORT_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    if text:
        font = _font(64)
        wrapped = _wrap(draw, text.upper(), font, int(w * 0.85))
        draw.multiline_text((w / 2, 230), wrapped, font=font, fill=ACCENT, anchor="ma", align="center",
                            stroke_width=6, stroke_fill="black", spacing=10)
    draw.text((w / 2, h - 140), channel, font=_font(34), fill=(255, 255, 255, 190), anchor="ma")
    return layer


def end_card(channel: str, lang: str) -> tuple[Image.Image, Image.Image]:
    w, h = DOC_SIZE
    bg = Image.new("RGB", DOC_SIZE, (12, 40, 30))
    layer = Image.new("RGBA", DOC_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    msg = "¿Qué ser vivo quieres ver después?" if lang == "es" else "Which creature should we cover next?"
    draw.text((w / 2, 150), msg, font=_font(60), fill="white", anchor="ma")
    # Huecos donde colocar los elementos de pantalla final en YouTube Studio
    draw.rounded_rectangle([200, 380, 900, 780], 24, outline=ACCENT, width=6)
    draw.rounded_rectangle([1020, 380, 1720, 780], 24, outline=(255, 255, 255), width=6)
    draw.text((w / 2, h - 120), channel, font=_font(40), fill=ACCENT, anchor="ma")
    return bg, layer


def thumbnail(img_path: str, text: str, out: Path) -> Path:
    """Miniatura 1280x720: foto + degradado + 2-4 palabras enormes."""
    size = (1280, 720)
    base = cover(Image.open(img_path), size)
    # Máscara de degradado: oscuro a la izquierda (donde va el texto) -> transparente
    shade = Image.new("L", size)
    shade_draw = ImageDraw.Draw(shade)
    for x in range(size[0]):
        shade_draw.line([(x, 0), (x, size[1])], fill=int(max(0, 210 - x / size[0] * 380)))
    base = Image.composite(Image.new("RGB", size, (0, 0, 0)), base, shade)
    draw = ImageDraw.Draw(base)
    font = _font(110)
    wrapped = _wrap(draw, text.upper(), font, 640)
    draw.multiline_text((50, size[1] / 2), wrapped, font=font, fill=ACCENT, anchor="lm",
                        stroke_width=8, stroke_fill="black", spacing=6)
    base.save(out, quality=92)
    return out


# ------------------------------------------------------------------ ffmpeg

def still_clip(bg: Image.Image, overlay: Image.Image, seconds: float, out: Path, seed: int) -> Path:
    """Clip mudo con zoom lento sobre `bg` y `overlay` fijo encima."""
    work = out.with_suffix("")
    bg_path, ov_path = work.with_name(work.name + "_bg.jpg"), work.with_name(work.name + "_ov.png")
    bg.save(bg_path, quality=93)
    overlay.save(ov_path)
    w, h = bg.size
    frames = max(1, round(seconds * FPS))
    zoom_in = seed % 2 == 0
    z = f"1+0.07*on/{frames}" if zoom_in else f"1.07-0.07*on/{frames}"
    # Pequeño desplazamiento horizontal alterno para que no parezca siempre igual
    drift = random.Random(seed).choice([-1, 1])
    x = f"(iw-iw/zoom)/2+{drift}*(iw-iw/zoom)/2*on/{frames}"
    vf = (
        f"[0:v]scale={w * 2}:{h * 2},zoompan=z='{z}':x='{x}':y='(ih-ih/zoom)/2':d=1:s={w}x{h}:fps={FPS}[bg];"
        f"[bg][1:v]overlay=0:0,format=yuv420p[v]"
    )
    ffmpeg.run([
        "-loop", "1", "-framerate", str(FPS), "-i", str(bg_path), "-i", str(ov_path),
        "-filter_complex", vf, "-map", "[v]", "-frames:v", str(frames),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-r", str(FPS), str(out),
    ])
    return out


def pad_audio(src: Path, seconds: float, out: Path) -> Path:
    """Convierte a WAV 44.1 kHz y rellena con silencio hasta `seconds` exactos."""
    ffmpeg.run(["-i", str(src), "-af", f"apad=whole_dur={seconds:.3f}", "-t", f"{seconds:.3f}",
                "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(out)])
    return out


def silence(seconds: float, out: Path) -> Path:
    ffmpeg.run(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", f"{seconds:.3f}", "-c:a", "pcm_s16le", str(out)])
    return out


def concat(files: list[Path], out: Path, copy: bool = True) -> Path:
    listing = out.with_suffix(".txt")
    listing.write_text("".join(f"file '{f.resolve().as_posix()}'\n" for f in files), encoding="utf-8")
    ffmpeg.run(["-f", "concat", "-safe", "0", "-i", str(listing), *(["-c", "copy"] if copy else []), str(out)])
    return out


def _music_track() -> Path | None:
    """Música libre de derechos opcional: pon mp3 de la Biblioteca de audio de YouTube en assets/music/."""
    folder = Path(__file__).resolve().parent.parent / "assets" / "music"
    tracks = sorted(folder.glob("*.mp3")) if folder.exists() else []
    return random.choice(tracks) if tracks else None


def final_mix(video: Path, voice: Path, out: Path, subtitles: Path | None = None) -> Path:
    music = _music_track()
    args = ["-i", str(video), "-i", str(voice)]
    if music:
        args += ["-stream_loop", "-1", "-i", str(music)]
        audio = "[2:a]volume=0.08[m];[1:a][m]amix=inputs=2:duration=first:dropout_transition=0[mix];[mix]"
    else:
        audio = "[1:a]"
    audio += "loudnorm=I=-14:TP=-1.5:LRA=11[a]"
    if subtitles:
        sub = subtitles.resolve().as_posix().replace(":", r"\:")
        graph = f"[0:v]ass='{sub}'[v];{audio}"
        vmap, vcodec = "[v]", ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20"]
    else:
        graph, vmap, vcodec = audio, "0:v", ["-c:v", "copy"]
    ffmpeg.run([*args, "-filter_complex", graph, "-map", vmap, "-map", "[a]", *vcodec,
                "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", "-movflags", "+faststart", str(out)])
    return out


# ------------------------------------------------------------------ subtítulos

def caption_chunks(text: str, total_seconds: float, words_per_chunk: int = 3, offset: float = 0.0) -> list[tuple[float, float, str]]:
    """Trocea el texto en grupos de palabras con tiempos proporcionales a su longitud."""
    words = text.split()
    chunks = [" ".join(words[i : i + words_per_chunk]) for i in range(0, len(words), words_per_chunk)]
    total_chars = sum(len(c) + 1 for c in chunks) or 1
    t, result = offset, []
    for c in chunks:
        dur = total_seconds * (len(c) + 1) / total_chars
        result.append((t, t + dur, c))
        t += dur
    return result


def _ass_time(t: float) -> str:
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def write_ass(chunks: list[tuple[float, float, str]], out: Path, highlight_until: float = 0.0) -> Path:
    header = (
        "[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n"
        "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        "Style: Cap,DejaVu Sans,92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,7,2,2,60,60,560,1\n"
        "Style: Hook,DejaVu Sans,92,&H0000CCFF,&H0000CCFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,7,2,2,60,60,560,1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    lines = []
    for start, end, text in chunks:
        style = "Hook" if start < highlight_until else "Cap"
        clean = re.sub(r"[{}\\]", "", text).upper()
        lines.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},{style},,0,0,0,,{{\\fad(60,0)}}{clean}")
    out.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    return out


def write_srt(chunks: list[tuple[float, float, str]], out: Path) -> Path:
    def ts(t: float) -> str:
        ms = int(round(t * 1000))
        h, ms = divmod(ms, 3_600_000)
        m, ms = divmod(ms, 60_000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    blocks = [f"{i}\n{ts(a)} --> {ts(b)}\n{t}\n" for i, (a, b, t) in enumerate(chunks, 1)]
    out.write_text("\n".join(blocks), encoding="utf-8")
    return out


# ------------------------------------------------------------------ vídeos

def _h(text: str) -> str:
    return hashlib.sha1(text.encode()).hexdigest()[:10]


def render_documentary(pkg: VideoPackage, out_dir: Path, tts_provider: str | None = None) -> dict:
    cfg = load_config()
    channel, lang = cfg["channel"]["name"], pkg.language
    work = out_dir / "work_doc"
    work.mkdir(parents=True, exist_ok=True)

    clips, wavs, durations, images, srt_chunks = [], [], [], [], []
    used: set[str] = set()
    t = 0.0
    for i, scene in enumerate(pkg.documentary.scenes):
        mp3 = cfg.path("cache") / "tts" / f"{_h(scene.narration + str(tts_provider))}.mp3"
        voice_len = synthesize(scene.narration, mp3, provider=tts_provider)
        seconds = voice_len + SCENE_GAP
        img = fetch_image(scene.visual_query, exclude=used, fallback_queries=pkg.documentary.species)
        if img.get("source_url"):
            used.add(img["source_url"])
        images.append(img | {"scene": i, "query": scene.visual_query})

        bg = cover(Image.open(img["path"]), DOC_SIZE)
        clips.append(still_clip(bg, doc_overlay(scene.on_screen_text, channel), seconds, work / f"s{i:03d}.mp4", seed=i))
        wavs.append(pad_audio(mp3, seconds, work / f"s{i:03d}.wav"))
        srt_chunks += caption_chunks(scene.narration, voice_len, words_per_chunk=8, offset=t)
        durations.append(seconds)
        t += seconds
        print(f"  escena {i + 1}/{len(pkg.documentary.scenes)} ({seconds:.1f}s)")

    bg, layer = end_card(channel, lang)
    clips.append(still_clip(bg, layer, END_CARD_SECONDS, work / "end.mp4", seed=99))
    wavs.append(silence(END_CARD_SECONDS, work / "end.wav"))

    video = concat(clips, work / "video.mp4")
    voice = concat(wavs, work / "voice.wav")
    final = final_mix(video, voice, out_dir / "documentary.mp4")
    write_srt(srt_chunks, out_dir / "documentary.srt")

    key_img = next((im for im in images if im["provider"] != "placeholder"), images[0])
    thumbnail(key_img["path"], pkg.documentary_metadata.thumbnail_text, out_dir / "thumbnail.jpg")

    chapters = build_chapters([s.on_screen_text for s in pkg.documentary.scenes], durations)
    return {
        "documentary": str(final),
        "documentary_seconds": round(ffmpeg.duration(final), 2),
        "thumbnail": str(out_dir / "thumbnail.jpg"),
        "subtitles": str(out_dir / "documentary.srt"),
        "chapters": [[fmt_timestamp(a), b] for a, b in chapters],
        "chapters_seconds": chapters,
        "images": images,
    }


def render_short(pkg: VideoPackage, index: int, out_dir: Path, tts_provider: str | None = None) -> dict:
    cfg = load_config()
    short = pkg.shorts[index]
    work = out_dir / f"work_short{index + 1}"
    work.mkdir(parents=True, exist_ok=True)

    mp3 = cfg.path("cache") / "tts" / f"{_h(short.narration + 'short' + str(tts_provider))}.mp3"
    voice_len = synthesize(short.narration, mp3, short=True, provider=tts_provider)
    total = voice_len + 0.4

    queries = short.visual_queries or [pkg.documentary.species[0]]
    per_image = total / len(queries)
    clips, images, used = [], [], set()
    for j, q in enumerate(queries):
        img = fetch_image(q, exclude=used, fallback_queries=pkg.documentary.species)
        if img.get("source_url"):
            used.add(img["source_url"])
        images.append(img | {"short": index, "query": q})
        text = short.on_screen_texts[j] if j < len(short.on_screen_texts) else ""
        bg = compose_portrait(Image.open(img["path"]))
        clips.append(still_clip(bg, short_overlay(text, cfg["channel"]["name"]), per_image, work / f"i{j}.mp4", seed=index * 10 + j))

    video = concat(clips, work / "video.mp4")
    voice = pad_audio(mp3, total, work / "voice.wav")

    # Subtítulos: el gancho en amarillo, el resto en blanco
    chunks = caption_chunks(short.narration, voice_len)
    hook_share = len(short.hook) / max(len(short.narration), 1)
    ass = write_ass(chunks, work / "captions.ass", highlight_until=voice_len * hook_share)
    final = final_mix(video, voice, out_dir / f"short_{index + 1}.mp4", subtitles=ass)
    return {"path": str(final), "seconds": round(ffmpeg.duration(final), 2), "images": images}


def render_package(pkg: VideoPackage, tts_provider: str | None = None, only_shorts: bool = False) -> VideoPackage:
    out_dir = load_config().path("output") / pkg.id
    out_dir.mkdir(parents=True, exist_ok=True)
    assets = dict(pkg.assets)
    if not only_shorts:
        print(f"Renderizando documental: {pkg.documentary_metadata.title}")
        assets.update(render_documentary(pkg, out_dir, tts_provider))
    shorts = {}
    for i in range(len(pkg.shorts)):
        print(f"Renderizando short {i + 1}/{len(pkg.shorts)}")
        shorts[str(i)] = render_short(pkg, i, out_dir, tts_provider)
    assets["shorts"] = {k: v["path"] for k, v in shorts.items()}
    assets["shorts_seconds"] = {k: v["seconds"] for k, v in shorts.items()}
    assets["images"] = [im for im in assets.get("images", []) if "scene" in im] + [
        im for v in shorts.values() for im in v["images"]
    ]
    pkg.assets = assets
    contact_sheet(assets["images"], out_dir / "contact_sheet.jpg")
    save_package(pkg)
    return pkg


def contact_sheet(images: list[dict], out: Path, cols: int = 6) -> Path:
    """Mosaico con todas las imágenes elegidas y su búsqueda: revisión humana en 10 segundos."""
    tile_w, tile_h, label_h = 320, 180, 44
    rows = max(1, -(-len(images) // cols))
    sheet = Image.new("RGB", (cols * tile_w, rows * (tile_h + label_h)), (20, 20, 20))
    draw = ImageDraw.Draw(sheet)
    font = _font(15)
    for i, img in enumerate(images):
        x, y = (i % cols) * tile_w, (i // cols) * (tile_h + label_h)
        if Path(img.get("path", "")).is_file():
            sheet.paste(cover(Image.open(img["path"]), (tile_w - 4, tile_h - 4)), (x + 2, y + 2))
        else:
            draw.text((x + tile_w / 2, y + tile_h / 2), "imagen no disponible", font=font, fill="gray", anchor="mm")
        where = f"escena {img['scene'] + 1}" if "scene" in img else f"short {img.get('short', 0) + 1}"
        label = f"{where} · {img['provider']}\n{img.get('query', '')[:38]}"
        draw.multiline_text((x + 6, y + tile_h + 2), label, font=font, fill="white", spacing=2)
    sheet.save(out, quality=85)
    return out
