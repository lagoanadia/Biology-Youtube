"""Publicación automática de un paquete en YouTube.

Pasos:
 1. Comprobaciones de monetización (compliance). Si hay errores, NO se sube nada.
 2. Se calcula el calendario (scheduler) sin pisar lo ya programado.
 3. Se sube el documental (privado + publishAt) con descripción SEO,
    capítulos, fuentes y créditos de imágenes, y su miniatura.
 4. Se suben los shorts, cada uno enlazando al documental.
 5. Se registra todo en el paquete y en la base de datos de analítica,
    para después poder medir qué funciona.

Con --dry-run se hace todo excepto hablar con YouTube: sirve para revisar.
"""
from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone

from . import analytics
from .compliance import check_package, has_blockers
from .config import load_config
from .models import VideoPackage
from .scheduler import plan_package, taken_days_from_packages
from .seo import build_description, clean_tags
from .store import all_packages, save_package


def _attributions(pkg: VideoPackage) -> list[str]:
    seen = []
    for img in pkg.assets.get("images", []):
        a = img.get("attribution")
        if a and a not in seen:
            seen.append(a)
    return seen


def build_upload_plan(pkg: VideoPackage, now: datetime | None = None) -> list[dict]:
    cfg = load_config()
    others = [p for p in all_packages() if p.id != pkg.id]
    taken_docs, taken_shorts = taken_days_from_packages(others)
    last = max(
        (datetime.fromisoformat(u["publish_at"].replace("Z", "+00:00"))
         for p in others for u in p.youtube.get("uploads", []) if u["kind"] == "documentary"),
        default=now or datetime.now(timezone.utc),
    )
    slots = plan_package(len(pkg.shorts), after=max(last, now or datetime.now(timezone.utc)),
                         taken_doc_days=taken_docs, taken_short_days=taken_shorts)
    lang = pkg.language
    defaults = cfg["channel"].get(f"default_hashtags_{lang}") or cfg["channel"]["default_hashtags"]
    chapters = [tuple(c) for c in pkg.assets.get("chapters_seconds", [])]

    plan = [{
        "kind": "documentary",
        "index": 0,
        "file": pkg.assets.get("documentary"),
        "thumbnail": pkg.assets.get("thumbnail"),
        "title": pkg.documentary_metadata.title,
        "description": build_description(
            pkg.documentary_metadata, lang=lang, defaults_hashtags=defaults, is_short=False,
            chapters=chapters, script=pkg.documentary, attributions=_attributions(pkg)),
        "tags": clean_tags(pkg.documentary_metadata.tags, pkg.documentary.species),
        "publish_at": slots[0].utc_iso,
    }]
    for slot, meta in zip(slots[1:], pkg.shorts_metadata):
        plan.append({
            "kind": "short",
            "index": slot.index,
            "file": pkg.assets.get("shorts", {}).get(str(slot.index)),
            "title": meta.title,
            "description": build_description(meta, lang=lang, defaults_hashtags=defaults, is_short=True,
                                             documentary_url="{DOC_URL}", attributions=_attributions(pkg)),
            "tags": clean_tags(meta.tags, ["shorts"]),
            "publish_at": slot.utc_iso,
        })
    return plan


def publish_package(pkg: VideoPackage, dry_run: bool = False) -> VideoPackage:
    cfg = load_config()
    issues = check_package(
        pkg,
        allowed_licenses=cfg["media"]["allowed_licenses"],
        min_minutes=cfg["content"]["documentary_minutes"][0],
        wpm=cfg["content"]["words_per_minute"],
        short_max_seconds=cfg["content"]["short_max_seconds"],
        previous_narrations=[p.documentary.narration for p in all_packages() if p.id != pkg.id],
    )
    for issue in issues:
        print(f"[{issue.severity.upper()}] {issue.message}")
    if has_blockers(issues):
        raise SystemExit("Publicación cancelada: corrige los errores de arriba.")

    plan = build_upload_plan(pkg)
    needed = len(plan) * cfg["youtube"]["upload_cost_units"]
    if needed > cfg["youtube"]["daily_quota_units"]:
        raise SystemExit(f"Este paquete necesita {needed} unidades de cuota (> {cfg['youtube']['daily_quota_units']}).")

    out_dir = cfg.path("output") / pkg.id
    (out_dir / "upload_plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    if dry_run:
        for item in plan:
            print(f"  {item['publish_at']}  {item['kind']:<12} {item['title']}")
        print(f"(simulación) plan guardado en {out_dir / 'upload_plan.json'}")
        return pkg

    from .youtube_client import set_thumbnail, upload_video, youtube_service

    yt = youtube_service()
    ycfg = cfg["youtube"]
    uploads, doc_url = [], None
    for item in plan:
        if not item["file"]:
            raise SystemExit(f"Falta el vídeo renderizado para {item['kind']} {item['index']}")
        description = item["description"].replace("{DOC_URL}", doc_url or "")
        video_id = upload_video(
            yt, item["file"], title=item["title"], description=description, tags=item["tags"],
            category_id=cfg["channel"]["category_id"], language=pkg.language, publish_at=item["publish_at"],
            made_for_kids=ycfg["made_for_kids"], contains_synthetic_media=ycfg["contains_synthetic_media"],
        )
        print(f"  subido {item['kind']} -> https://youtu.be/{video_id} (se publica {item['publish_at']})")
        if item["kind"] == "documentary":
            doc_url = f"https://youtu.be/{video_id}"
            if item.get("thumbnail"):
                try:
                    set_thumbnail(yt, video_id, item["thumbnail"])
                except Exception as e:  # canal sin verificar -> no bloquea la publicación
                    print(f"  [aviso] no se pudo poner la miniatura: {e}")
        uploads.append({"kind": item["kind"], "index": item["index"], "video_id": video_id,
                        "publish_at": item["publish_at"], "title": item["title"]})

    pkg.youtube = {"uploads": uploads, "uploaded_at": datetime.now(timezone.utc).isoformat()}
    save_package(pkg)
    analytics.register_package(pkg)
    return pkg


def write_upload_kit(pkg: VideoPackage) -> Path:
    """Guía para subir A MANO desde YouTube Studio (sin API ni OAuth): todo listo para copiar y pegar."""
    from zoneinfo import ZoneInfo

    cfg = load_config()
    tz = ZoneInfo(cfg["schedule"]["timezone"])
    es = pkg.language == "es"
    plan = build_upload_plan(pkg)
    sep = "=" * 70
    lines = [
        ("GUÍA DE SUBIDA MANUAL" if es else "MANUAL UPLOAD GUIDE") + f" · {pkg.id}",
        "YouTube Studio → Crear → Subir vídeos" if es else "YouTube Studio → Create → Upload videos",
        ("Sube primero el documental. Cuando tengas su enlace, pégalo en la descripción de cada short donde pone {DOC_URL}."
         if es else "Upload the documentary first. Then paste its link into each short's description where it says {DOC_URL}."),
        ("En cada vídeo: Audiencia → 'No, no es contenido para niños'. Detalles → Mostrar más → Contenido alterado → 'Sí' "
         "(la voz es sintética). Categoría: Educación." if es else
         "For every video: Audience → 'No, it's not made for kids'. Show more → Altered content → 'Yes' (synthetic voice). "
         "Category: Education."),
        "",
    ]
    for item in plan:
        when = datetime.fromisoformat(item["publish_at"].replace("Z", "+00:00")).astimezone(tz)
        if item["kind"] == "documentary":
            heading = "DOCUMENTAL" if es else "DOCUMENTARY"
        else:
            heading = f"SHORT {item['index'] + 1}"
        lines += [
            sep,
            heading,
            ("Archivo: " if es else "File: ") + Path(item["file"] or "?").name,
            ("Programar para: " if es else "Schedule for: ") + when.strftime("%Y-%m-%d %H:%M"),
        ]
        if item.get("thumbnail"):
            lines.append(("Miniatura: " if es else "Thumbnail: ") + Path(item["thumbnail"]).name)
        lines += ["", ("TÍTULO:" if es else "TITLE:"), item["title"], "",
                  ("DESCRIPCIÓN:" if es else "DESCRIPTION:"), item["description"], "",
                  ("ETIQUETAS:" if es else "TAGS:"), ", ".join(item["tags"]), ""]
    out = cfg.path("output") / pkg.id / ("SUBIR_A_YOUTUBE.txt" if es else "UPLOAD_TO_YOUTUBE.txt")
    out.write_text("\n".join(lines), encoding="utf-8")
    return out
