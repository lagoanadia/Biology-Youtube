"""Render the long-form 16:9 story documentary exactly like the approved v4 (Kokoro "am_michael" narrator).

Usage (takes ~15 min, run it in the background):
    python scripts/render_documentary.py documentaries/en/deep-sea-weirdest.yaml

Needs `pip install kokoro` (Apache 2.0, runs on CPU, downloads hexgrad/Kokoro-82M the first time).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # repo root, so `biotube` imports

from biotube.config import load_config
from biotube.render import render_documentary_story
from biotube.store import load_package

cfg = load_config()
cfg["editing"].update(style="documentary", transition_seconds=1.0, music_volume=0, ambience_duck=True,
                      doc_sentence_pause=0.3, doc_lead=1.5, doc_lead_intro=2.0, doc_tail=1.2)
cfg["voice"].update(provider="kokoro", voice_en="am_michael", rate="-3%", pitch="+0Hz", broadcast_eq=True)

pkg = load_package(sys.argv[1])
print(render_documentary_story(pkg, cfg.path("output") / pkg.id))
