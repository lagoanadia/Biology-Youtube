"""Genera el dashboard de analítica como un único fichero HTML estático.

Por qué HTML estático y no un servidor (Streamlit, Flask...):
- Se abre con doble clic, se puede subir a GitHub Pages o mandarse por correo.
- Los datos van incrustados como JSON; los gráficos son SVG dibujados con
  JavaScript sin librerías, así que funciona sin internet.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .config import load_config
from .insights import analyze, performance_notes, recommend_topics
from .research import load_research_scores
from .topics import load_topics

TEMPLATE = Path(__file__).parent / "templates" / "dashboard.html"


def build_dashboard(conn, out: Path, demo: bool = False) -> Path:
    cfg = load_config()
    analysis = analyze(conn)
    topics = load_topics()
    data = {
        "channel": cfg["channel"]["name"],
        "generated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "demo": demo,
        "videos": [
            {k: v[k] for k in ("video_id", "kind", "title", "topic", "category", "subcategory", "hook_type",
                               "publish_at", "views", "views_7d", "view_pct", "subs", "revenue", "score")}
            for v in analysis["videos"]
        ],
        "daily": analysis["summary"]["daily"],
        "recommendations": recommend_topics(analysis, topics, load_research_scores(), n=6),
        "notes": performance_notes(analysis).splitlines(),
    }
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = TEMPLATE.read_text(encoding="utf-8").replace("__DATA__", payload)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return out
