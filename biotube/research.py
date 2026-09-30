"""Investigación de temas usando datos públicos de YouTube.

Idea: para cada tema candidato buscamos en YouTube vídeos sobre la especie
y miramos tres señales:

- demanda:   mediana de visitas de los vídeos que salen arriba.
- outliers:  mediana de (visitas / suscriptores del canal). Si canales pequeños
             consiguen muchas visitas con ese tema, el tema "tira" por sí solo:
             justo lo que necesita un canal nuevo.
- saturación: cuántos de esos vídeos son recientes (<180 días). Mucha
             competencia reciente = más difícil destacar.

Coste de cuota: search.list = 100 unidades por tema (+2 por videos/channels.list).
Con la cuota diaria de 10 000 unidades puedes investigar ~20 temas al día
y aún te queda cuota para subir vídeos, así que ejecútalo 1 vez por semana.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from statistics import median

from .config import load_config
from .topics import Topic


def compute_opportunity(videos: list[dict], now: datetime | None = None) -> dict:
    """Función pura (fácil de testear). `videos` = [{views, subscribers, published_at}]."""
    now = now or datetime.now(timezone.utc)
    if not videos:
        return {"demand": 0.0, "outlier": 0.0, "saturation": 0.0, "score": 1.0}

    views = [max(v["views"], 0) for v in videos]
    ratios = [v["views"] / max(v["subscribers"], 100) for v in videos]
    recent = [
        v for v in videos if now - datetime.fromisoformat(v["published_at"].replace("Z", "+00:00")) < timedelta(days=180)
    ]

    demand = math.log10(median(views) + 1)          # 0..~8
    outlier = min(median(ratios), 20.0)              # ratio acotado
    saturation = len(recent) / len(videos)           # 0..1

    # Puntuación relativa alrededor de 1.0 (1.0 = neutro)
    score = (0.5 + demand / 10) * (0.7 + outlier / 10) * (1.2 - 0.5 * saturation)
    return {
        "demand": round(demand, 2),
        "outlier": round(outlier, 2),
        "saturation": round(saturation, 2),
        "score": round(score, 3),
    }


def fetch_topic_videos(youtube, query: str, region: str, language: str, max_results: int = 15) -> list[dict]:
    search = (
        youtube.search()
        .list(
            q=query,
            part="id",
            type="video",
            maxResults=max_results,
            order="relevance",
            regionCode=region,
            relevanceLanguage=language,
            safeSearch="strict",
        )
        .execute()
    )
    ids = [item["id"]["videoId"] for item in search.get("items", [])]
    if not ids:
        return []
    vids = youtube.videos().list(part="statistics,snippet", id=",".join(ids)).execute()["items"]
    channel_ids = list({v["snippet"]["channelId"] for v in vids})
    chans = youtube.channels().list(part="statistics", id=",".join(channel_ids[:50])).execute()["items"]
    subs = {c["id"]: int(c["statistics"].get("subscriberCount", 0) or 0) for c in chans}
    return [
        {
            "title": v["snippet"]["title"],
            "views": int(v["statistics"].get("viewCount", 0)),
            "subscribers": subs.get(v["snippet"]["channelId"], 0),
            "published_at": v["snippet"]["publishedAt"],
        }
        for v in vids
    ]


def research_topics(topics: list[Topic], youtube=None) -> dict[str, dict]:
    from .youtube_client import youtube_service

    cfg = load_config()
    youtube = youtube or youtube_service()
    results: dict[str, dict] = {}
    for t in topics:
        # Buscamos por especie (más preciso) y por el tema en el idioma del canal
        query = f"{t.species[0]} {t.subcategory}" if t.species else t.topic
        videos = fetch_topic_videos(youtube, query, cfg["channel"]["region"], cfg["channel"]["language"])
        results[t.topic] = compute_opportunity(videos) | {"sample": len(videos)}
        print(f"  {results[t.topic]['score']:.2f}  {t.topic}")

    out = cfg.path("database").parent / "research.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    return results


def load_research_scores() -> dict[str, float]:
    path = load_config().path("database").parent / "research.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {k: v["score"] for k, v in data.items()}
