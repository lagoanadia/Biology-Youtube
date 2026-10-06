"""Texto a voz (narración) + tiempos exactos de cada palabra.

Proveedores:
- "edge":   voces neuronales de Microsoft Edge vía el paquete `edge-tts`.
            Gratis. Además de audio, devuelve el instante exacto en que se
            pronuncia cada palabra ("WordBoundary"): con eso sincronizamos los
            subtítulos al milisegundo en vez de estimarlos.
- "silent": audio en silencio con la duración estimada (pruebas sin red).

Por cada audio `x.mp3` se guarda `x.words.json` con [{"t": inicio_s, "d": duración_s, "w": palabra}].
Para una voz más humana (de pago) se puede añadir aquí otro proveedor, p. ej. ElevenLabs,
con la misma firma y que también devuelva tiempos por palabra.
"""
from __future__ import annotations

import asyncio
import json
import re
import ssl
import time
from pathlib import Path

from . import ffmpeg
from .config import env, load_config

TICKS = 10_000_000  # edge-tts mide el tiempo en unidades de 100 nanosegundos


def _synth_edge(text: str, out: Path, voice: str, rate: str, pitch: str = "+0Hz") -> list[dict]:
    import edge_tts
    import edge_tts.communicate as communicate

    ca = env("BIOTUBE_CA_BUNDLE")
    if ca:  # detrás de un proxy con certificado propio
        communicate._SSL_CTX = ssl.create_default_context(cafile=ca)
    proxy = env("HTTPS_PROXY") or env("https_proxy")

    async def _run() -> list[dict]:
        words: list[dict] = []
        comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary", proxy=proxy)
        with open(out, "wb") as f:
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    words.append({"t": chunk["offset"] / TICKS, "d": chunk["duration"] / TICKS, "w": chunk["text"]})
        return words

    for attempt in range(4):  # el servicio a veces falla de forma puntual ("No audio was received")
        try:
            return asyncio.run(_run())
        except Exception as e:  # noqa: BLE001 - reintentamos cualquier fallo de red/servicio
            if attempt == 3:
                raise
            wait = 3 * (attempt + 1)
            print(f"[tts] fallo de la voz ({e.__class__.__name__}), reintento en {wait}s...")
            time.sleep(wait)
    return []


def _synth_silent(text: str, out: Path, voice: str, rate: str, pitch: str = "+0Hz") -> list[dict]:
    wpm = load_config()["content"]["words_per_minute"]
    words = text.split()
    seconds = max(1.0, len(words) / wpm * 60)
    ffmpeg.run(["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{seconds:.2f}", "-q:a", "9", str(out)])
    step = seconds / max(len(words), 1)
    return [{"t": i * step, "d": step * 0.9, "w": w.strip(".,;:!?¿¡")} for i, w in enumerate(words)]


_KOKORO: dict = {}
_WORD_RE = re.compile(r"[\w'’]+(?:-[\w'’]+)*")  # igual que TOKEN_RE en render.py


def _alnum(x: str) -> str:
    return re.sub(r"[^0-9a-z]", "", x.lower())


def _synth_kokoro(text: str, out: Path, voice: str, rate: str, pitch: str = "+0Hz") -> list[dict]:
    """Kokoro-82M (Apache 2.0): voz local más natural. `voice` = am_michael, bm_george... (1ª letra = idioma).
    `rate` "+4%" → velocidad 1.04. Kokoro no tiene pitch. Los tiempos por palabra salen de sus tokens y se
    reparten a las palabras del texto tal como las cuenta el montaje (TOKEN_RE), para que todo cuadre."""
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    lang = voice[0]
    if lang not in _KOKORO:
        _KOKORO[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    speed = 1 + float(rate.strip("%") or 0) / 100
    audio, toks, offset = [], [], 0.0
    for r in _KOKORO[lang](text, voice=voice, speed=speed):
        chunk = r.audio.numpy()
        for t in r.tokens or []:
            if _alnum(t.text):
                toks.append((t.text, None if t.start_ts is None else t.start_ts + offset,
                             None if t.end_ts is None else t.end_ts + offset))
        audio.append(chunk)
        offset += len(chunk) / 24000
    wav = out.with_suffix(".wav")
    sf.write(wav, np.concatenate(audio), 24000)
    ffmpeg.run(["-i", str(wav), "-b:a", "160k", str(out)])
    wav.unlink()
    # unir tokens de Kokoro con las palabras del texto ("see-through" puede venir en 3 tokens, etc.)
    words, k = [], 0
    for w in _WORD_RE.findall(text):
        target, got, first, last = _alnum(w), "", None, None
        while k < len(toks) and len(got) < len(target):
            got += _alnum(toks[k][0]); first = first if first is not None else toks[k][1]; last = toks[k][2]; k += 1
        words.append({"t": first, "d": None if first is None or last is None else max(last - first, 0.05), "w": w})
    for i, w in enumerate(words):  # huecos sin tiempo: se interpolan entre vecinos
        if w["t"] is None:
            prev = words[i - 1]["t"] + (words[i - 1]["d"] or 0.2) if i else 0.0
            w["t"] = prev
        if w["d"] is None:
            w["d"] = 0.2
    return words


PROVIDERS = {"edge": _synth_edge, "silent": _synth_silent, "kokoro": _synth_kokoro}


def voice_for(short: bool = False, lang: str | None = None) -> tuple[str, str]:
    """Voz según el idioma del vídeo (voice_es, voice_en... en config.yaml)."""
    cfg = load_config()
    lang = lang or cfg["channel"]["language"]
    voice = cfg["voice"].get(f"voice_{lang}", cfg["voice"]["voice_es"])
    rate = cfg["voice"]["rate_shorts" if short else "rate"]
    return voice, rate


def pitch_for(short: bool = False) -> str:
    """Tono de la voz (p. ej. "-8Hz" = más grave, tipo narrador de documental). Por defecto, sin cambios."""
    v = load_config()["voice"]
    return v.get("pitch_shorts" if short else "pitch", "+0Hz")


def cache_suffix(short: bool = False, lang: str | None = None) -> str:
    """Parte extra de la clave de caché del audio: si cambian el tono o la velocidad, hay que regenerar la voz.
    Vacía con el tono por defecto para no invalidar los audios ya aprobados."""
    pitch = pitch_for(short)
    return "" if pitch == "+0Hz" else pitch + voice_for(short, lang)[1]


def synthesize(text: str, out: Path, *, short: bool = False, provider: str | None = None, lang: str | None = None) -> float:
    """Genera `out` (mp3) + `out.words.json` y devuelve la duración en segundos. Cachea por fichero."""
    provider = provider or load_config()["voice"]["provider"]
    voice, rate = voice_for(short, lang)
    out.parent.mkdir(parents=True, exist_ok=True)
    words_file = words_path(out)
    if not out.exists() or out.stat().st_size == 0 or not words_file.exists():
        words = PROVIDERS[provider](text, out, voice, rate, pitch_for(short))
        words_file.write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")
    return ffmpeg.duration(out)


def words_path(audio: Path) -> Path:
    return audio.with_suffix(".words.json")


def load_words(audio: Path) -> list[dict]:
    """Tiempos por palabra. La voz a veces agrupa varias palabras en un solo evento
    (p. ej. "in 2020"): las separamos repartiendo el tiempo para que cuadren con el texto."""
    path = words_path(audio)
    if not path.exists():
        return []
    out = []
    for w in json.loads(path.read_text(encoding="utf-8")):
        parts = w["w"].split()
        if len(parts) <= 1:
            out.append(w)
            continue
        total_chars = sum(len(p) for p in parts)
        t = w["t"]
        for part in parts:
            d = w["d"] * len(part) / total_chars
            out.append({"t": t, "d": d, "w": part})
            t += d
    return out
