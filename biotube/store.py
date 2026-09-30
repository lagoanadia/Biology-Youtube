"""Guardar y cargar paquetes de vídeo (YAML para ejemplos editables, JSON para los generados)."""
from __future__ import annotations

import json
from pathlib import Path

import yaml

from .config import load_config
from .models import VideoPackage


def load_package(path: str | Path) -> VideoPackage:
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    data = yaml.safe_load(text) if path.suffix in (".yaml", ".yml") else json.loads(text)
    return VideoPackage.model_validate(data)


def package_path(pkg_id: str) -> Path:
    """Los paquetes (JSON ligeros) se versionan en git; los MP4 pesados van a output/."""
    return load_config().path("packages") / f"{pkg_id}.json"


def save_package(pkg: VideoPackage) -> Path:
    path = package_path(pkg.id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(pkg.model_dump_json(indent=2), encoding="utf-8")
    return path


def all_packages() -> list[VideoPackage]:
    root = load_config().path("packages")
    return [load_package(p) for p in sorted(root.glob("*.json"))] if root.exists() else []
