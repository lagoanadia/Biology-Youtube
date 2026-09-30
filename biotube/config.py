"""Carga de configuración: config.yaml + variables de entorno (.env)."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent


class Config(dict):
    """Un dict normal con acceso por ruta: cfg.get_path("voice.voice_es")."""

    def get_path(self, dotted: str, default: Any = None) -> Any:
        node: Any = self
        for key in dotted.split("."):
            if not isinstance(node, dict) or key not in node:
                return default
            node = node[key]
        return node

    def path(self, key: str) -> Path:
        """Devuelve una ruta de la sección `paths` como Path absoluto."""
        p = Path(self["paths"][key])
        return p if p.is_absolute() else ROOT / p


@lru_cache(maxsize=None)
def load_config(path: str | None = None) -> Config:
    load_dotenv(ROOT / ".env")
    cfg_path = Path(path) if path else ROOT / "config.yaml"
    with open(cfg_path, encoding="utf-8") as f:
        return Config(yaml.safe_load(f))


def env(name: str, default: str | None = None) -> str | None:
    load_dotenv(ROOT / ".env")
    value = os.environ.get(name, default)
    return value or default
