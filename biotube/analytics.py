"""Recogida de métricas de YouTube y almacenamiento en SQLite.

Tablas:
- videos:      un registro por vídeo subido, con NUESTRAS etiquetas
               (categoría, subcategoría, tipo de gancho...). Esto es la clave:
               YouTube no sabe que un vídeo es "insectos + gancho de shock",
               nosotros sí, y así podemos cruzar esa información con las métricas.
- daily_stats: métricas diarias por vídeo (YouTube Analytics API).

Modo demo: `generate_demo_data()` crea datos sintéticos en otra base de datos
(data/demo.db) para poder ver el dashboard antes de tener un canal con historia.
"""
from __future__ import annotations

import random
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

from .config import load_config
from .models import VideoPackage

SCHEMA = """
CREATE TABLE IF NOT EXISTS videos (
    video_id     TEXT PRIMARY KEY,
    package_id   TEXT,
    kind         TEXT,          -- documentary | short
    short_index  INTEGER,
    title        TEXT,
    topic        TEXT,
    category     TEXT,
    subcategory  TEXT,
    hook_type    TEXT,
    publish_at   TEXT,
    duration_s   REAL
);
CREATE TABLE IF NOT EXISTS daily_stats (
    video_id                  TEXT,
    day                       TEXT,
    views                     INTEGER,
    minutes_watched           REAL,
    avg_view_duration         REAL,
    avg_view_percentage       REAL,
    likes                     INTEGER,
    comments                  INTEGER,
    shares                    INTEGER,
    subscribers_gained        INTEGER,
    estimated_revenue         REAL,
    PRIMARY KEY (video_id, day)
);
"""

METRICS = "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained"


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    path = db_path or load_config().path("database")
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def register_package(pkg: VideoPackage, conn: sqlite3.Connection | None = None) -> None:
    conn = conn or connect()
    doc = pkg.documentary
    for up in pkg.youtube.get("uploads", []):
        is_doc = up["kind"] == "documentary"
        duration = pkg.assets.get("documentary_seconds") if is_doc else pkg.assets.get("shorts_seconds", {}).get(str(up["index"]))
        conn.execute(
            "INSERT OR REPLACE INTO videos VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (up["video_id"], pkg.id, up["kind"], up["index"], up["title"], doc.topic,
             doc.category, doc.subcategory, doc.hook_type, up["publish_at"], duration),
        )
    conn.commit()


def fetch_stats(days: int = 90, conn: sqlite3.Connection | None = None) -> int:
    """Descarga métricas diarias de todos los vídeos registrados. Devuelve nº de filas."""
    from .youtube_client import analytics_service

    conn = conn or connect()
    yta = analytics_service()
    end = date.today()
    start = end - timedelta(days=days)
    rows = 0
    for (video_id,) in conn.execute("SELECT video_id FROM videos").fetchall():
        report = yta.reports().query(
            ids="channel==MINE", startDate=start.isoformat(), endDate=end.isoformat(),
            metrics=METRICS, dimensions="day", filters=f"video=={video_id}", sort="day",
        ).execute()
        revenue = {}
        try:  # solo funciona si el canal está en el Programa de Partners
            rev = yta.reports().query(
                ids="channel==MINE", startDate=start.isoformat(), endDate=end.isoformat(),
                metrics="estimatedRevenue", dimensions="day", filters=f"video=={video_id}",
            ).execute()
            revenue = {r[0]: r[1] for r in rev.get("rows", [])}
        except Exception:
            pass
        for r in report.get("rows", []):
            conn.execute(
                "INSERT OR REPLACE INTO daily_stats VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (video_id, r[0], *r[1:], revenue.get(r[0], 0.0)),
            )
            rows += 1
    conn.commit()
    return rows


# ------------------------------------------------------------------ demo

DEMO_TOPICS = [
    ("La avispa esmeralda que convierte cucarachas en zombis", "animal", "insectos", "shock"),
    ("La Venus atrapamoscas sabe contar", "planta", "carnivoras", "pregunta"),
    ("La rana de cristal que esconde su sangre", "animal", "anfibios", "misterio"),
    ("El escarabajo que se orienta con la Vía Láctea", "animal", "insectos", "superlativo"),
    ("La flor cadáver que calienta su olor", "planta", "flores", "shock"),
    ("El hongo que brilla en la oscuridad", "hongo", "bioluminiscencia", "misterio"),
    ("El pulpo que imita a otros animales", "animal", "cefalopodos", "pregunta"),
    ("La babosa que roba cloroplastos", "animal", "moluscos", "misterio"),
    ("El moho que resuelve laberintos", "microorganismo", "protistas", "pregunta"),
    ("La orquídea que imita a una abeja", "planta", "orquideas", "historia"),
    ("La lagartija que dispara sangre por los ojos", "animal", "reptiles", "shock"),
    ("La medusa inmortal", "animal", "cnidarios", "superlativo"),
]
# "Verdad oculta" del demo para que el análisis tenga algo que encontrar
DEMO_EFFECT = {"insectos": 1.6, "carnivoras": 1.4, "reptiles": 1.3, "shock": 1.35, "misterio": 1.15, "historia": 0.8}


def generate_demo_data(db_path: Path | None = None, seed: int = 7) -> Path:
    path = db_path or load_config().path("database").with_name("demo.db")
    path.unlink(missing_ok=True)
    conn = connect(path)
    rng = random.Random(seed)
    start = date.today() - timedelta(days=7 * len(DEMO_TOPICS) // 2 + 14)
    growth = 1.0
    for i, (topic, cat, sub, hook) in enumerate(DEMO_TOPICS):
        publish = start + timedelta(days=i * 3.5)
        effect = DEMO_EFFECT.get(sub, 1.0) * DEMO_EFFECT.get(hook, 1.0)
        growth *= 1.12  # el canal crece poco a poco
        for kind, idx in [("documentary", 0)] + [("short", k) for k in range(4)]:
            vid = f"demo{i:02d}{kind[0]}{idx}"
            pub = publish + timedelta(days=0 if kind == "documentary" else idx + 1)
            duration = rng.uniform(510, 690) if kind == "documentary" else rng.uniform(42, 58)
            conn.execute("INSERT INTO videos VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                         (vid, f"demo-{i}", kind, idx, f"{topic}{'' if kind == 'documentary' else f' (short {idx + 1})'}",
                          topic, cat, sub, hook, datetime.combine(pub, datetime.min.time()).isoformat() + "Z", duration))
            base = (180 if kind == "documentary" else 900) * effect * growth * rng.uniform(0.6, 1.5)
            retention = min(0.92, (0.38 if kind == "documentary" else 0.74) * (0.85 + 0.15 * effect) * rng.uniform(0.9, 1.1))
            day = pub
            while day <= date.today():
                age = (day - pub).days
                views = int(base * (0.55 ** age if kind == "short" else 0.8 ** age) + base * 0.03 * rng.random())
                watched = views * duration * retention / 60
                subs = int(views * (0.012 if kind == "documentary" else 0.004) * effect * rng.uniform(0.5, 1.5))
                # RPM orientativo: vídeos largos ~2,5 $/1000 vistas; shorts mucho menos
                revenue = views / 1000 * (2.5 if kind == "documentary" else 0.06)
                conn.execute("INSERT INTO daily_stats VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                             (vid, day.isoformat(), views, watched, duration * retention, retention * 100,
                              int(views * 0.04), int(views * 0.004), int(views * 0.003), subs, round(revenue, 2)))
                day += timedelta(days=1)
    conn.commit()
    return path
