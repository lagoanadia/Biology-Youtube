"""Tests de las partes deterministas (no llaman a APIs externas)."""
from datetime import datetime, timezone
from pathlib import Path

import pytest

from biotube.analytics import connect, generate_demo_data
from biotube.compliance import _similarity, check_package, has_blockers
from biotube.insights import analyze, group_weights, performance_notes
from biotube.models import slugify
from biotube.research import compute_opportunity
from biotube.render import caption_chunks, write_ass, write_srt
from biotube.scheduler import plan_package
from biotube.seo import build_chapters, build_description, clean_tags, normalize_hashtags, title_warnings
from biotube.shorts import split_offline
from biotube.store import load_package
from biotube.topics import Topic, pick_next_topic

EXAMPLES = sorted(Path(__file__).resolve().parent.parent.glob("examples/**/*.yaml"))
LICENSES = ["cc0", "pd", "public domain", "cc by", "cc by-sa", "pexels"]


@pytest.fixture(params=EXAMPLES, ids=lambda p: p.stem)
def pkg(request):
    return load_package(request.param)


# --- ejemplos ------------------------------------------------------------------

def test_examples_structure(pkg):
    doc = pkg.documentary
    assert 8 <= doc.estimated_minutes(150) <= 12, "el documental debe durar 8-12 min"
    assert 3 <= len(pkg.shorts) <= 4
    assert len(pkg.shorts) == len(pkg.shorts_metadata)
    assert len(doc.sources) >= 2
    for s in pkg.shorts:
        assert s.hook and s.fact and s.cta, "estructura gancho -> hecho -> CTA"
        assert s.word_count / 150 * 60 < 58, "un short no puede pasar de 60 s"


def test_examples_pass_compliance(pkg):
    issues = check_package(pkg, allowed_licenses=LICENSES)
    assert not has_blockers(issues), [i.message for i in issues]


# --- compliance -----------------------------------------------------------------

def test_compliance_blocks_noncommercial_license(pkg):
    pkg.assets["images"] = [{"provider": "wikimedia", "license": "CC BY-NC 2.0", "attribution": "x", "source_url": "u"}]
    assert has_blockers(check_package(pkg, allowed_licenses=LICENSES))


def test_compliance_blocks_duplicate_script(pkg):
    issues = check_package(pkg, allowed_licenses=LICENSES, previous_narrations=[pkg.documentary.narration])
    assert has_blockers(issues)


def test_similarity_bounds():
    assert _similarity("a b c d e", "a b c d e") == 1.0
    assert _similarity("a b c d e", "v w x y z") == 0.0


# --- shorts offline ----------------------------------------------------------------

def test_split_offline_respects_limits(pkg):
    shorts = split_offline(pkg.documentary, n=4, max_words=140)
    assert len(shorts) == 4
    assert all(s.word_count <= 140 for s in shorts)
    assert len({s.hook for s in shorts}) == 4, "cada short usa un hecho distinto"


# --- SEO ------------------------------------------------------------------------------

def test_clean_tags_limit_and_dedup():
    tags = clean_tags(["Rana", "rana", "#biologia"] + [f"etiqueta larga número {i}" for i in range(60)])
    assert tags[:2] == ["Rana", "biologia"]
    assert sum(len(t) + (2 if " " in t else 0) + 1 for t in tags) <= 500


def test_hashtags_short_first_and_max3():
    tags = normalize_hashtags(["ranas", "#anfibios"], ["#biologia", "#ciencia"], is_short=True)
    assert tags == ["#shorts", "#ranas", "#anfibios"]


def test_title_warnings():
    assert title_warnings("Título normal") == []
    assert title_warnings("ESTO ES TODO MAYÚSCULAS") != []
    assert title_warnings("x" * 101) != []


def test_chapters_need_three_and_start_at_zero():
    chapters = build_chapters([f"c{i}" for i in range(10)], [30.0] * 10, min_chapter=45)
    assert chapters[0][0] == 0 and len(chapters) >= 3
    assert all(b[0] - a[0] >= 45 for a, b in zip(chapters, chapters[1:]))
    assert build_chapters(["a", "b"], [10, 10]) == []


def test_description_contains_sources_and_disclosure(pkg):
    desc = build_description(pkg.documentary_metadata, lang="es", defaults_hashtags=["#biologia"], is_short=False,
                             chapters=[(0, "Intro"), (60, "A"), (120, "B")], script=pkg.documentary)
    assert "00:00 Intro" in desc and "Fuentes" in desc and "voz sintética" in desc
    assert len(desc) <= 5000


# --- calendario ------------------------------------------------------------------------

def test_schedule_one_short_per_day():
    after = datetime(2026, 10, 5, 8, 0, tzinfo=timezone.utc)  # lunes
    first = plan_package(4, after=after)
    assert first[0].kind == "documentary" and first[0].local.strftime("%a") == "Tue"
    short_days = {s.local.date() for s in first[1:]}
    second = plan_package(4, after=first[0].local, taken_doc_days={first[0].local.date()}, taken_short_days=short_days)
    assert second[0].local.strftime("%a") == "Fri"
    assert not short_days & {s.local.date() for s in second[1:]}, "no hay dos shorts el mismo día"
    assert first[0].utc_iso.endswith("Z")


# --- investigación y temas -----------------------------------------------------------------

def test_opportunity_prefers_small_channels_with_views():
    now = datetime(2026, 9, 1, tzinfo=timezone.utc)
    viral_small = [{"views": 500_000, "subscribers": 2_000, "published_at": "2024-01-01T00:00:00Z"}] * 5
    saturated = [{"views": 50_000, "subscribers": 5_000_000, "published_at": "2026-08-01T00:00:00Z"}] * 5
    assert compute_opportunity(viral_small, now)["score"] > compute_opportunity(saturated, now)["score"]
    assert compute_opportunity([], now)["score"] == 1.0


def test_pick_next_topic_uses_weights():
    topics = [Topic("a", "animal", "peces"), Topic("b", "planta", "carnivoras"), Topic("c", "animal", "x", status="used")]
    assert pick_next_topic(topics).topic == "a"  # sin datos: orden del banco
    assert pick_next_topic(topics, subcategory_weights={"carnivoras": 1.4}).topic == "b"


# --- analítica ---------------------------------------------------------------------------------

def test_demo_analysis_finds_planted_pattern(tmp_path):
    db = generate_demo_data(tmp_path / "demo.db")
    analysis = analyze(connect(db))
    # El demo "planta" efectos: reptiles e insectos rinden más, el gancho shock es el mejor y "historia" el peor
    assert set(list(analysis["by_subcategory"])[:2]) == {"reptiles", "insectos"}
    hooks = list(analysis["by_hook"])
    assert hooks[0] == "shock" and hooks[-1] == "historia"
    assert analysis["summary"]["totals"]["views"] > 0
    assert performance_notes(analysis)


def test_group_weights_shrink_small_samples():
    videos = [{"score": 3.0, "hook_type": "shock"}] + [{"score": 1.5, "hook_type": "pregunta"}] * 10
    w = group_weights(videos, "hook_type")
    assert w["shock"]["raw"] == 3.0 and w["shock"]["weight"] < 2.0


# --- subtítulos -----------------------------------------------------------------------------------

def test_captions_cover_duration(tmp_path):
    chunks = caption_chunks("uno dos tres cuatro cinco seis siete", 7.0, words_per_chunk=3)
    assert len(chunks) == 3 and chunks[0][0] == 0 and abs(chunks[-1][1] - 7.0) < 1e-6
    assert "Dialogue" in write_ass(chunks, tmp_path / "a.ass").read_text()
    assert "00:00:00,000 -->" in write_srt(chunks, tmp_path / "a.srt").read_text()


def test_slugify():
    assert slugify("La rana de cristal ¡invisible!") == "la-rana-de-cristal-invisible"


@pytest.mark.parametrize("lic,ok", [
    ("CC BY-SA 4.0", True), ("CC BY 2.0", True), ("CC0", True), ("Public domain", True), ("pexels", True),
    ("CC BY-NC 2.0", False), ("CC BY-NC-SA 3.0", False), ("CC BY-ND 4.0", False), ("All rights reserved", False), ("", False),
])
def test_is_commercial_license(lic, ok):
    from biotube.compliance import is_commercial_license

    assert is_commercial_license(lic, LICENSES) is ok


def test_commons_thumb_url_uses_standard_step():
    from biotube.media import commons_thumb_url

    url = "https://upload.wikimedia.org/wikipedia/commons/8/8b/Rana.jpg"
    assert commons_thumb_url(url, 2048) == "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Rana.jpg/1920px-Rana.jpg"
    assert commons_thumb_url(url, 1500).endswith("/1280px-Rana.jpg")
    assert commons_thumb_url(url, 900) is None  # demasiado pequeña para vídeo HD


def test_scriptwriter_builds_valid_request(monkeypatch):
    """Intercepta la petición HTTP a Claude (sin red ni clave) y comprueba su forma."""
    import json

    import anthropic
    import httpx2

    from biotube import scriptwriter
    from biotube.models import DocumentaryScript

    captured = {}

    def handler(request):
        captured["body"] = json.loads(request.content)
        captured["beta"] = request.headers.get("anthropic-beta")
        return httpx2.Response(400, json={"type": "error", "error": {"type": "invalid_request_error", "message": "test"}})

    client = anthropic.Anthropic(api_key="test", max_retries=0,
                                 http_client=httpx2.Client(transport=httpx2.MockTransport(handler)))
    monkeypatch.setattr(scriptwriter, "_client", lambda: client)
    with pytest.raises(anthropic.BadRequestError):
        scriptwriter._structured_call("hola", DocumentaryScript)

    body = captured["body"]
    assert body["stream"] is True and body["thinking"] == {"type": "adaptive"}
    assert body["fallbacks"] == "default" and captured["beta"] == "server-side-fallback-2026-07-01"
    schema = body["output_config"]["format"]["schema"]
    assert schema["additionalProperties"] is False and "scenes" in schema["required"]


def test_off_topic_filter():
    from biotube.media import looks_off_topic

    assert looks_off_topic("File:Small glass figurines of rabbits, a frog.JPG", "glass frog on leaf")
    assert not looks_off_topic("File:Hyalinobatrachium fleischmanni.jpg", "glass frog on leaf")
    assert not looks_off_topic("File:Insect nervous system diagram.png", "insect nervous system diagram")


def test_karaoke_captions_follow_word_timings(tmp_path):
    from biotube.render import word_groups, write_karaoke_ass

    words = [{"t": 0.0, "d": 0.3, "w": "Esta"}, {"t": 0.35, "d": 0.3, "w": "rana"},
             {"t": 1.2, "d": 0.3, "w": "duerme"}]  # pausa larga antes de "duerme"
    groups = word_groups(words)
    assert [len(g) for g in groups] == [2, 1], "la pausa corta el grupo"
    text = write_karaoke_ass(words, tmp_path / "k.ass", total=2.0).read_text()
    assert "0:00:00.35" in text and "0:00:01.20" in text, "cada palabra empieza cuando la voz la dice"
    assert text.count("Dialogue") == 3


def test_video_slug_relevance():
    from biotube.media import slug_matches

    assert slug_matches("tropical stream rainforest", "https://www.pexels.com/video/water-flowing-in-a-rainforest-123/")
    assert not slug_matches("Hyalinobatrachium fleischmanni", "https://www.pexels.com/video/a-green-frog-on-a-leaf-1/")


def test_video_clip_crops_to_vertical(tmp_path):
    from PIL import Image

    from biotube import ffmpeg
    from biotube.render import SHORT_SIZE, video_clip

    src = tmp_path / "src.mp4"
    ffmpeg.run(["-f", "lavfi", "-i", "testsrc=size=1280x720:rate=25", "-t", "2", "-pix_fmt", "yuv420p", str(src)])
    out = video_clip(str(src), Image.new("RGBA", SHORT_SIZE), 3.0, SHORT_SIZE, tmp_path / "out.mp4")
    assert abs(ffmpeg.duration(out) - 3.0) < 0.1, "el clip corto se repite hasta cubrir el plano"


def test_beat_times_follow_voice():
    from biotube.models import Beat
    from biotube.render import beat_times

    beats = [Beat(text="Esta rana,", visual="x"), Beat(text="se ve-through hoy.", visual="y")]
    words = [{"t": 0.0, "d": 0.2, "w": "Esta"}, {"t": 0.3, "d": 0.2, "w": "rana"},
             {"t": 1.0, "d": 0.2, "w": "se"}, {"t": 1.3, "d": 0.2, "w": "ve-through"}, {"t": 1.6, "d": 0.2, "w": "hoy"}]
    times = beat_times(beats, words, total=2.0)
    assert times[0][0] == 0.0 and abs(times[1][0] - 0.95) < 1e-9 and times[1][1] == 2.0


def test_sfx_track_places_events(tmp_path):
    from biotube import ffmpeg
    from biotube.render import sfx_track

    out = sfx_track([(0.0, "impact.mp3", 0.9), (1.0, "whoosh.mp3", 0.5), (2.0, "pop.mp3", 0.8)], 3.0, tmp_path / "fx.wav")
    assert out is not None and abs(ffmpeg.duration(out) - 3.0) < 0.05


def test_xfade_keeps_total_duration(tmp_path):
    from biotube import ffmpeg
    from biotube.render import xfade_concat

    files, lengths = [], [1.0, 1.2, 1.2]  # los planos 2 y 3 llevan +0,2 s por delante para el fundido
    for i, L in enumerate(lengths):
        f = tmp_path / f"c{i}.mp4"
        ffmpeg.run(["-f", "lavfi", "-i", f"color=c=red:s=320x568:r=30", "-t", str(L), "-pix_fmt", "yuv420p", str(f)])
        files.append(f)
    out = xfade_concat(files, lengths, tmp_path / "out.mp4", "fade", 0.2)
    assert abs(ffmpeg.duration(out) - 3.0) < 0.1, "1.0 + 1.0 + 1.0 s: el fundido no descuadra la voz"


def test_load_words_splits_grouped_events(tmp_path):
    import json

    from biotube.tts import load_words, words_path

    audio = tmp_path / "a.mp3"
    words_path(audio).write_text(json.dumps([{"t": 1.0, "d": 1.0, "w": "In 2020"}, {"t": 2.1, "d": 0.3, "w": "scientists"}]))
    w = load_words(audio)
    assert [x["w"] for x in w] == ["In", "2020", "scientists"] and abs(w[1]["t"] - (1.0 + 2 / 6)) < 1e-9


def test_headline_overlay_all_styles(monkeypatch):
    from biotube import render
    for style in ("default", "minimal", "documentary"):
        monkeypatch.setattr(render, "_edit", lambda key, default, s=style: s if key == "style" else default)
        layer = render.headline_overlay("It can count ☀️", "BioNiche")
        assert layer.size == render.SHORT_SIZE and layer.mode == "RGBA"
