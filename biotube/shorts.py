"""Troceado del documental en shorts SIN usar la API (modo offline / respaldo).

La versión buena la hace Claude en scriptwriter.split_into_shorts(), que
reescribe el texto para que funcione en 60 s. Esta versión determinista sirve
para: tests, trabajar sin clave de API, o como plan B si la API falla.
"""
from __future__ import annotations

import re

from .models import DocumentaryScript, Scene, ShortScript

CTA = {
    "es": "La historia completa, en el documental del canal. Síguenos para más biología rara.",
    "en": "Full story in our documentary. Follow for more weird biology.",
}


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def _trim_words(text: str, max_words: int) -> str:
    """Recorta a max_words pero terminando en una frase completa si es posible."""
    out: list[str] = []
    for sentence in _sentences(text):
        if len(" ".join(out + [sentence]).split()) > max_words:
            break
        out.append(sentence)
    return " ".join(out) if out else " ".join(text.split()[:max_words])


def pick_scenes(script: DocumentaryScript, n: int) -> list[Scene]:
    """Elige n escenas: primero las marcadas key_fact, repartidas por el vídeo."""
    key = [s for s in script.scenes if s.key_fact]
    pool = key if len(key) >= n else key + [s for s in script.scenes[1:] if not s.key_fact]
    if len(pool) <= n:
        return pool[:n]
    # Reparto uniforme para no coger 4 hechos seguidos del mismo bloque
    step = len(pool) / n
    return [pool[int(i * step)] for i in range(n)]


def split_offline(script: DocumentaryScript, n: int = 4, max_words: int = 140, lang: str = "es") -> list[ShortScript]:
    cta = CTA.get(lang, CTA["en"])
    shorts = []
    for scene in pick_scenes(script, n):
        sentences = _sentences(scene.narration)
        hook = sentences[0] if sentences else scene.on_screen_text
        body_budget = max_words - len(hook.split()) - len(cta.split())
        fact = _trim_words(" ".join(sentences[1:]) or scene.narration, max(body_budget, 20))
        shorts.append(
            ShortScript(
                hook=hook,
                fact=fact,
                cta=cta,
                visual_queries=[scene.visual_query],
                on_screen_texts=[scene.on_screen_text],
            )
        )
    return shorts
