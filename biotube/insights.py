"""Análisis: ¿qué tipo de hechos funcionan mejor? ¿Qué publico después?

1. Rendimiento por vídeo en sus primeros 7 días (para comparar vídeos
   antiguos y nuevos en igualdad de condiciones).
2. Puntuación normalizada DENTRO de cada formato: un short y un documental
   no se comparan entre sí (los shorts siempre tienen más vistas).
       score = 0.5 * vistas_7d/base + 0.3 * %visto/mediana + 0.2 * subs_por_vista/mediana
   donde "base" = mediana de los 6 vídeos anteriores (el canal crece con el tiempo).
   1.0 = un vídeo "normal" de tu canal; 1.5 = un 50 % mejor.
3. Media por categoría / subcategoría / tipo de gancho, con "encogimiento"
   hacia 1.0 cuando hay pocos vídeos (con 1 solo vídeo no sabemos nada;
   con 10 ya empezamos a fiarnos). Es una idea de estadística bayesiana:
       peso = (suma_scores + K * 1.0) / (n + K)     con K = 2
4. Esos pesos alimentan topics.pick_next_topic() y las notas que se pasan
   a Claude para escribir el siguiente guion.
"""
from __future__ import annotations

import sqlite3
from collections import defaultdict
from statistics import median

from pydantic import BaseModel, Field

SHRINK_K = 2.0
WINDOW_DAYS = 7
BASELINE_N = 6


def video_performance(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        f"""
        SELECT v.*,
               SUM(CASE WHEN julianday(s.day) - julianday(substr(v.publish_at,1,10)) < {WINDOW_DAYS} THEN s.views ELSE 0 END) AS views_7d,
               SUM(s.views)               AS views,
               SUM(s.minutes_watched)     AS minutes,
               SUM(s.subscribers_gained)  AS subs,
               SUM(s.estimated_revenue)   AS revenue,
               SUM(s.likes)               AS likes,
               SUM(s.comments)            AS comments,
               SUM(s.avg_view_percentage * s.views) / NULLIF(SUM(s.views), 0) AS view_pct
        FROM videos v LEFT JOIN daily_stats s ON s.video_id = v.video_id
        GROUP BY v.video_id
        """
    ).fetchall()
    videos = [dict(r) for r in rows]
    for v in videos:
        for k in ("views_7d", "views", "minutes", "subs", "revenue", "likes", "comments", "view_pct"):
            v[k] = v[k] or 0
        v["subs_per_1k"] = 1000 * v["subs"] / v["views"] if v["views"] else 0

    for kind in ("documentary", "short"):
        group = sorted((v for v in videos if v["kind"] == kind and v["views"] > 0), key=lambda v: v["publish_at"])
        if not group:
            continue
        med = {k: median([v[k] for v in group]) or 1 for k in ("view_pct", "subs_per_1k")}
        for i, v in enumerate(group):
            # Línea base móvil: el canal crece, así que comparar vistas con TODO el
            # histórico favorecería siempre a los vídeos nuevos. Comparamos con la
            # mediana de los BASELINE_N vídeos anteriores del mismo formato.
            window = group[max(0, i - BASELINE_N):i]
            if len(window) < 3:  # primeros vídeos: completamos con los siguientes más cercanos
                window += group[i + 1 : i + 1 + 3 - len(window)]
            base = median([p["views_7d"] for p in window] or [v["views_7d"]]) or 1
            v["score"] = round(
                0.5 * v["views_7d"] / base
                + 0.3 * v["view_pct"] / med["view_pct"]
                + 0.2 * v["subs_per_1k"] / med["subs_per_1k"],
                3,
            )
    for v in videos:
        v.setdefault("score", None)
    return videos


def group_weights(videos: list[dict], field: str) -> dict[str, dict]:
    """Media (encogida hacia 1.0) del score por valor de `field`."""
    buckets: dict[str, list[float]] = defaultdict(list)
    for v in videos:
        if v["score"] is not None and v.get(field):
            buckets[v[field]].append(v["score"])
    stats = {
        key: {
            "n": len(scores),
            "raw": round(sum(scores) / len(scores), 3),
            "weight": round((sum(scores) + SHRINK_K) / (len(scores) + SHRINK_K), 3),
        }
        for key, scores in buckets.items()
    }
    # Ordenado por el peso ajustado: es el valor en el que confiamos
    return dict(sorted(stats.items(), key=lambda kv: -kv[1]["weight"]))


def channel_summary(conn: sqlite3.Connection) -> dict:
    row = conn.execute(
        "SELECT SUM(views) views, SUM(minutes_watched) minutes, SUM(subscribers_gained) subs, SUM(estimated_revenue) revenue FROM daily_stats"
    ).fetchone()
    daily = conn.execute(
        """SELECT s.day, v.kind, SUM(s.views) views, SUM(s.subscribers_gained) subs, SUM(s.estimated_revenue) revenue
           FROM daily_stats s JOIN videos v USING(video_id) GROUP BY s.day, v.kind ORDER BY s.day"""
    ).fetchall()
    return {"totals": {k: row[k] or 0 for k in row.keys()}, "daily": [dict(r) for r in daily]}


def analyze(conn: sqlite3.Connection) -> dict:
    videos = video_performance(conn)
    return {
        "videos": videos,
        "by_category": group_weights(videos, "category"),
        "by_subcategory": group_weights(videos, "subcategory"),
        "by_hook": group_weights(videos, "hook_type"),
        "summary": channel_summary(conn),
    }


def performance_notes(analysis: dict, top: int = 3) -> str:
    """Resumen en texto para dárselo a Claude al escribir el siguiente guion."""
    lines = []
    hooks = analysis["by_hook"]
    if hooks:
        best = list(hooks.items())[:top]
        lines.append("Ganchos que mejor funcionan: " + ", ".join(f"{k} ({v['raw']:.2f}x, n={v['n']})" for k, v in best))
    subs = analysis["by_subcategory"]
    if subs:
        best = list(subs.items())[:top]
        lines.append("Subcategorías con mejor rendimiento: " + ", ".join(f"{k} ({v['raw']:.2f}x)" for k, v in best))
    docs = [v for v in analysis["videos"] if v["kind"] == "documentary" and v["views"]]
    if docs:
        avg_pct = sum(v["view_pct"] for v in docs) / len(docs)
        lines.append(f"Retención media de documentales: {avg_pct:.0f} % del vídeo. "
                     + ("Hay que reforzar el gancho y los bucles abiertos." if avg_pct < 40 else "Mantener el ritmo actual."))
    return "\n".join(f"- {line}" for line in lines)


def recommend_topics(analysis: dict, topics, research_scores: dict[str, float] | None = None, n: int = 5) -> list[dict]:
    from .topics import score_topic

    cat_w = {k: v["weight"] for k, v in analysis["by_category"].items()}
    sub_w = {k: v["weight"] for k, v in analysis["by_subcategory"].items()}
    scored = [
        {"topic": t.topic, "category": t.category, "subcategory": t.subcategory,
         "score": round(score_topic(t, cat_w, sub_w, research_scores), 3)}
        for t in topics if t.status == "pending"
    ]
    return sorted(scored, key=lambda x: -x["score"])[:n]


# ------------------------------------------------------------------ ideas nuevas con Claude

class TopicIdea(BaseModel):
    topic: str = Field(description="Frase gancho del tema, en el idioma del canal")
    category: str
    subcategory: str
    species: list[str]
    why: str = Field(description="Por qué encaja con lo que funciona en el canal")


class TopicIdeas(BaseModel):
    ideas: list[TopicIdea]


def suggest_new_topics(analysis: dict, existing: list[str], n: int = 10) -> list[TopicIdea]:
    """Pide a Claude temas nuevos inspirados en lo que mejor funciona (necesita API key)."""
    from .scriptwriter import _structured_call

    prompt = f"""Propón {n} temas nuevos para el canal: hechos poco conocidos, verificables y sorprendentes
de animales, plantas, hongos o microorganismos.

Datos de rendimiento del canal:
{performance_notes(analysis)}

Temas ya cubiertos o en cola (no los repitas):
{chr(10).join('- ' + t for t in existing)}

Equilibra: ~70 % parecidos a lo que funciona, ~30 % exploración de categorías nuevas."""
    return _structured_call(prompt, TopicIdeas).ideas
