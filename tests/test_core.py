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

EXAMPLES = sorted(Path(__file__).resolve().parent.parent.glob("examples/*.yaml"))
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
