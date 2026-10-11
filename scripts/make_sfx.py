"""Synthesize the low-poly shorts' sound effects with ffmpeg (made by us = no license or Content ID risk).

    python scripts/make_sfx.py      -> assets/sfx/shimmer.wav, assets/sfx/squish.wav
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from biotube import ffmpeg

SFX = ROOT / "assets" / "sfx"

# Gentle shimmer: four bell-like partials (G6 C7 E7 G7) entering one after another, each fading out.
notes = [(1568, 0.00), (2093, 0.07), (2637, 0.14), (3136, 0.21)]
expr = "+".join(f"0.22*sin(2*PI*{f}*t)*exp(-2.6*max(t-{d},0))*gte(t,{d})" for f, d in notes)
ffmpeg.run(["-f", "lavfi", "-i", f"aevalsrc='{expr}':s=44100:d=1.6", "-af",
            "tremolo=f=9:d=0.25,afade=t=in:d=0.02,afade=t=out:st=1.2:d=0.4,aecho=0.6:0.5:70:0.3",
            str(SFX / "shimmer.wav")])

# Soft squish: low pitch-dropping blob (180 → 80 Hz) + muffled wet noise, 0.4 s.
ffmpeg.run(["-f", "lavfi", "-i", "aevalsrc='0.5*sin(2*PI*(180*t-125*t*t))*exp(-7*t)':s=44100:d=0.45",
            "-f", "lavfi", "-i", "anoisesrc=d=0.45:c=brown:a=0.35:r=44100",
            "-filter_complex", "[1:a]lowpass=f=700,afade=t=in:d=0.03,afade=t=out:st=0.08:d=0.3[n];"
            "[0:a][n]amix=inputs=2:normalize=0,lowpass=f=1800,afade=t=out:st=0.3:d=0.15",
            str(SFX / "squish.wav")])
print(SFX / "shimmer.wav", SFX / "squish.wav")
