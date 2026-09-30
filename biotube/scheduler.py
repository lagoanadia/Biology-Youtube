"""Calendario de publicación.

Estrategia por defecto (config.yaml -> schedule):
- 2 documentales por semana (martes y viernes a las 17:00).
- Los shorts de cada documental se reparten en los días siguientes,
  como máximo 1 short al día, a las 13:00.
  => Resultado: contenido nuevo casi todos los días, con 2 estrenos "grandes" por semana.

Por qué: los shorts atraen gente nueva y la llevan al documental
(que es el que genera casi todos los ingresos por anuncios). Publicar
shorts DESPUÉS del documental permite enlazarlo desde el short.

Todas las horas se calculan en tu zona horaria y se devuelven en UTC,
que es lo que exige el campo publishAt de la API de YouTube.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from .config import load_config

WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


@dataclass
class Slot:
    kind: str          # "documentary" | "short"
    index: int         # nº de short (0..n-1); 0 para el documental
    local: datetime    # hora local (con zona horaria)

    @property
    def utc_iso(self) -> str:
        return self.local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _at(day: date, hhmm: str, tz: ZoneInfo) -> datetime:
    h, m = map(int, hhmm.split(":"))
    return datetime.combine(day, time(h, m), tzinfo=tz)


def next_documentary_slot(after: datetime, taken_days: set[date] | None = None) -> datetime:
    sched = load_config()["schedule"]
    tz = ZoneInfo(sched["timezone"])
    after = after.astimezone(tz)
    days = {WEEKDAYS.index(d) for d in sched["documentary_days"]}
    taken_days = taken_days or set()
    for offset in range(0, 15):
        day = after.date() + timedelta(days=offset)
        slot = _at(day, sched["documentary_time"], tz)
        if day.weekday() in days and slot > after + timedelta(hours=2) and day not in taken_days:
            return slot
    raise RuntimeError("No se encontró hueco para el documental")


def plan_package(
    n_shorts: int,
    after: datetime | None = None,
    taken_doc_days: set[date] | None = None,
    taken_short_days: set[date] | None = None,
) -> list[Slot]:
    """Devuelve 1 slot de documental + n_shorts slots de short."""
    sched = load_config()["schedule"]
    tz = ZoneInfo(sched["timezone"])
    after = after or datetime.now(timezone.utc)
    taken_short_days = set(taken_short_days or set())

    doc_time = next_documentary_slot(after, taken_doc_days)
    slots = [Slot("documentary", 0, doc_time)]
    day = doc_time.date()
    for i in range(n_shorts):
        day += timedelta(days=sched.get("shorts_gap_days", 1))
        while day in taken_short_days:
            day += timedelta(days=1)
        taken_short_days.add(day)
        slots.append(Slot("short", i, _at(day, sched["shorts_time"], tz)))
    return slots


def taken_days_from_packages(packages) -> tuple[set[date], set[date]]:
    """Lee qué días ya tienen publicación programada para no pisarlos."""
    tz = ZoneInfo(load_config()["schedule"]["timezone"])
    docs, shorts = set(), set()
    for pkg in packages:
        for item in pkg.youtube.get("uploads", []):
            when = datetime.fromisoformat(item["publish_at"].replace("Z", "+00:00")).astimezone(tz).date()
            (docs if item["kind"] == "documentary" else shorts).add(when)
    return docs, shorts
