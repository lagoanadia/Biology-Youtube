"""Comprobaciones antes de publicar para proteger la monetización.

No sustituye a revisar el vídeo tú misma/o: es una red de seguridad que
bloquea errores típicos que hacen perder anuncios o el canal entero:

1. Derechos de autor: todas las imágenes deben tener licencia comercial
   (CC0, dominio público, CC BY, CC BY-SA o licencia Pexels) y atribución.
2. "Advertiser-friendly": evitar palabras que activan anuncios limitados ($).
3. Contenido "inauténtico/repetitivo": YouTube desmonetiza canales de vídeos
   casi idénticos producidos en masa. Exigimos fuentes, duración mínima y
   que cada guion sea distinto de los anteriores.
4. Metadatos engañosos: títulos en mayúsculas, promesas exageradas.
"""
from __future__ import annotations

from dataclasses import dataclass

from .models import VideoPackage
from .seo import title_warnings

# Palabras que suelen provocar el icono amarillo ($ limitado). Lista orientativa.
SENSITIVE_WORDS = {
    "es": ["sangriento", "masacre", "brutal", "gore", "asesino", "tortura", "muerte horrible", "mierda", "joder"],
    "en": ["bloody", "massacre", "brutal", "gore", "killer", "torture", "gruesome", "shit", "fuck"],
}
# Marcadores de licencias que NO permiten uso comercial o modificación
BAD_LICENSE_MARKERS = ("nc", "nd", "noncommercial", "non-commercial", "no derivatives", "fair use", "copyrighted", "all rights reserved")


def is_commercial_license(license_name: str, allowed: list[str]) -> bool:
    """True si la licencia permite monetizar. Se usa aquí y en media.py (una sola fuente de verdad)."""
    lic = (license_name or "").lower().strip()
    words = set(lic.replace("-", " ").replace("_", " ").split())
    if words & {"nc", "nd"} or any(m in lic for m in BAD_LICENSE_MARKERS[2:]):
        return False
    return any(lic.startswith(a.lower()) for a in allowed)


CLICKBAIT = ["no creerás", "100% real", "you won't believe", "gone wrong", "(real)"]


@dataclass
class Issue:
    severity: str  # "error" bloquea la publicación, "warning" solo avisa
    message: str


def _similarity(a: str, b: str) -> float:
    """Jaccard de trigramas de palabras: 0 = distinto, 1 = idéntico."""
    def grams(text: str) -> set[tuple[str, ...]]:
        w = text.lower().split()
        return {tuple(w[i : i + 3]) for i in range(len(w) - 2)}

    ga, gb = grams(a), grams(b)
    return len(ga & gb) / len(ga | gb) if ga and gb else 0.0


def check_package(
    pkg: VideoPackage,
    *,
    allowed_licenses: list[str],
    min_minutes: float = 8.0,
    wpm: int = 150,
    short_max_seconds: int = 58,
    previous_narrations: list[str] | None = None,
) -> list[Issue]:
    issues: list[Issue] = []
    lang = pkg.language
    doc = pkg.documentary

    # --- Duración -----------------------------------------------------------
    # 8 min es el mínimo para poder poner anuncios a mitad de vídeo (mid-rolls)
    duration_min = pkg.assets.get("documentary_seconds", doc.estimated_minutes(wpm) * 60) / 60
    if duration_min < min_minutes:
        issues.append(Issue("warning", f"documental de {duration_min:.1f} min: por debajo de {min_minutes} no hay mid-rolls"))

    for i, s in enumerate(pkg.shorts):
        secs = pkg.assets.get("shorts_seconds", {}).get(str(i), s.word_count / wpm * 60)
        if secs > 60:
            issues.append(Issue("error", f"short {i + 1} dura {secs:.0f} s (> 60 s no cuenta como Short)"))
        elif secs > short_max_seconds:
            issues.append(Issue("warning", f"short {i + 1} dura {secs:.0f} s, muy justo"))

    # --- Fuentes (rigor + evita "contenido de baja calidad") -----------------
    if len(doc.sources) < 2:
        issues.append(Issue("error", "el documental necesita al menos 2 fuentes"))

    # --- Lenguaje sensible ---------------------------------------------------
    texts = [doc.narration] + [s.narration for s in pkg.shorts]
    texts += [pkg.documentary_metadata.title, pkg.documentary_metadata.description]
    texts += [m.title for m in pkg.shorts_metadata]
    blob = " ".join(texts).lower()
    for word in SENSITIVE_WORDS.get(lang, []) + SENSITIVE_WORDS["en"]:
        if word in blob:
            issues.append(Issue("warning", f"palabra sensible para anunciantes: '{word}'"))
    for phrase in CLICKBAIT:
        if phrase in blob:
            issues.append(Issue("warning", f"expresión tipo clickbait: '{phrase}'"))

    # --- Títulos --------------------------------------------------------------
    for w in title_warnings(pkg.documentary_metadata.title):
        issues.append(Issue("warning", f"documental: {w}"))
    for i, m in enumerate(pkg.shorts_metadata):
        for w in title_warnings(m.title, is_short=True):
            issues.append(Issue("warning", f"short {i + 1}: {w}"))

    # --- Licencias de imágenes -----------------------------------------------
    for img in pkg.assets.get("images", []):
        lic = (img.get("license") or "").lower()
        if img.get("provider") == "placeholder":
            continue
        if not is_commercial_license(lic, allowed_licenses):
            issues.append(Issue("error", f"licencia no apta para uso comercial: {lic or '??'} ({img.get('source_url')})"))
        if lic.startswith("cc by") and not img.get("attribution"):
            issues.append(Issue("error", f"falta atribución para {img.get('source_url')}"))

    # --- Contenido repetitivo -------------------------------------------------
    for prev in previous_narrations or []:
        sim = _similarity(doc.narration, prev)
        if sim > 0.25:
            issues.append(Issue("error", f"guion demasiado parecido a otro anterior (similitud {sim:.0%})"))

    return issues


def has_blockers(issues: list[Issue]) -> bool:
    return any(i.severity == "error" for i in issues)
