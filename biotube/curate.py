"""Selección manual de visuales: mosaico numerado de candidatas para elegir a ojo.

Uso:
    python -m biotube curate "Hyalinobatrachium" --source inat
    python -m biotube curate "rainforest stream" --source openverse

Genera output/curate/<busqueda>.jpg (mosaico con números) y
output/curate/<busqueda>.json (datos de cada candidata: url, licencia, atribución).
Luego se copia la elegida al bloque `curated:` del paquete, p. ej.:
    short1.beat3: {type: photo, url: ..., license: ..., attribution: ..., source_url: ...}
"""
from __future__ import annotations

import io
import json

from PIL import Image, ImageDraw

from .config import load_config
from .media import INAT_LICENSES, OPENVERSE_LICENSES, _font, _get_json, _session
from .models import slugify


def inat_candidates(taxon: str, pages: int = 2) -> list[dict]:
    out = []
    for page in range(1, pages + 1):
        data = _get_json("https://api.inaturalist.org/v1/observations", {
            "taxon_name": taxon, "photo_license": ",".join(INAT_LICENSES), "quality_grade": "research",
            "photos": "true", "per_page": 30, "page": page, "order_by": "votes"})
        for obs in data.get("results", []):
            for p in obs.get("photos", []):
                lic = INAT_LICENSES.get(p.get("license_code") or "")
                if not lic or (p.get("original_dimensions") or {}).get("width", 0) < 1000:
                    continue
                pid = p["id"]
                who = (p.get("attribution") or "").replace("(c) ", "").split(",")[0]
                out.append({"type": "photo", "url": p["url"].replace("/square.", "/large."), "license": lic,
                            "source_url": f"https://www.inaturalist.org/photos/{pid}",
                            "attribution": f"{who}, {lic}, vía iNaturalist (https://www.inaturalist.org/photos/{pid})",
                            "thumb": p["url"].replace("/square.", "/medium."), "note": obs.get("taxon", {}).get("name")})
    seen: set[str] = set()
    return [c for c in out if not (c["url"] in seen or seen.add(c["url"]))]


def openverse_candidates(query: str) -> list[dict]:
    data = _get_json("https://api.openverse.org/v1/images/", {
        "q": query, "license": ",".join(OPENVERSE_LICENSES), "page_size": 20, "mature": "false"})
    out = []
    for r in data.get("results", []):
        lic = OPENVERSE_LICENSES.get(r.get("license", ""))
        if not lic or (r.get("width") or 0) < 900 or r.get("source") in ("wikimedia", "phylopic"):
            continue
        full = f"{lic} {r.get('license_version') or ''}".strip()
        out.append({"type": "photo", "url": r["url"], "license": full, "source_url": r.get("foreign_landing_url"),
                    "attribution": f"{r.get('creator') or 'Unknown'}, {full}, vía {r.get('source')} ({r.get('foreign_landing_url')})",
                    "thumb": r.get("thumbnail") or r["url"], "note": (r.get("title") or "")[:40]})
    return out


def build_grid(cands: list[dict], out_jpg, cols: int = 8, tile=(240, 180)) -> None:
    tw, th = tile
    rows = max(1, -(-len(cands) // cols))
    grid = Image.new("RGB", (cols * tw, rows * th), "black")
    draw = ImageDraw.Draw(grid)
    font = _font(22)
    for i, c in enumerate(cands):
        x, y = (i % cols) * tw, (i // cols) * th
        try:
            im = Image.open(io.BytesIO(_session().get(c["thumb"], timeout=30).content)).convert("RGB")
            im.thumbnail((tw, th))
            grid.paste(im, (x + (tw - im.width) // 2, y + (th - im.height) // 2))
        except Exception:
            draw.text((x + 10, y + th // 2), "sin imagen", fill="gray", font=font)
        draw.text((x + 4, y + 2), str(i), font=font, fill="yellow", stroke_width=3, stroke_fill="black")
    grid.save(out_jpg, quality=82)


def curate(query: str, source: str = "inat", limit: int = 64) -> tuple[str, str]:
    folder = load_config().path("output") / "curate"
    folder.mkdir(parents=True, exist_ok=True)
    cands = (inat_candidates(query) if source == "inat" else openverse_candidates(query))[:limit]
    name = slugify(f"{source}-{query}")
    (folder / f"{name}.json").write_text(json.dumps(cands, ensure_ascii=False, indent=1), encoding="utf-8")
    build_grid(cands, folder / f"{name}.jpg")
    return str(folder / f"{name}.jpg"), str(folder / f"{name}.json")
