"""Tile the PNG stills of a short (render_lowpoly.py --frames) into one labelled contact sheet.
usage: python scripts/stills_grid.py <frames_dir> <out.jpg> [cols]"""
import glob
import sys
from pathlib import Path

from PIL import Image, ImageDraw

fs = sorted(glob.glob(sys.argv[1] + "/*.png"))
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
W, H = 270, 480
rows = (len(fs) + cols - 1) // cols
g = Image.new("RGB", (cols * W, rows * H), "black")
for i, f in enumerate(fs):
    im = Image.open(f).convert("RGB").resize((W, H))
    ImageDraw.Draw(im).text((6, 6), Path(f).stem, fill="yellow")
    g.paste(im, ((i % cols) * W, (i // cols) * H))
g.save(sys.argv[2], quality=85)
print(sys.argv[2])
