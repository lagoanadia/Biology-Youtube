"""Pequeños ayudantes para ejecutar ffmpeg.

Usamos el binario que trae el paquete imageio-ffmpeg, así no hace falta
instalar ffmpeg en el sistema (funciona igual en Windows, Mac y Linux).
"""
from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path


def ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # pragma: no cover - respaldo al ffmpeg del sistema
        exe = shutil.which("ffmpeg")
        if not exe:
            raise RuntimeError("No se encuentra ffmpeg: pip install imageio-ffmpeg")
        return exe


def run(args: list[str]) -> None:
    cmd = [ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y", *args]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg falló:\n{' '.join(cmd)}\n{result.stderr[-2000:]}")


def run_capture(args: list[str]) -> str:
    """Como run(), pero devuelve lo que ffmpeg escribe en stderr (p. ej. el resultado de volumedetect)."""
    cmd = [ffmpeg_exe(), "-hide_banner", "-y", *args]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg falló:\n{' '.join(cmd)}\n{result.stderr[-2000:]}")
    return result.stderr


def duration(path: str | Path) -> float:
    """Duración en segundos leyendo la cabecera que imprime `ffmpeg -i`."""
    result = subprocess.run([ffmpeg_exe(), "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    match = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", result.stderr)
    if not match:
        raise RuntimeError(f"No se pudo leer la duración de {path}")
    h, m, s = match.groups()
    return int(h) * 3600 + int(m) * 60 + float(s)
