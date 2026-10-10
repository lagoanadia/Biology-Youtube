"""Labelled contact sheet of a video clip (one frame every STEP seconds) to choose `start`, `x`, `zoom`, `cx`, `cy`.

Usage:
    python scripts/contact_sheet.py clip.mp4 sheet.jpg 4
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # repo root, so `biotube` imports
import io
import subprocess

import imageio_ffmpeg
from PIL import Image, ImageDraw

from biotube import ffmpeg
from biotube.media import _font

F = imageio_ffmpeg.get_ffmpeg_exe()
src, out, step = sys.argv[1], sys.argv[2], float(sys.argv[3])
dur = ffmpeg.duration(src)
tiles, t = [], 0.5
while t < dur:
    png = subprocess.run([F, "-v", "error", "-ss", f"{t:.2f}", "-i", src, "-frames:v", "1", "-vf", "scale=320:-2",
                          "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    if png:
        im = Image.open(io.BytesIO(png)).convert("RGB")
        ImageDraw.Draw(im).text((6, 4), f"{t:.0f}s", font=_font(24), fill="yellow", stroke_width=3, stroke_fill="black")
        tiles.append(im)
    t += step
cols = 6
w, h = tiles[0].size
sheet = Image.new("RGB", (cols * w, -(-len(tiles) // cols) * h))
for i, im in enumerate(tiles):
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out, quality=85)
print(out, len(tiles), "frames", round(dur, 1), "s")
