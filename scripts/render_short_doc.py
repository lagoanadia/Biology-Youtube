"""Render a video-first documentary short exactly like the approved gold standard (hagfish).

Usage:
    python scripts/render_short_doc.py shorts/en/hagfish-slime-knot.yaml            # deep-sea default
    python scripts/render_short_doc.py shorts/en/orchid-mantis.yaml --ambience borneo_rainforest.mp3 --volume 0.3

Output: output/<package-id>/documentary/short_<n>.mp4 (never overwrites the approved default-style renders).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # repo root, so `biotube` imports
import argparse

from biotube.config import load_config
from biotube.render import render_short
from biotube.store import load_package

ap = argparse.ArgumentParser()
ap.add_argument("package")
ap.add_argument("--index", type=int, default=0, help="short index inside the package (0-3)")
ap.add_argument("--ambience", default="deep_sea_drone.mp3", help="file in assets/ambience/")
ap.add_argument("--volume", type=float, default=0.12, help="ambience volume (0.12 deep sea, 0.3 rainforest)")
args = ap.parse_args()

cfg = load_config()  # cached: these overrides are what render_short sees
cfg["editing"].update(style="documentary", transition_seconds=0.5, whoosh_on="none", impact_volume=0,
                      progress_bar=False, ambience=args.ambience, ambience_volume=args.volume, ambience_duck=True)
cfg["voice"].update(voice_en="en-US-AndrewMultilingualNeural", rate_shorts="+4%", pitch_shorts="-10Hz",
                    broadcast_eq=True)

pkg = load_package(args.package)
print(render_short(pkg, args.index, cfg.path("output") / pkg.id / "documentary"))
