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
import math
import random
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from . import ffmpeg
from .config import load_config
from .media import _font, _wrap, fetch_clip, fetch_image
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
PUNCH_FRAMES = 6
# Ecualización "de locutor": +5 dB a 110 Hz (pecho), algo de cuerpo a 250 Hz, eses más suaves y compresión
BROADCAST_EQ = ("equalizer=f=110:t=q:w=1:g=5,equalizer=f=250:t=q:w=1:g=1.5,equalizer=f=6500:t=q:w=2:g=-2,"
                "acompressor=threshold=0.08:ratio=3:attack=5:release=120:makeup=2")


# ------------------------------------------------------------------ imágenes

def _edit(key: str, default):
    """Parámetro de intensidad de edición (config.yaml -> editing)."""
    return (load_config().get("editing") or {}).get(key, default)


def cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Recorta centrado para llenar `size` sin deformar (como CSS object-fit: cover)."""
    return ImageOps.fit(img.convert("RGB"), size, Image.LANCZOS, centering=(0.5, 0.45))


FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
# Estilo "minimal" (editing.style): fondo crema, foto en tarjeta, texto gris oscuro y acento rosa suave
MIN_BG, MIN_INK, MIN_ACCENT = (245, 240, 235), (40, 40, 40), (214, 112, 128)
CARD_BOX = (80, 360, 1000, 1420)  # x0, y0, x1, y1 de la tarjeta con la foto
EMOJI_RE = re.compile("[\u2600-\u27BF\uFE0F\U0001F000-\U0001FFFF]")


# Estilo "documentary": imagen a pantalla completa con zoom lento, degradados oscuros arriba/abajo,
# título con serifa, marca espaciada arriba y subtítulos blancos
DOC_GOLD = (200, 180, 140)


def minimal() -> bool:
    return _edit("style", "default") == "minimal"


def documentary() -> bool:
    return _edit("style", "default") == "documentary"


def _serif(size: int, weight: str = "SemiBold") -> ImageFont.FreeTypeFont:
    path = FONTS_DIR / "PlayfairDisplay.ttf"
    if not path.exists():
        return _font(size)
    font = ImageFont.truetype(str(path), size)
    font.set_variation_by_name(weight)
    return font


def _min_font(size: int, weight: str = "SemiBold") -> ImageFont.FreeTypeFont:
    path = FONTS_DIR / f"Poppins-{weight}.ttf"
    return ImageFont.truetype(str(path), size) if path.exists() else _font(size)


def compose_card(img: Image.Image) -> Image.Image:
    """Estilo minimal: la foto en una tarjeta con esquinas redondeadas y sombra suave sobre fondo liso."""
    x0, y0, x1, y1 = CARD_BOX
    bg = Image.new("RGB", SHORT_SIZE, MIN_BG)
    # Sombra: rectángulo oscuro semitransparente, desenfocado y algo desplazado hacia abajo
    shadow = Image.new("RGBA", SHORT_SIZE, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([x0, y0 + 18, x1, y1 + 18], 44, fill=(0, 0, 0, 55))
    bg.paste(shadow.filter(ImageFilter.GaussianBlur(28)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(28)))
    photo = cover(img, (x1 - x0, y1 - y0))
    mask = Image.new("L", photo.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, photo.width - 1, photo.height - 1], 44, fill=255)
    bg.paste(photo, (x0, y0), mask)
    return bg


def compose_portrait(img: Image.Image) -> Image.Image:
    """Para shorts: foto horizontal centrada sobre una copia desenfocada de sí misma."""
    if minimal():
        return compose_card(img)
    if documentary():  # pantalla completa, sin fondo desenfocado
        return cover(img, SHORT_SIZE)
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

def still_clip(bg: Image.Image, overlay: Image.Image, seconds: float, out: Path, seed: int, zoom: float = 0.07,
               punch: bool = False) -> Path:
    """Clip mudo con zoom lento sobre `bg` y `overlay` fijo encima."""
    work = out.with_suffix("")
    bg_path, ov_path = work.with_name(work.name + "_bg.jpg"), work.with_name(work.name + "_ov.png")
    bg.save(bg_path, quality=93)
    overlay.save(ov_path)
    w, h = bg.size
    frames = max(1, round(seconds * FPS))
    zoom_in = seed % 2 == 0
    z = f"1+{zoom}*on/{frames}" if zoom_in else f"{1 + zoom}-{zoom}*on/{frames}"
    punch_amount = _edit("punch_zoom", 0.08)
    if punch and punch_amount:  # "punch-in": entra con zoom y se asienta en 6 fotogramas (0,2 s)
        z = (f"if(lt(on,{PUNCH_FRAMES}),{1 + punch_amount}-{punch_amount}*on/{PUNCH_FRAMES},"
             f"{z.replace('on', f'(on-{PUNCH_FRAMES})')})")
    # Pequeño desplazamiento horizontal alterno para que no parezca siempre igual
    drift = 0 if minimal() else random.Random(seed).choice([-1, 1])
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


def video_clip(src: str, overlay: Image.Image, seconds: float, size: tuple[int, int], out: Path, start: float = 0.0,
               punch: bool = False, fit: bool = False, focus: float = 0.5, zoom: float = 1.0,
               center: tuple[float, float] = (0.5, 0.5), overlay_until: float | None = None) -> Path:
    """Clip mudo a partir de un vídeo de stock: recorte a `size`, 30 fps y rótulos encima.
    `focus` (0 = izquierda, 1 = derecha) dice dónde recortar si el animal no está centrado.
    `zoom` > 1 acerca la imagen alrededor de `center` (x, y en 0-1) cuando el animal se ve muy pequeño."""
    ov_path = out.with_name(out.stem + "_ov.png")
    overlay.save(ov_path)
    w, h = size
    amount = _edit("punch_zoom", 0.08)
    punch_f = (f",zoompan=z='if(lt(on,{PUNCH_FRAMES}),{1 + amount}-{amount}*on/{PUNCH_FRAMES},1)'"
               f":x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s={w}x{h}:fps={FPS}") if punch and amount else ""
    pre = ""
    if zoom > 1:  # recorte previo alrededor del animal (las comas de las expresiones van escapadas: \\,)
        cx, cy = center
        pre = (f"crop=iw/{zoom}:ih/{zoom}:max(0\\,min(iw-iw/{zoom}\\,iw*{cx}-iw/{zoom}/2)):"
               f"max(0\\,min(ih-ih/{zoom}\\,ih*{cy}-ih/{zoom}/2)),")
    if documentary():  # estilo documental: SIEMPRE a pantalla completa (ampliado con nitidez)
        base = (f"[0:v]{pre}scale={w}:{h}:force_original_aspect_ratio=increase:flags=lanczos,"
                f"crop={w}:{h}:(iw-{w})*{focus}:(ih-{h})/2,unsharp=5:5:0.6,fps={FPS},setsar=1{punch_f}[v0];")
    elif fit:  # clip de baja resolución: centrado a lo ancho sobre una copia desenfocada (como las fotos)
        base = (f"[0:v]fps={FPS},split[a][b];[a]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
                f"boxblur=25:2,eq=brightness=-0.12[bg];[b]scale={w}:-2[fg];"
                f"[bg][fg]overlay=0:(H-h)*0.4,setsar=1{punch_f}[v0];")
    else:
        base = f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps={FPS},setsar=1{punch_f}[v0];"
    ov = "[1:v]"
    if overlay_until:  # rótulo que aparece y desaparece con fundido (títulos de capítulo)
        base += (f"[1:v]format=rgba,fade=t=in:st=0.5:d=0.8:alpha=1,"
                 f"fade=t=out:st={max(overlay_until - 0.8, 1.4):.2f}:d=0.8:alpha=1[ov];")
        ov = "[ov]"
    vf = (base +
          f"[v0]{ov}overlay=0:0,format=yuv420p[v]")
    ffmpeg.run(["-ss", f"{start:.2f}", "-stream_loop", "-1", "-i", src, "-loop", "1", "-framerate", str(FPS),
                "-i", str(ov_path), "-filter_complex", vf,
                "-map", "[v]", "-t", f"{seconds:.3f}", "-an", "-c:v", "libx264", "-preset", "veryfast",
                "-crf", "20", "-r", str(FPS), str(out)])
    return out


def clip_preview(clip: dict) -> dict:
    """Guarda un fotograma del clip para la hoja de contactos."""
    frame = Path(clip["clip"]).with_suffix(".jpg")
    if not frame.exists():
        ffmpeg.run(["-ss", "1", "-i", clip["clip"], "-frames:v", "1", "-vf", "scale=640:-2", str(frame)])
    return clip | {"path": str(frame)}


def xfade_concat(files: list[Path], lengths: list[float], out: Path, transition: str, d: float) -> Path:
    """Une planos con un fundido rápido entre cada par (xfade).

    Cada plano (menos el primero) viene alargado `d` segundos por delante: el fundido
    ocupa los `d` segundos ANTERIORES al corte y termina justo cuando empieza la frase,
    así la imagen nueva ya está entera en su palabra y el total dura lo mismo que la voz.
    """
    if len(files) == 1 or transition == "cut" or d <= 0:
        return concat(files, out)
    args = []
    for f in files:
        args += ["-i", str(f)]
    chains, last, acc = [], "0:v", 0.0
    for i in range(1, len(files)):
        acc += lengths[i - 1] - d  # instante del corte i
        label = f"x{i}"
        chains.append(f"[{last}][{i}:v]xfade=transition={transition}:duration={d:.3f}:offset={acc:.3f}[{label}]")
        last = label
    ffmpeg.run([*args, "-filter_complex", ";".join(chains), "-map", f"[{last}]", "-c:v", "libx264",
                "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS), str(out)])
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


def final_mix(video: Path, voice: Path, out: Path, subtitles: Path | None = None, progress_bar: float | None = None,
              sfx: Path | None = None, flashes: list[float] | None = None, ambience_track: Path | None = None) -> Path:
    """Mezcla final.

    - `progress_bar`: duración total -> barra amarilla que avanza abajo (shorts).
    - `sfx`: pista de efectos de sonido ya montada (whooshes, pops...).
    - `flashes`: instantes (s) de los cortes -> destello blanco de 2 fotogramas.
    La música (assets/music) baja sola cuando habla la voz ("ducking" con sidechaincompress).
    """
    music = _music_track() if _edit("music_volume", 0.06) > 0 else None
    args = ["-i", str(video), "-i", str(voice)]
    # la voz se usa 3 veces: en la mezcla, como "llave" de la música y como llave del ambiente
    parts, mix_inputs = ["[1:a]asplit=3[vo][key][akey]"], ["[vo]"]
    n = 2
    ambience = ambience_track or Path(__file__).resolve().parent.parent / "assets" / "ambience" / str(_edit("ambience", ""))
    if ambience_track:  # ambiente ya montado y nivelado (documental largo): sin bucle ni volumen extra
        parts.append(f"[{n}:a]anull[amb]")
        args += ["-i", str(ambience_track)]
        if _edit("ambience_duck", False):  # documental: se aparta un poco para la voz, sin desaparecer
            parts.append("[amb][akey]sidechaincompress=threshold=0.05:ratio=2:attack=80:release=1200[ambd]")
            mix_inputs.append("[ambd]")
        else:
            parts.append("[akey]anullsink")
            mix_inputs.append("[amb]")
        n += 1
    elif _edit("ambience", "") and ambience.is_file():  # sonido de naturaleza de fondo (pájaros, viento, insectos)
        total = ffmpeg.duration(voice)
        args += ["-stream_loop", "-1", "-i", str(ambience)]
        parts.append(f"[{n}:a]volume={_edit('ambience_volume', 0.25)},afade=t=in:d=1,"
                     f"afade=t=out:st={max(total - 1.5, 0):.2f}:d=1.5[amb]")
        if _edit("ambience_duck", False):  # baja mientras habla la voz y vuelve despacio en las pausas
            parts.append("[amb][akey]sidechaincompress=threshold=0.03:ratio=4:attack=40:release=800[ambd]")
            mix_inputs.append("[ambd]")
        else:
            parts.append("[akey]anullsink")
            mix_inputs.append("[amb]")
        n += 1
    else:
        parts.append("[akey]anullsink")
    if music:
        total = ffmpeg.duration(voice)
        args += ["-ss", str(_edit("music_start", 0)), "-stream_loop", "-1", "-i", str(music)]
        # fundidos de entrada/salida: la música "está" sin que se note cuándo empieza o acaba
        parts.append(f"[{n}:a]volume={_edit('music_volume', 0.07)},afade=t=in:d=1.5,"
                     f"afade=t=out:st={max(total - 2, 0):.2f}:d=2[mraw];"
                     "[mraw][key]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=350[m]")
        mix_inputs.append("[m]")
        n += 1
    else:
        parts.append("[key]anullsink")
    if sfx:
        args += ["-i", str(sfx)]
        parts.append(f"[{n}:a]volume=0.9[fx]")
        mix_inputs.append("[fx]")
        n += 1
    if ambience_track:
        # Documental: se normaliza SOLO la voz; al final solo un limitador. Un loudnorm sobre la mezcla subiría el
        # ambiente en las pausas (sube lo que está bajo) y sonaría tan alto como el narrador.
        parts[0] = parts[0].replace("[1:a]asplit=3", "[1:a]loudnorm=I=-15:TP=-2:LRA=7,asplit=3")
        tail = "[mix]alimiter=limit=0.89:level=disabled[a]"
    else:
        tail = "[mix]loudnorm=I=-14:TP=-1.5:LRA=11[a]"
    audio = ";".join(parts) + ";" + "".join(mix_inputs) + (
        f"amix=inputs={len(mix_inputs)}:duration=first:normalize=0[mix];{tail}")

    if subtitles:
        sub = subtitles.resolve().as_posix().replace(":", r"\:")
        fonts = FONTS_DIR.as_posix().replace(":", r"\:")
        # etalonaje de cine (estilo documentary): menos saturación, algo de contraste, viñeta y grano de película
        grade = "eq=contrast=1.06:saturation=0.88:gamma=0.97,vignette=PI/5,noise=alls=3:allf=t," if documentary() else ""
        chain = f"[0:v]{grade}ass='{sub}':fontsdir='{fonts}'[s0];"
        last = "s0"
        if flashes:
            cond = "+".join(f"between(t,{t:.3f},{t + 0.066:.3f})" for t in flashes)
            chain += (f"color=c=white:s=1080x1920:r={FPS},format=rgba,colorchannelmixer=aa=0.55[fl];"
                      f"[{last}][fl]overlay=enable='{cond}':shortest=1[s1];")
            last = "s1"
        if progress_bar:
            d = f"{progress_bar:.3f}"
            color, height = ("0x%02X%02X%02X" % MIN_ACCENT, 6) if minimal() else \
                ("0x%02X%02X%02X" % DOC_GOLD, 4) if documentary() else ("0xFFCC00", 12)
            chain += (f"color=c={color}:s=1080x{height}:d={d}:r={FPS}[bar];"
                      f"[{last}][bar]overlay=x='-w+w*t/{d}':y=H-h:shortest=1[v];")
        else:
            chain += f"[{last}]null[v];"
        graph = chain + audio
        vmap, vcodec = "[v]", ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20"]
    else:
        graph, vmap, vcodec = audio, "0:v", ["-c:v", "copy"]
    ffmpeg.run([*args, "-filter_complex", graph, "-map", vmap, "-map", "[a]", *vcodec,
                "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", "-movflags", "+faststart", str(out)])
    return out


def sfx_track(events: list[tuple[float, str, float]], total: float, out: Path) -> Path | None:
    """Monta una pista de efectos: events = [(segundo, fichero en assets/sfx, volumen)]."""
    folder = Path(__file__).resolve().parent.parent / "assets" / "sfx"
    events = [(t, folder / name, vol) for t, name, vol in events if (folder / name).exists()]
    if not events:
        return None
    args, chains = [], []
    for i, (t, path, vol) in enumerate(events):
        args += ["-i", str(path)]
        ms = max(int(t * 1000), 0)
        chains.append(f"[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,volume={vol},adelay={ms}:all=1[e{i}]")
    graph = ";".join(chains) + ";" + "".join(f"[e{i}]" for i in range(len(events))) + \
        f"amix=inputs={len(events)}:normalize=0:duration=longest,apad=whole_dur={total:.3f},atrim=0:{total:.3f}[a]"
    ffmpeg.run([*args, "-filter_complex", graph, "-map", "[a]", "-c:a", "pcm_s16le", str(out)])
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


DOC_SHOT_SECONDS = 5.5    # en el documental, un plano nuevo cada ~5,5 s


def scene_images(query: str, n: int, fallback: list[str], used: set[str]) -> list[dict]:
    """Hasta n imágenes distintas para una escena (sin repetir las ya usadas en el vídeo)."""
    shots: list[dict] = []
    for _ in range(n):
        img = fetch_image(query, exclude=used, fallback_queries=fallback)
        if img["provider"] == "placeholder" or img.get("source_url") in used:
            break
        used.add(img["source_url"])
        shots.append(img)
    return shots or [fetch_image(query, fallback_queries=fallback)]


def srt_from_words(words: list[dict], offset: float = 0.0, max_words: int = 7) -> list[tuple[float, float, str]]:
    """Subtítulos .srt con los tiempos reales de la voz (bloques de hasta 7 palabras)."""
    chunks = []
    for group in word_groups(words, max_words=max_words, pause=0.35):
        start = group[0]["t"] + offset
        end = group[-1]["t"] + group[-1]["d"] + offset
        chunks.append((start, end, " ".join(w["w"] for w in group)))
    return chunks


def render_documentary(pkg: VideoPackage, out_dir: Path, tts_provider: str | None = None) -> dict:
    cfg = load_config()
    channel, lang = cfg["channel"]["name"], pkg.language
    work = out_dir / "work_doc"
    work.mkdir(parents=True, exist_ok=True)

    from .tts import load_words, voice_for

    voice_name, _ = voice_for(short=False, lang=lang)
    clips, wavs, durations, images, srt_chunks = [], [], [], [], []
    used: set[str] = set()
    t = 0.0
    for i, scene in enumerate(pkg.documentary.scenes):
        mp3 = cfg.path("cache") / "tts" / f"{_h(scene.narration + voice_name + str(tts_provider))}.mp3"
        voice_len = synthesize(scene.narration, mp3, provider=tts_provider, lang=lang)
        seconds = voice_len + SCENE_GAP

        # Varios planos por escena (uno cada ~DOC_SHOT_SECONDS) para que la imagen no se quede quieta
        n_shots = max(1, round(seconds / DOC_SHOT_SECONDS))
        shots = scene_images(scene.visual_query, n_shots, pkg.documentary.species, used)
        for img in shots:
            images.append(img | {"scene": i, "query": scene.visual_query})
        overlay = doc_overlay(scene.on_screen_text, channel)
        clip = fetch_clip(scene.visual_query, exclude=used)
        if clip:
            used.add(clip["source_url"])
            images.append(clip_preview(clip) | {"scene": i, "query": scene.visual_query})
        for j in range(n_shots):
            path = work / f"s{i:03d}_{j}.mp4"
            if clip and j == 0:  # primer plano de la escena en vídeo, el resto fotos
                clips.append(video_clip(clip["clip"], overlay, seconds / n_shots, DOC_SIZE, path))
                continue
            img = shots[j % len(shots)]
            bg = cover(Image.open(img["path"]), DOC_SIZE)
            clips.append(still_clip(bg, overlay, seconds / n_shots, path, seed=i * 7 + j, zoom=0.09))
        wavs.append(pad_audio(mp3, seconds, work / f"s{i:03d}.wav"))
        srt_chunks += srt_from_words(load_words(mp3), offset=t)
        durations.append(seconds)
        t += seconds
        print(f"  escena {i + 1}/{len(pkg.documentary.scenes)} ({seconds:.1f}s, {n_shots} planos)")

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


def doc_chapter_overlay(title: str, species: str, channel: str, intro: bool = False) -> Image.Image:
    """Rótulo de capítulo 16:9: "CHAPTER 1" espaciado en dorado + título con serifa + especie en cursiva.
    `title` = "Chapter 1|The slime fish". En la intro (`intro=True`), título grande centrado."""
    w, h = DOC_SIZE
    layer = Image.new("RGBA", DOC_SIZE, (0, 0, 0, 0))
    kicker, _, name = title.partition("|") if "|" in title else ("", "", title)
    shade = Image.new("L", (w, h))
    sd = ImageDraw.Draw(shade)
    for y in range(h):  # degradado oscuro abajo (o entero en la intro) para leer el texto
        a = 120 if intro else max(0, (y - h * 0.45) / (h * 0.55)) * 200
        sd.line([(0, y), (w, y)], fill=int(a))
    layer.putalpha(shade)

    def texts(draw, color=None):
        if intro:
            if channel:
                draw.text((w / 2, h / 2 - 150), " ".join(channel.upper()), font=_min_font(30, "Medium"),
                          fill=color or DOC_GOLD, anchor="ma")
            draw.multiline_text((w / 2, h / 2 - 80), _wrap(draw, name, _serif(92), int(w * 0.7)), font=_serif(92),
                                fill=color or "white", anchor="ma", align="center", spacing=10)
            return
        x, y = 110, h - 330
        if kicker:
            draw.text((x, y), " ".join(kicker.upper()), font=_min_font(28, "Medium"), fill=color or DOC_GOLD)
            draw.line([(x, y + 52), (x + 90, y + 52)], fill=color or DOC_GOLD, width=3)
        draw.text((x, y + 72), name, font=_serif(84), fill=color or "white")
        if species:
            path = FONTS_DIR / "PlayfairDisplay-Italic.ttf"
            font = ImageFont.truetype(str(path), 44) if path.exists() else _serif(44)
            draw.text((x + 2, y + 190), species, font=font, fill=color or (230, 225, 215))

    glow = Image.new("RGBA", DOC_SIZE, (0, 0, 0, 0))
    texts(ImageDraw.Draw(glow), (0, 0, 0, 200))
    layer = Image.alpha_composite(layer, glow.filter(ImageFilter.GaussianBlur(8)))
    texts(ImageDraw.Draw(layer))
    return layer


def doc_end_card(channel: str) -> tuple[Image.Image, Image.Image]:
    """Pantalla final 16:9 en estilo documental (fondo negro, serifa, marca dorada)."""
    w, h = DOC_SIZE
    bg = Image.new("RGB", DOC_SIZE, (8, 10, 14))
    layer = Image.new("RGBA", DOC_SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text((w / 2, 150), " ".join(channel.upper()), font=_min_font(32, "Medium"), fill=DOC_GOLD, anchor="ma")
    d.text((w / 2, 230), "Thanks for watching", font=_serif(80), fill="white", anchor="ma")
    for box in ([200, 420, 900, 820], [1020, 420, 1720, 820]):  # huecos para la pantalla final de YouTube
        d.rounded_rectangle(box, 18, outline=(120, 110, 90), width=3)
    return bg, layer


def _empty_ass(out: Path, size: tuple[int, int]) -> Path:
    """ASS sin eventos: sirve para pasar por la cadena de final_mix (etalonaje) sin quemar subtítulos."""
    out.write_text(f"[Script Info]\nScriptType: v4.00+\nPlayResX: {size[0]}\nPlayResY: {size[1]}\n\n"
                   "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, "
                   "BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, "
                   "Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
                   "Style: Default,Poppins Medium,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,"
                   "1,0,0,2,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, "
                   "Effect, Text\n", encoding="utf-8")
    return out


SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")
AMBIENCE_DIR = Path(__file__).resolve().parent.parent / "assets" / "ambience"
_LEVELS: dict[str, float] = {}


def mean_db(path: Path) -> float:
    """Volumen medio (dB) de un audio, para nivelar capas de ambiente distintas."""
    key = str(path)
    if key not in _LEVELS:
        err = ffmpeg.run_capture(["-i", str(path), "-af", "volumedetect", "-f", "null", "-"])
        _LEVELS[key] = float(re.search(r"mean_volume: ([-0-9.]+)", err).group(1))
    return _LEVELS[key]


def ambience_bed(layers: list[dict], seconds: float, out: Path) -> Path:
    """Cama de ambiente de un capítulo. Cada capa: {file, db (nivel medio deseado), from, to} en segundos del
    capítulo; se repite en bucle, entra y sale con fundidos de 2 s. Todo a 48 kHz estéreo."""
    args, chains, labels = [], [], []
    for k, layer in enumerate(layers):
        src = AMBIENCE_DIR / layer["file"]
        gain = 10 ** ((layer.get("db", -32) - mean_db(src)) / 20)
        a, b = layer.get("from", 0.0), layer.get("to") or seconds
        a, b = (seconds + a if a < 0 else a), min(seconds + b if b < 0 else b, seconds)  # negativo = desde el final
        args += ["-stream_loop", "-1", "-i", str(src)]
        fade_in = "" if a <= 0 else f"afade=t=in:st={a:.2f}:d=2,"
        chains.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{b:.2f},asetpts=N/SR/TB,"
                      f"volume={gain:.4f},{fade_in}afade=t=out:st={max(b - 2, 0):.2f}:d=2,"
                      f"adelay=0|0,apad=whole_dur={seconds:.2f}[l{k}]")
        if a > 0:  # la capa empieza más tarde: silencio antes
            chains[-1] = chains[-1].replace(f"atrim=0:{b:.2f}", f"atrim=0:{b - a:.2f}").replace(
                f"afade=t=in:st={a:.2f}:d=2,", "afade=t=in:d=2,").replace(
                f"afade=t=out:st={max(b - 2, 0):.2f}", f"afade=t=out:st={max(b - a - 2, 0):.2f}").replace(
                "adelay=0|0", f"adelay={int(a * 1000)}|{int(a * 1000)}")
        labels.append(f"[l{k}]")
    graph = ";".join(chains) + ";" + "".join(labels) + f"amix=inputs={len(labels)}:duration=longest:normalize=0," \
        f"atrim=0:{seconds:.2f},afade=t=in:d=1.5,afade=t=out:st={max(seconds - 1.5, 0):.2f}:d=1.5[a]"
    ffmpeg.run([*args, "-filter_complex", graph, "-map", "[a]", "-ar", "48000", "-ac", "2", str(out)])
    return out


def voice_with_pauses(src: Path, words: list[dict], counts: list[int], lead: float, gap: float | list[float],
                      total: float, out: Path) -> list[dict]:
    """Ritmo de documental: `lead` s de silencio al empezar y `gap` s extra tras cada frase (un número, o una
    lista con el hueco tras cada frase: así hay momentos de "solo imagen" después de las frases importantes).
    Corta en el silencio natural entre frases (punto medio entre palabras) y desplaza los tiempos de las palabras."""
    cuts, idx = [], 0
    for c in counts[:-1]:
        idx += c
        prev, nxt = words[idx - 1], words[idx]
        cuts.append((prev["t"] + prev["d"] + nxt["t"]) / 2)
    gaps = gap if isinstance(gap, list) else [gap] * len(cuts)
    bounds = [0.0] + cuts + [None]
    n = len(bounds) - 1
    parts = [f"[0:a]aresample=48000,aformat=channel_layouts=mono,asplit={n}" + "".join(f"[i{k}]" for k in range(n))]
    seq = [f"aevalsrc=0:c=mono:s=48000:d={lead:.3f}[lead]"]
    order = ["[lead]"]
    for k in range(n):
        a, b = bounds[k], bounds[k + 1]
        end = f":end={b:.3f}" if b is not None else ""
        seq.append(f"[i{k}]atrim=start={a:.3f}{end},asetpts=PTS-STARTPTS[s{k}]")
        order.append(f"[s{k}]")
        if k < n - 1:
            seq.append(f"aevalsrc=0:c=mono:s=48000:d={gaps[k]:.3f}[g{k}]")
            order.append(f"[g{k}]")
    graph = ";".join(parts + seq) + ";" + "".join(order) + f"concat=n={len(order)}:v=0:a=1,apad=whole_dur={total:.3f}[a]"
    ffmpeg.run(["-i", str(src), "-filter_complex", graph, "-map", "[a]", "-t", f"{total:.3f}", str(out)])
    shifted, idx, offset = [], 0, lead
    for k, c in enumerate(counts):
        for w in words[idx: idx + c]:
            shifted.append(dict(w, t=w["t"] + offset))
        idx += c
        offset += gaps[k] if k < len(gaps) else 0
    return shifted


def render_documentary_story(pkg: VideoPackage, out_dir: Path, tts_provider: str | None = None) -> dict:
    """Documental largo 16:9 en estilo "documentary": cada escena es un capítulo, cada frase su clip elegido a mano
    (`curated["doc.s<i>.b<j>"]`, con `hold` para alargar el plano anterior), voz con EQ y ambiente/música en la mezcla.
    Título de capítulo = `scene.on_screen_text` ("Chapter 1|The slime fish"); especie en `curated["doc.s<i>"]`."""
    from .models import Beat
    from .tts import cache_suffix, load_words, voice_for

    cfg = load_config()
    channel, lang = cfg["channel"]["name"], pkg.language
    work = out_dir / "work_doc_story"
    work.mkdir(parents=True, exist_ok=True)
    voice_name, _ = voice_for(short=False, lang=lang)
    fade = _edit("transition_seconds", 0.6)
    scene_videos, wavs, durations, srt_chunks, titles, beds = [], [], [], [], [], []
    t = 0.0
    for i, scene in enumerate(pkg.documentary.scenes):
        key = scene.narration + voice_name + str(tts_provider) + cache_suffix(short=False, lang=lang)
        mp3 = cfg.path("cache") / "tts" / f"{_h(key)}.mp3"
        voice_len = synthesize(scene.narration, mp3, provider=tts_provider, lang=lang)
        beats = [Beat(text=x, visual="-") for x in SENTENCE_RE.split(scene.narration.strip()) if x]
        counts = [len(TOKEN_RE.findall(b.text)) for b in beats]
        raw_words = load_words(mp3)
        if sum(counts) != len(raw_words):
            raise ValueError(f"capítulo {i}: las frases ({sum(counts)} palabras) no cuadran con la voz ({len(raw_words)})")
        lead = _edit("doc_lead", 2.5) if i else _edit("doc_lead_intro", 3.0)   # imagen + ambiente antes de hablar
        pause = _edit("doc_sentence_pause", 0.6)                                 # respiro extra tras cada frase
        # `breath` en una frase = segundos de "solo imagen" (sin narrador) justo después de ella
        breaths = [(pkg.curated.get(f"doc.s{i}.b{j}") or {}).get("breath", 0) for j in range(len(beats))]
        gaps = [pause + breaths[j] for j in range(len(beats) - 1)]
        tail = (2.0 if i < len(pkg.documentary.scenes) - 1 else 2.5) + breaths[-1]
        seconds = lead + voice_len + sum(gaps) + tail
        voice_src = mp3
        if cfg["voice"].get("broadcast_eq"):
            voice_src = work / f"voice{i:02d}_eq.wav"
            ffmpeg.run(["-i", str(mp3), "-af", BROADCAST_EQ, str(voice_src)])
        words = voice_with_pauses(voice_src, raw_words, counts, lead, gaps, seconds, work / f"voice{i:02d}.wav")
        times = beat_times(beats, words, seconds)
        shots: list[list] = []
        for j, (a, b) in enumerate(times):
            if shots and (pkg.curated.get(f"doc.s{i}.b{j}") or {}).get("hold"):
                shots[-1][2] = b
            else:
                shots.append([j, a, b])
        meta = pkg.curated.get(f"doc.s{i}") or {}
        clips, lengths = [], []
        for k, (j, a, b) in enumerate(shots):
            asset = curated_asset(pkg, f"doc.s{i}.b{j}")
            if asset is None:
                raise ValueError(f"falta el clip de doc.s{i}.b{j}: {beats[j].text}")
            length = (b - a) + (fade if clips else 0)
            first = k == 0
            overlay = (doc_chapter_overlay(scene.on_screen_text, meta.get("species", ""), channel, intro=(i == 0))
                       if first and scene.on_screen_text else Image.new("RGBA", DOC_SIZE, (0, 0, 0, 0)))
            path = work / f"s{i:02d}_{k:02d}.mp4"
            if asset["type"] == "clip":
                clips.append(video_clip(asset["path"], overlay, length, DOC_SIZE, path, start=asset.get("start", 0),
                                        zoom=asset.get("zoom", 1.0), center=(asset.get("cx", 0.5), asset.get("cy", 0.5)),
                                        overlay_until=min(length, 6.0) if first else None))
            else:
                bg = cover(Image.open(asset["path"]), DOC_SIZE)
                clips.append(still_clip(bg, overlay, length, path, seed=i * 13 + k, zoom=0.05))
            lengths.append(length)
        joined = xfade_concat(clips, lengths, work / f"scene{i:02d}_raw.mp4", "fade", fade)
        # fundido a negro al entrar y salir de cada capítulo: sin cortes bruscos entre capítulos
        dur = ffmpeg.duration(joined)
        ffmpeg.run(["-i", str(joined), "-vf", f"fade=t=in:st=0:d=0.8,fade=t=out:st={max(dur - 0.8, 0):.2f}:d=0.8",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-an", str(work / f"scene{i:02d}.mp4")])
        scene_videos.append(work / f"scene{i:02d}.mp4")
        wavs.append(work / f"voice{i:02d}.wav")
        layers = meta.get("ambience") or [{"file": _edit("ambience", "deep_sea_drone.mp3"), "db": -32}]
        beds.append(ambience_bed(layers, seconds, work / f"amb{i:02d}.wav"))
        srt_chunks += srt_from_words(words, offset=t)
        durations.append(seconds)
        name = scene.on_screen_text.split("|")[-1]  # YouTube: "The Slime Fish" (sin "Chapter 1")
        titles.append("Intro" if i == 0 else name or "What Else Is Down There?")
        t += seconds
        print(f"  capítulo {i + 1}/{len(pkg.documentary.scenes)}: {seconds:.1f}s, {len(shots)} planos")

    bg, layer = doc_end_card(channel)
    scene_videos.append(still_clip(bg, layer, END_CARD_SECONDS, work / "end.mp4", seed=1, zoom=0.02))
    wavs.append(silence(END_CARD_SECONDS, work / "end.wav"))
    beds.append(ambience_bed(pkg.curated.get("doc.end", {}).get("ambience") or
                             [{"file": "ocean_waves_wind.mp3", "db": -34}], END_CARD_SECONDS, work / "amb_end.wav"))
    video = concat(scene_videos, work / "video.mp4")
    voice = concat([pad_audio(w, ffmpeg.duration(w), w.with_name(w.stem + "_48k.wav")) for w in wavs], work / "voice.wav")
    amb = concat(beds, work / "ambience.wav")
    final = final_mix(video, voice, out_dir / "documentary.mp4", subtitles=_empty_ass(work / "empty.ass", DOC_SIZE),
                      ambience_track=amb)
    write_srt(srt_chunks, out_dir / "documentary.srt")
    chapters = build_chapters(titles, durations, min_chapter=10)  # YouTube exige >= 10 s por capítulo
    return {"documentary": str(final), "documentary_seconds": round(ffmpeg.duration(final), 2),
            "subtitles": str(out_dir / "documentary.srt"),
            "chapters": [[fmt_timestamp(a), b] for a, b in chapters], "chapters_seconds": chapters}


SHOT_SECONDS = 2.6       # en shorts, una imagen nueva cada ~2,6 s (ritmo rápido)


def word_groups(words: list[dict], max_words: int = 3, pause: float = 0.22) -> list[list[dict]]:
    """Agrupa palabras de 1 a 3, cortando también donde la voz hace una pausa (comas, puntos)."""
    groups: list[list[dict]] = []
    for w in words:
        if groups and len(groups[-1]) < max_words:
            prev = groups[-1][-1]
            if w["t"] - (prev["t"] + prev["d"]) < pause:
                groups[-1].append(w)
                continue
        groups.append([w])
    return groups


def write_karaoke_ass(words: list[dict], out: Path, total: float, hook_words: int = 0,
                      stickers: list[tuple[float, float, str]] | None = None) -> Path:
    """Subtítulos sincronizados palabra a palabra: el grupo visible y la palabra que suena en amarillo."""
    header = (
        "[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n"
        "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        "Style: Cap,DejaVu Sans,104,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,8,3,2,50,50,560,1\n"
        "Style: Sticker,DejaVu Sans,100,&H00FFFFFF,&H00FFFFFF,&H002B2BE0,&H002B2BE0,-1,0,0,0,100,100,2,0,3,22,0,8,50,50,380,1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    yellow, white = "{\\c&H00CCFF&}", "{\\c&HFFFFFF&}"
    pos, upper = "\\an2\\pos(540,1360)", str.upper
    if minimal():  # gris oscuro sin contorno, palabra activa en rosa, sin mayúsculas, debajo de la tarjeta
        r, g, b = MIN_ACCENT
        yellow, white = f"{{\\c&H{b:02X}{g:02X}{r:02X}&}}", "{\\c&H282828&}"
        header = header.replace("Style: Cap,DejaVu Sans,104,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,8,3,",
                                "Style: Cap,Poppins SemiBold,78,&H00282828,&H00282828,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,")
        pos, upper = "\\an2\\pos(540,1640)", str
    if documentary():  # blanco fino, sin contorno; la palabra que suena en blanco y el resto en gris
        yellow, white = "{\\c&HFFFFFF&}", "{\\c&HB4B4B4&}"
        header = header.replace("Style: Cap,DejaVu Sans,104,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,8,3,",
                                "Style: Cap,Poppins SemiBold,78,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,1,0,1,0,3,")
        pos, upper = "\\an2\\pos(540,1560)", str
    lines, n = [], 0
    groups = word_groups(words)
    for gi, group in enumerate(groups):
        group_end = groups[gi + 1][0]["t"] if gi + 1 < len(groups) else min(total, group[-1]["t"] + group[-1]["d"] + 0.4)
        for k, w in enumerate(group):
            start = w["t"]
            end = group[k + 1]["t"] if k + 1 < len(group) else group_end
            parts = []
            for j, other in enumerate(group):
                txt = upper(re.sub(r"[{}\\]", "", other["w"]))
                in_hook = n - k + j < hook_words
                parts.append((yellow if j == k or in_hook else white) + txt)
            # Posición fija (\\pos): si dos eventos coinciden un fotograma, libass NO desplaza la línea
            lines.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Cap,,0,0,0,,{{{pos}}}{' '.join(parts)}")
            n += 1
    for start, end, text in stickers or []:
        # pegatina roja inclinada que "salta": escala 0 -> 125 % -> 100 %
        bounce = int(_edit("sticker_bounce", 1.1) * 100)
        anim = (f"{{\\frz-3\\fscx0\\fscy0\\t(0,140,\\fscx{bounce}\\fscy{bounce})"
                f"\\t(140,240,\\fscx100\\fscy100)\\fad(0,150)}}")
        clean = re.sub(r"[{}\\]", "", text).upper()
        lines.append(f"Dialogue: 1,{_ass_time(start)},{_ass_time(end)},Sticker,,0,0,0,,{anim}{clean}")
    out.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    return out


def _doc_texts(draw: ImageDraw.ImageDraw, text: str, channel: str, color=None) -> None:
    """Estilo documentary: marca espaciada arriba + título con serifa. `color` fuerza un color (para la sombra)."""
    w = SHORT_SIZE[0]
    if channel:
        label = " ".join(channel.upper())
        draw.text((w / 2, 170), label, font=_min_font(28, "Medium"), fill=color or DOC_GOLD, anchor="ma")
        draw.line([(w / 2 - 40, 225), (w / 2 + 40, 225)], fill=color or DOC_GOLD, width=2)
    text = EMOJI_RE.sub("", text).strip()
    if text:
        font = _serif(64)
        wrapped = _wrap(draw, text, font, int(w * 0.84))
        draw.multiline_text((w / 2, 280), wrapped, font=font, fill=color or "white", anchor="ma", align="center",
                            spacing=8)


def sentence_chunks(beats, words: list[dict], total: float, max_words: int = 7) -> list[tuple[float, float, str]]:
    """Subtítulos de documental: cada frase entera (o en dos mitades si es larga), con los tiempos reales de la voz."""
    counts = [len(TOKEN_RE.findall(b.text)) for b in beats]
    if sum(counts) != len(words) or not words:
        return [(a, b_end, beat.text) for beat, (a, b_end) in zip(beats, beat_times(beats, words, total))]
    chunks, idx = [], 0
    for beat, c in zip(beats, counts):
        tokens = beat.text.split()
        cut = len(tokens)
        if c > max_words and len(tokens) == c:  # frase larga: en dos, mejor tras una coma cercana a la mitad
            commas = [i + 1 for i, t in enumerate(tokens[:-1]) if t.endswith(",")]
            cut = min(commas, key=lambda i: abs(i - len(tokens) / 2)) if commas else len(tokens) // 2
        elif c > max_words:
            cut = len(tokens) // 2
        chunks.append((words[idx]["t"], " ".join(tokens[:cut])))
        if cut < len(tokens):
            w_cut = idx + (cut if len(tokens) == c else c * cut // len(tokens))
            chunks.append((words[w_cut]["t"], " ".join(tokens[cut:])))
        idx += c
    out = []
    for i, (start, text) in enumerate(chunks):
        end = chunks[i + 1][0] if i + 1 < len(chunks) else min(total, words[-1]["t"] + words[-1]["d"] + 0.5)
        out.append((start, end, text))
    return out


def write_sentence_ass(chunks: list[tuple[float, float, str]], out: Path) -> Path:
    """Subtítulos tranquilos de documental: frase completa, blanca, con sombra suave, sin resaltar palabras."""
    header = (
        "[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n"
        "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        "Style: Sub,Poppins Medium,58,&H00FFFFFF,&H00FFFFFF,&H70000000,&H60000000,0,0,0,0,100,100,0,0,1,2,2,"
        "2,110,110,0,1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    tag = "{\\an2\\pos(540,1640)\\fad(120,120)}"
    lines = [f"Dialogue: 0,{_ass_time(a)},{_ass_time(b)},Sub,,0,0,0,,{tag}" + re.sub(r"[{}\\]", "", text)
             for a, b, text in chunks]
    out.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    return out


def species_overlay(name: str, channel: str) -> Image.Image:
    """Rótulo de especie tipo documental (nombre científico en cursiva) sobre la capa normal del plano."""
    layer = headline_overlay("", channel)
    draw = ImageDraw.Draw(layer)
    path = FONTS_DIR / "PlayfairDisplay-Italic.ttf"
    font = ImageFont.truetype(str(path), 52) if path.exists() else _serif(52)
    x, y = 90, 1400
    draw.line([(x, y), (x + 70, y)], fill=DOC_GOLD, width=3)
    draw.text((x + 2, y + 14), name, font=font, fill=(0, 0, 0, 160))
    draw.text((x, y + 12), name, font=font, fill="white")
    return layer


def headline_overlay(text: str, channel: str) -> Image.Image:
    """Titular grande arriba durante el gancho (solo en el primer plano del short)."""
    w, h = SHORT_SIZE
    layer = Image.new("RGBA", SHORT_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    if documentary():  # degradados para leer el texto + marca espaciada + título con serifa
        shade = Image.new("L", (1, h))
        for y in range(h):
            top = max(0.0, 1 - y / 640) * 200
            bottom = max(0.0, (y - 1150) / (h - 1150)) * 190
            shade.putpixel((0, y), int(max(top, bottom)))
        layer.putalpha(shade.resize((w, h)))
        # sombra difuminada detrás de los textos para que se lean sobre cualquier imagen
        glow = Image.new("RGBA", SHORT_SIZE, (0, 0, 0, 0))
        _doc_texts(ImageDraw.Draw(glow), text, channel, (0, 0, 0, 200))
        layer = Image.alpha_composite(layer, glow.filter(ImageFilter.GaussianBlur(8)))
        _doc_texts(ImageDraw.Draw(layer), text, channel)
        return layer
    if minimal():  # texto oscuro, sin caja ni mayúsculas; los emojis no existen en Poppins
        text = EMOJI_RE.sub("", text).strip()
        if text:
            font = _min_font(56)
            wrapped = _wrap(draw, text, font, int(w * 0.84))
            draw.multiline_text((w / 2, CARD_BOX[1] - 50), wrapped, font=font, fill=MIN_INK, anchor="md",
                                align="center", spacing=6)
        if channel:
            draw.text((w / 2, h - 120), channel, font=_min_font(30, "Medium"), fill=MIN_INK, anchor="ma")
        return layer
    if text:
        font = _font(78)
        wrapped = _wrap(draw, text.upper(), font, int(w * 0.86))
        box = draw.multiline_textbbox((w / 2, 250), wrapped, font=font, anchor="ma", align="center", spacing=10)
        draw.rounded_rectangle([box[0] - 30, box[1] - 24, box[2] + 30, box[3] + 30], 22, fill=(0, 0, 0, 170))
        draw.multiline_text((w / 2, 250), wrapped, font=font, fill=ACCENT, anchor="ma", align="center", spacing=10)
    draw.text((w / 2, h - 150), channel, font=_font(34), fill=(255, 255, 255, 200), anchor="ma")
    return layer


def gather_images(queries: list[str], n: int, fallback: list[str], short_index: int) -> list[dict]:
    """Consigue hasta n imágenes DISTINTAS repartiendo entre las búsquedas (round-robin)."""
    images, used, dead = [], set(), set()
    rounds = 0
    while len(images) < n and len(dead) < len(queries) and rounds < n * 2:
        for q in queries:
            if len(images) >= n or q in dead:
                continue
            img = fetch_image(q, exclude=used, fallback_queries=fallback if not images else None)
            if img["provider"] == "placeholder" or img.get("source_url") in used:
                dead.add(q)
                continue
            used.add(img["source_url"])
            images.append(img | {"short": short_index, "query": q})
        rounds += 1
    if not images:
        images.append(fetch_image(queries[0]) | {"short": short_index, "query": queries[0]})
    return images


TOKEN_RE = re.compile(r"[\w'’]+(?:-[\w'’]+)*")
MAX_SHOT = 4.0  # si una frase dura más, se parte en dos planos


def beat_times(beats, words: list[dict], total: float) -> list[tuple[float, float]]:
    """Inicio y fin de cada frase usando los tiempos reales de la voz.

    La voz de edge-tts separa las palabras igual que TOKEN_RE, así que la frase k empieza
    en la palabra nº (suma de palabras de las frases anteriores). Si no cuadra, reparto proporcional.
    """
    counts = [len(TOKEN_RE.findall(b.text)) for b in beats]
    if sum(counts) == len(words) and words:
        starts, idx = [], 0
        for c in counts:
            starts.append(0.0 if idx == 0 else words[idx]["t"] - 0.05)
            idx += c
    else:
        print(f"[aviso] las frases ({sum(counts)} palabras) no cuadran con la voz ({len(words)}); reparto proporcional")
        acc, starts = 0, []
        for c in counts:
            starts.append(total * acc / max(sum(counts), 1))
            acc += c
    ends = starts[1:] + [total]
    return list(zip(starts, ends))


def curated_asset(pkg: VideoPackage, key: str) -> dict | None:
    """Foto o clip elegido a mano para una frase (package.curated). Se descarga y cachea."""
    import requests

    from .media import _session

    asset = pkg.curated.get(key)
    if not asset:
        return None
    asset = dict(asset)
    if asset.get("url") and not asset.get("path"):
        folder = load_config().path("cache") / "curated"
        folder.mkdir(parents=True, exist_ok=True)
        ext = ".mp4" if asset["type"] == "clip" else ".jpg"
        path = folder / f"{_h(asset['url'])}{ext}"
        if not path.exists():
            resp = _session().get(asset["url"], timeout=180)
            resp.raise_for_status()
            path.write_bytes(resp.content)
        asset["path"] = str(path)
    asset.setdefault("provider", "curated")
    return asset


def beat_shots(pkg: VideoPackage, index: int, words: list[dict], total: float, work: Path, channel: str):
    """Un plano (o dos, si la frase es larga) por frase, con el visual de ESA frase."""
    short = pkg.shorts[index]
    headline = short.on_screen_texts[0] if short.on_screen_texts else ""
    empty = headline_overlay("", channel)
    trans = _edit("transition", "fade")
    fade = _edit("transition_seconds", 0.2) if trans != "cut" else 0.0
    clips, lengths, images, used, cuts, clip_cuts, stickers = [], [], [], set(), [], [], []
    times = beat_times(short.beats, words, total)
    for b, (start, end) in enumerate(times):
        if (beat_sticker := short.beats[b].sticker) and _edit("stickers", False):
            stickers.append((start + 0.15, min(end, start + 1.8), beat_sticker))
    # Ritmo más lento: una frase con `hold: true` en `curated` NO cambia de plano, alarga el anterior
    shots: list[list] = []  # [primera frase, inicio, fin]
    for b, (start, end) in enumerate(times):
        if shots and (pkg.curated.get(f"short{index}.beat{b}") or {}).get("hold"):
            shots[-1][2] = end
        else:
            shots.append([b, start, end])
    for b, start, end in shots:
        if b:
            cuts.append(start)
        beat = short.beats[b]
        overlay = headline_overlay(headline, channel) if b == 0 else empty
        if documentary() and b == 1 and pkg.documentary.species:
            overlay = species_overlay(pkg.documentary.species[0], channel)
        dur = max(end - start, 0.3)
        asset = curated_asset(pkg, f"short{index}.beat{b}")
        if asset is None:  # sin elección manual: primero clip, si no foto
            clip = fetch_clip(beat.visual, portrait=True, exclude=used)
            asset = ({"type": "clip", "path": clip["clip"], "start": 0} | clip) if clip else \
                    ({"type": "photo"} | fetch_image(beat.visual, exclude=used, fallback_queries=pkg.documentary.species))
        if asset.get("source_url"):
            used.add(asset["source_url"])
        meta = {k: asset.get(k) for k in ("provider", "license", "attribution", "source_url")}
        path = work / f"b{b:02d}.mp4"
        if asset["type"] == "clip":
            if b:
                clip_cuts.append(start)
            length = dur + (fade if clips else 0)  # empieza `fade` s antes: el fundido termina justo en el corte
            clips.append(video_clip(asset["path"], overlay, length, SHORT_SIZE, path, start=asset.get("start", 0),
                                    punch=True, fit=asset.get("fit", False), focus=asset.get("x", 0.5),
                                    zoom=asset.get("zoom", 1.0), center=(asset.get("cx", 0.5), asset.get("cy", 0.5))))
            lengths.append(length)
            images.append(clip_preview({"clip": asset["path"]}) | meta | {"short": index, "query": beat.text[:40]})
            continue
        images.append({"path": asset["path"]} | meta | {"short": index, "query": beat.text[:40]})
        parts = 2 if dur > MAX_SHOT and not documentary() else 1
        if documentary():  # foto a pantalla completa, encuadrada en `x` si el animal no está centrado
            bg = ImageOps.fit(Image.open(asset["path"]).convert("RGB"), SHORT_SIZE, Image.LANCZOS,
                              centering=(asset.get("x", 0.5), 0.45))
        else:
            bg = compose_portrait(Image.open(asset["path"]))
        for k in range(parts):  # misma foto, dos encuadres (zoom in / zoom out)
            length = dur / parts + (fade if clips else 0)
            clips.append(still_clip(bg, overlay if k == 0 else empty, length, work / f"b{b:02d}_{k}.mp4",
                                    seed=b * 2 + k, zoom=0.04 if minimal() else 0.06 if documentary() else 0.12, punch=True))
            lengths.append(length)
            if k:
                cuts.append(start + dur / parts * k)
    video = xfade_concat(clips, lengths, work / "video.mp4", trans, fade)
    return video, images, cuts, clip_cuts, stickers


def render_short(pkg: VideoPackage, index: int, out_dir: Path, tts_provider: str | None = None) -> dict:
    cfg = load_config()
    short = pkg.shorts[index]
    channel = cfg["channel"]["name"]
    work = out_dir / f"work_short{index + 1}"
    work.mkdir(parents=True, exist_ok=True)

    from .tts import cache_suffix, load_words, voice_for

    voice_name, _ = voice_for(short=True, lang=pkg.language)
    key = short.narration + voice_name + str(tts_provider) + cache_suffix(short=True, lang=pkg.language)
    mp3 = cfg.path("cache") / "tts" / f"{_h(key)}.mp3"
    voice_len = synthesize(short.narration, mp3, short=True, provider=tts_provider, lang=pkg.language)
    total = voice_len + 0.5

    if short.beats:
        video, images, cuts, clip_cuts, stickers = beat_shots(pkg, index, load_words(mp3), total, work, channel)
        voice_src = mp3
        chain = []
        if semis := cfg["voice"].get("pitch_semitones_post"):
            # Bajar el tono DESPUÉS de generar la voz: el "pitch" de edge-tts rompe algunas palabras ("bee" con
            # crepitación). rubberband cambia solo el tono (no la velocidad) y conserva los formantes (el timbre).
            chain.append(f"rubberband=pitch={2 ** (semis / 12):.5f}:formant=preserved:pitchq=quality")
        if cfg["voice"].get("broadcast_eq"):  # más "pecho" (graves), menos eses y compresión: voz de cabina
            chain.append(BROADCAST_EQ)
        if chain:
            voice_src = work / "voice_eq.wav"
            ffmpeg.run(["-i", str(mp3), "-af", ",".join(chain), str(voice_src)])
        voice = pad_audio(voice_src, total, work / "voice.wav")
        if documentary():  # subtítulos de documental: frase completa
            ass = write_sentence_ass(sentence_chunks(short.beats, load_words(mp3), total), work / "captions.ass")
        else:
            ass = write_karaoke_ass(load_words(mp3), work / "captions.ass", total, hook_words=len(short.hook.split()),
                                    stickers=stickers)
        # Efectos de sonido; la intensidad se regula en config.yaml -> editing
        events = [(0.0, "impact.mp3", _edit("impact_volume", 0.5))]
        mode = _edit("whoosh_on", "clips")
        whoosh_cuts = cuts if mode == "all" else clip_cuts if mode == "clips" else []
        lead = _edit("transition_seconds", 0.2) if _edit("transition", "fade") != "cut" else 0.12
        events += [(t - lead - 0.05, "whoosh2.mp3", _edit("whoosh_volume", 0.3)) for t in whoosh_cuts]
        events += [(t0, "pop.mp3", _edit("pop_volume", 0.5)) for t0, _, _ in stickers]
        fx = sfx_track([e for e in events if e[2] > 0], total, work / "sfx.wav")
        final = final_mix(video, voice, out_dir / f"short_{index + 1}.mp4", subtitles=ass,
                          progress_bar=total if _edit("progress_bar", True) else None,
                          sfx=fx, flashes=cuts if _edit("flashes", False) else None)
        return {"path": str(final), "seconds": round(ffmpeg.duration(final), 2), "images": images}

    # Planos: uno cada ~SHOT_SECONDS; si hay menos fotos que planos, se reutilizan con otro encuadre
    n_shots = max(3, math.ceil(total / SHOT_SECONDS))
    queries = short.visual_queries or pkg.documentary.species
    images = gather_images(queries, n_shots, pkg.documentary.species, index)
    per_shot = total / n_shots
    headline = short.on_screen_texts[0] if short.on_screen_texts else ""
    empty = headline_overlay("", channel)
    clips = []
    photos = list(images)  # las previsualizaciones de clips solo van a la hoja de contactos
    used_clips: set[str] = set()
    for j in range(n_shots):
        overlay = headline_overlay(headline, channel) if j == 0 else empty
        path = work / f"i{j:02d}.mp4"
        if j % 2 == 1:  # alternamos foto / vídeo cuando hay clips que encajen
            clip = fetch_clip(queries[j % len(queries)], portrait=True, exclude=used_clips)
            if clip:
                used_clips.add(clip["source_url"])
                images.append(clip_preview(clip) | {"short": index, "query": queries[j % len(queries)]})
                clips.append(video_clip(clip["clip"], overlay, per_shot, SHORT_SIZE, path))
                continue
        img = photos[j % len(photos)]
        bg = compose_portrait(Image.open(img["path"]))
        clips.append(still_clip(bg, overlay, per_shot, path, seed=index * 31 + j, zoom=0.14))

    video = concat(clips, work / "video.mp4")
    voice = pad_audio(mp3, total, work / "voice.wav")
    ass = write_karaoke_ass(load_words(mp3), work / "captions.ass", total, hook_words=len(short.hook.split()))
    final = final_mix(video, voice, out_dir / f"short_{index + 1}.mp4", subtitles=ass, progress_bar=total)
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
