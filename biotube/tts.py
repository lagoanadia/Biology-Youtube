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
import ssl
from pathlib import Path

from . import ffmpeg
from .config import env, load_config

TICKS = 10_000_000  # edge-tts mide el tiempo en unidades de 100 nanosegundos


def _synth_edge(text: str, out: Path, voice: str, rate: str) -> list[dict]:
    import edge_tts
    import edge_tts.communicate as communicate

    ca = env("BIOTUBE_CA_BUNDLE")
    if ca:  # detrás de un proxy con certificado propio
        communicate._SSL_CTX = ssl.create_default_context(cafile=ca)
    proxy = env("HTTPS_PROXY") or env("https_proxy")

    async def _run() -> list[dict]:
        words: list[dict] = []
        comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary", proxy=proxy)
        with open(out, "wb") as f:
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    words.append({"t": chunk["offset"] / TICKS, "d": chunk["duration"] / TICKS, "w": chunk["text"]})
        return words

    return asyncio.run(_run())


def _synth_silent(text: str, out: Path, voice: str, rate: str) -> list[dict]:
    wpm = load_config()["content"]["words_per_minute"]
    words = text.split()
    seconds = max(1.0, len(words) / wpm * 60)
    ffmpeg.run(["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{seconds:.2f}", "-q:a", "9", str(out)])
    step = seconds / max(len(words), 1)
    return [{"t": i * step, "d": step * 0.9, "w": w.strip(".,;:!?¿¡")} for i, w in enumerate(words)]


PROVIDERS = {"edge": _synth_edge, "silent": _synth_silent}


def voice_for(short: bool = False, lang: str | None = None) -> tuple[str, str]:
    """Voz según el idioma del vídeo (voice_es, voice_en... en config.yaml)."""
    cfg = load_config()
    lang = lang or cfg["channel"]["language"]
    voice = cfg["voice"].get(f"voice_{lang}", cfg["voice"]["voice_es"])
    rate = cfg["voice"]["rate_shorts" if short else "rate"]
    return voice, rate


def synthesize(text: str, out: Path, *, short: bool = False, provider: str | None = None, lang: str | None = None) -> float:
    """Genera `out` (mp3) + `out.words.json` y devuelve la duración en segundos. Cachea por fichero."""
    provider = provider or load_config()["voice"]["provider"]
    voice, rate = voice_for(short, lang)
    out.parent.mkdir(parents=True, exist_ok=True)
    words_file = words_path(out)
    if not out.exists() or out.stat().st_size == 0 or not words_file.exists():
        words = PROVIDERS[provider](text, out, voice, rate)
        words_file.write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")
    return ffmpeg.duration(out)


def words_path(audio: Path) -> Path:
    return audio.with_suffix(".words.json")


def load_words(audio: Path) -> list[dict]:
    path = words_path(audio)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
