"""Búsqueda y descarga de imágenes con licencia apta para monetizar.

Orden de preferencia (config.yaml -> media.providers):
1. Wikimedia Commons: millones de fotos científicas con licencia libre.
   Filtramos por licencia: solo CC0, dominio público, CC BY y CC BY-SA
   (las "NC" = no comercial y "ND" = sin derivados NO sirven para monetizar).
2. Pexels: licencia propia que permite uso comercial sin atribución
   (aun así la ponemos, es buena práctica). Necesita PEXELS_API_KEY.
3. Placeholder: si no hay nada, una tarjeta generada con Pillow.

Cada imagen devuelve un dict con la ruta local + licencia + atribución, que
luego usa compliance.py (para bloquear licencias malas) y seo.py (créditos).
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

from .compliance import is_commercial_license
from .config import env, load_config

USER_AGENT = "BioTube/0.1 (educational YouTube channel automation; contact via GitHub)"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
# Wikimedia solo sirve miniaturas en estos anchos estándar y limita mucho la
# descarga de originales: https://www.mediawiki.org/wiki/Common_thumbnail_sizes
THUMB_STEPS = (960, 1280, 1920)


# Palabras en el nombre del fichero que delatan que NO es el ser vivo real
# (salvo que la búsqueda las pida explícitamente, p. ej. "diagram").
OFF_TOPIC_WORDS = ("figurine", "statue", "sculpture", "toy", "plush", "logo", "stamp", "coin", "poster",
                   "cartoon", "emoji", "flag", "map", "diagram", "drawing", "illustration", "museum")


def looks_off_topic(title: str, query: str) -> bool:
    t, q = title.lower(), query.lower()
    return any(w in t and w not in q for w in OFF_TOPIC_WORDS)


def commons_thumb_url(original_url: str, original_width: int) -> str | None:
    """URL de la miniatura estándar más grande que sea MENOR que el original.

    .../commons/a/ab/Nombre.jpg  ->  .../commons/thumb/a/ab/Nombre.jpg/1280px-Nombre.jpg
    """
    steps = [w for w in THUMB_STEPS if w < original_width]
    if not steps or "/commons/" not in original_url:
        return None
    base, path = original_url.split("?")[0].split("/commons/", 1)
    name = path.rsplit("/", 1)[-1]
    return f"{base}/commons/thumb/{path}/{steps[-1]}px-{name}"


def _session() -> requests.Session:
    s = requests.Session()
    s.headers["User-Agent"] = USER_AGENT
    ca = env("BIOTUBE_CA_BUNDLE")
    if ca:
        s.verify = ca
    return s


def _get_json(url: str, params: dict, headers: dict | None = None, retries: int = 4) -> dict:
    """GET con reintentos. Si el servidor responde 429 (demasiadas peticiones)
    esperamos lo que diga su cabecera Retry-After (o 2, 4, 8... segundos)."""
    for attempt in range(retries + 1):
        resp = _session().get(url, params=params, headers=headers, timeout=20)
        if resp.status_code == 429 and attempt < retries:
            wait = float(resp.headers.get("Retry-After", 2 ** (attempt + 1)))
            print(f"[media] límite de peticiones, espero {wait:.0f}s...")
            time.sleep(min(wait, 60))
            continue
        resp.raise_for_status()
        return resp.json()
    return {}


def _strip_html(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def license_ok(license_name: str) -> bool:
    return is_commercial_license(license_name, load_config()["media"]["allowed_licenses"])


def search_wikimedia(query: str, limit: int = 12, portrait: bool = False) -> list[dict]:
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"{query} filetype:bitmap",
        "gsrnamespace": 6,
        "gsrlimit": limit,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size|mime",
    }
    data = _get_json(COMMONS_API, params)
    pages = sorted(data.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
    results = []
    for page in pages:
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        lic = meta.get("LicenseShortName", {}).get("value", "")
        thumb = commons_thumb_url(info.get("url", ""), info.get("width", 0))
        if info.get("mime") not in ("image/jpeg", "image/png") or not thumb:
            continue
        if looks_off_topic(page.get("title", ""), query):
            continue
        if not license_ok(lic):
            continue
        artist = _strip_html(meta.get("Artist", {}).get("value", "")) or "Autor desconocido"
        results.append(
            {
                "provider": "wikimedia",
                "download_url": thumb,
                "source_url": info.get("descriptionurl"),
                "license": lic,
                "attribution": f"{artist}, {lic}, vía Wikimedia Commons ({info.get('descriptionurl')})",
                "width": info.get("width"),
                "height": info.get("height"),
            }
        )
    if portrait:
        results.sort(key=lambda r: -(r["height"] / max(r["width"], 1)))
    return results


def search_pexels(query: str, limit: int = 10, portrait: bool = False) -> list[dict]:
    key = env("PEXELS_API_KEY")
    if not key:
        return []
    data = _get_json(
        "https://api.pexels.com/v1/search",
        {"query": query, "per_page": limit, "orientation": "portrait" if portrait else "landscape"},
        headers={"Authorization": key},
    )
    return [
        {
            "provider": "pexels",
            "download_url": p["src"]["large2x"],
            "source_url": p["url"],
            "license": "pexels",
            "attribution": f"Foto de {p['photographer']} en Pexels ({p['url']})",
            "width": p["width"],
            "height": p["height"],
        }
        for p in data.get("photos", [])
    ]


SEARCHERS = {"wikimedia": search_wikimedia, "pexels": search_pexels}


def placeholder(text: str, out: Path, size: tuple[int, int]) -> dict:
    """Tarjeta con degradado verde y el texto: nunca falla y es 100 % propia."""
    w, h = size
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        draw.line([(0, y), (w, y)], fill=(int(10 + 20 * t), int(60 + 50 * t), int(45 + 30 * t)))
    if text:
        font = _font(int(h * 0.06))
        wrapped = _wrap(draw, text, font, int(w * 0.8))
        draw.multiline_text((w / 2, h / 2), wrapped, font=font, fill="white", anchor="mm", align="center", spacing=12)
    img.save(out, quality=92)
    return {"provider": "placeholder", "path": str(out), "license": "own", "attribution": None, "source_url": None}


def fetch_image(query: str, *, portrait: bool = False, exclude: set[str] | None = None,
                fallback_queries: list[str] | None = None) -> dict:
    """Devuelve la primera imagen válida no usada todavía (`exclude` = source_urls).

    Si la búsqueda no da nada, prueba `fallback_queries` (p. ej. el nombre científico).
    """
    for q in [query, *(fallback_queries or [])]:
        found = _fetch_one(q, portrait=portrait, exclude=exclude)
        if found["provider"] != "placeholder":
            return found
    return found


def _fetch_one(query: str, *, portrait: bool = False, exclude: set[str] | None = None) -> dict:
    cfg = load_config()
    cache_dir = cfg.path("cache") / "images"
    cache_dir.mkdir(parents=True, exist_ok=True)
    exclude = exclude or set()
    size = (1080, 1920) if portrait else (1920, 1080)

    for provider in cfg["media"]["providers"]:
        try:
            candidates = SEARCHERS[provider](query, portrait=portrait)
        except (requests.RequestException, ValueError) as e:
            print(f"[media] {provider} falló para '{query}': {e}")
            continue
        for cand in candidates:
            if cand["source_url"] in exclude:
                continue
            name = hashlib.sha1(cand["download_url"].encode()).hexdigest()[:16]
            path = cache_dir / f"{name}.jpg"
            meta_path = path.with_suffix(".json")
            if not path.exists():
                try:
                    time.sleep(1)  # cortesía con servidores gratuitos
                    resp = _session().get(cand["download_url"], timeout=60)
                    resp.raise_for_status()
                    path.write_bytes(resp.content)
                    Image.open(path).convert("RGB").save(path, quality=92)  # normaliza a JPEG
                except (requests.RequestException, OSError) as e:
                    path.unlink(missing_ok=True)
                    status = getattr(getattr(e, "response", None), "status_code", None)
                    print(f"[media] descarga fallida ({status or e.__class__.__name__}) {cand['source_url']}")
                    if status == 429:  # el servidor pide calma: no insistimos con más candidatos
                        break
                    continue
            cand["path"] = str(path)
            meta_path.write_text(json.dumps(cand, ensure_ascii=False, indent=2), encoding="utf-8")
            return cand

    out = cache_dir / f"ph-{hashlib.sha1(f'{query}{portrait}'.encode()).hexdigest()[:12]}.jpg"
    # Sin texto: el rótulo de la escena ya va en la capa superior
    return placeholder("", out, size)


# --- utilidades de texto compartidas con render.py ----------------------------

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]


def _font(size: int) -> ImageFont.FreeTypeFont:
    custom = Path(__file__).resolve().parent.parent / "assets" / "font.ttf"
    for path in [custom, *map(Path, FONT_CANDIDATES)]:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> str:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines)
