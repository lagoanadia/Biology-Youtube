"""Texto a voz (narración).

Proveedores:
- "edge":   voces neuronales de Microsoft Edge vía el paquete `edge-tts`.
            Gratis y con calidad alta. Necesita internet.
- "silent": genera audio en silencio con la duración estimada. Sirve para
            probar el pipeline sin red o en los tests.

Para cambiar a una voz premium (ElevenLabs, Azure...) basta con añadir otra
función `_synth_xxx` con la misma firma y registrarla en PROVIDERS.
"""
from __future__ import annotations

import asyncio
import ssl
from pathlib import Path

from . import ffmpeg
from .config import env, load_config


def _synth_edge(text: str, out: Path, voice: str, rate: str) -> None:
    import edge_tts
    import edge_tts.communicate as communicate

    ca = env("BIOTUBE_CA_BUNDLE")
    if ca:  # detrás de un proxy con certificado propio
        communicate._SSL_CTX = ssl.create_default_context(cafile=ca)
    proxy = env("HTTPS_PROXY") or env("https_proxy")

    async def _run() -> None:
        await edge_tts.Communicate(text, voice, rate=rate, proxy=proxy).save(str(out))

    asyncio.run(_run())


def _synth_silent(text: str, out: Path, voice: str, rate: str) -> None:
    wpm = load_config()["content"]["words_per_minute"]
    seconds = max(1.0, len(text.split()) / wpm * 60)
    ffmpeg.run(["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{seconds:.2f}", "-q:a", "9", str(out)])


PROVIDERS = {"edge": _synth_edge, "silent": _synth_silent}


def synthesize(text: str, out: Path, *, short: bool = False, provider: str | None = None) -> float:
    """Genera `out` (mp3) y devuelve su duración en segundos. Cachea por fichero."""
    cfg = load_config()
    provider = provider or cfg["voice"]["provider"]
    lang = cfg["channel"]["language"]
    voice = cfg["voice"].get(f"voice_{lang}", cfg["voice"]["voice_es"])
    rate = cfg["voice"]["rate_shorts" if short else "rate"]

    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists() or out.stat().st_size == 0:
        PROVIDERS[provider](text, out, voice, rate)
    return ffmpeg.duration(out)
