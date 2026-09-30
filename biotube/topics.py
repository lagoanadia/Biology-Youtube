"""Banco de temas: cargar, elegir el siguiente y marcarlo como usado."""
from __future__ import annotations

from dataclasses import dataclass, field

import yaml

from .config import load_config


@dataclass
class Topic:
    topic: str
    category: str
    subcategory: str
    species: list[str] = field(default_factory=list)
    status: str = "pending"


def load_topics() -> list[Topic]:
    path = load_config().path("topic_bank")
    with open(path, encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}
    return [Topic(**t) for t in raw.get("topics", [])]


def save_topics(topics: list[Topic]) -> None:
    path = load_config().path("topic_bank")
    data = {"topics": [t.__dict__ for t in topics]}
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False, width=200)


def score_topic(
    topic: Topic,
    category_weights: dict[str, float] | None = None,
    subcategory_weights: dict[str, float] | None = None,
    research_scores: dict[str, float] | None = None,
) -> float:
    """Puntuación = rendimiento histórico de la categoría x oportunidad en YouTube.

    - category_weights / subcategory_weights vienen de insights.py
      (1.0 = media del canal, 1.5 = rinde un 50 % mejor que la media).
    - research_scores viene de research.py (demanda / competencia).
    Si no hay datos, todo vale 1.0 y se respeta el orden del banco.
    """
    score = 1.0
    score *= (category_weights or {}).get(topic.category, 1.0)
    score *= (subcategory_weights or {}).get(topic.subcategory, 1.0)
    score *= (research_scores or {}).get(topic.topic, 1.0)
    return score


def pick_next_topic(topics: list[Topic], **weights) -> Topic | None:
    pending = [t for t in topics if t.status == "pending"]
    if not pending:
        return None
    # max() es estable: ante empate gana el primero del banco
    return max(pending, key=lambda t: score_topic(t, **weights))


def mark_used(topic_text: str) -> None:
    topics = load_topics()
    for t in topics:
        if t.topic == topic_text:
            t.status = "used"
    save_topics(topics)
