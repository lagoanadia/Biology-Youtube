"""Optimización de títulos, descripciones y etiquetas para YouTube.

Reglas que aplica (todas documentadas por YouTube o comprobadas por la comunidad):
- Título: máx. 100 caracteres (límite duro), pero en móvil se corta ~70 -> avisamos.
- Descripción: las 2 primeras líneas son lo único visible sin expandir.
- Capítulos: YouTube los crea si la descripción tiene marcas de tiempo que
  empiezan en 00:00, hay al menos 3 y cada una dura >= 10 s. Mejoran retención y
  aparecen en Google como "momentos clave".
- Etiquetas: el total no puede superar 500 caracteres.
- Hashtags: los 3 primeros se muestran sobre el título; con más de 60 YouTube
  los ignora todos. Usamos máx. 3 (+ #shorts en los shorts).
"""
from __future__ import annotations

from .models import DocumentaryScript, VideoMetadata

TAGS_MAX_CHARS = 500
TITLE_SOFT_LIMIT = 70

DISCLOSURE = {
    "es": "Narración generada con voz sintética. Guion revisado y basado en las fuentes citadas.",
    "en": "Narrated with a synthetic voice. Script based on the sources listed below.",
}


def fmt_timestamp(seconds: float) -> str:
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def build_chapters(scene_titles: list[str], scene_durations: list[float], min_chapter: float = 45.0) -> list[tuple[float, str]]:
    """Agrupa escenas en capítulos de al menos `min_chapter` segundos."""
    chapters: list[tuple[float, str]] = []
    t = 0.0
    last_start = -min_chapter
    for title, dur in zip(scene_titles, scene_durations):
        if t - last_start >= min_chapter or not chapters:
            chapters.append((t, title))
            last_start = t
        t += dur
    chapters[0] = (0.0, chapters[0][1])
    return chapters if len(chapters) >= 3 else []


def clean_tags(tags: list[str], extra: list[str] | None = None) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for tag in (tags or []) + (extra or []):
        tag = tag.strip().lstrip("#").replace("<", "").replace(">", "")
        key = tag.lower()
        if not tag or key in seen:
            continue
        # YouTube cuenta las etiquetas con espacios como si llevaran comillas (+2)
        cost = len(tag) + (2 if " " in tag else 0) + 1
        if sum(len(t) + (2 if " " in t else 0) + 1 for t in result) + cost > TAGS_MAX_CHARS:
            break
        seen.add(key)
        result.append(tag)
    return result


def normalize_hashtags(hashtags: list[str], defaults: list[str], is_short: bool) -> list[str]:
    tags = ["#" + h.strip().lstrip("#").replace(" ", "") for h in hashtags + defaults if h.strip()]
    unique = list(dict.fromkeys(tags))
    if is_short:
        unique = ["#shorts"] + [t for t in unique if t.lower() != "#shorts"]
    return unique[:3]


def title_warnings(title: str, is_short: bool = False) -> list[str]:
    warnings = []
    limit = 60 if is_short else TITLE_SOFT_LIMIT
    if len(title) > 100:
        warnings.append("título > 100 caracteres (YouTube lo rechaza)")
    elif len(title) > limit:
        warnings.append(f"título > {limit} caracteres (se cortará en móvil)")
    letters = [c for c in title if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) / len(letters) > 0.5:
        warnings.append("demasiadas MAYÚSCULAS (parece clickbait)")
    return warnings


def build_description(
    meta: VideoMetadata,
    *,
    lang: str,
    defaults_hashtags: list[str],
    is_short: bool,
    chapters: list[tuple[float, str]] | None = None,
    script: DocumentaryScript | None = None,
    attributions: list[str] | None = None,
    documentary_url: str | None = None,
) -> str:
    es = lang == "es"
    parts = [meta.description.strip()]

    if documentary_url:
        parts.append(("🎬 Documental completo: " if es else "🎬 Full documentary: ") + documentary_url)

    if chapters:
        lines = [f"{fmt_timestamp(t)} {title}" for t, title in chapters]
        parts.append(("📑 Capítulos\n" if es else "📑 Chapters\n") + "\n".join(lines))

    if script and script.sources:
        refs = "\n".join(f"• {s.title} — {s.reference}" for s in script.sources)
        parts.append(("📚 Fuentes\n" if es else "📚 Sources\n") + refs)

    if attributions:
        parts.append(("🖼️ Imágenes\n" if es else "🖼️ Images\n") + "\n".join(f"• {a}" for a in attributions))

    parts.append(DISCLOSURE.get(lang, DISCLOSURE["en"]))
    parts.append(" ".join(normalize_hashtags(meta.hashtags, defaults_hashtags, is_short)))
    return "\n\n".join(parts)[:5000]
