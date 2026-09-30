"""Generación de guiones con Claude (API de Anthropic).

Flujo en 2 llamadas:
1. Tema -> DocumentaryScript (8-12 min, dividido en escenas).
2. DocumentaryScript -> ShortsBundle (3-4 shorts + metadatos SEO de todo).

Usamos "salidas estructuradas": le pasamos a la API un modelo Pydantic
(`output_format=DocumentaryScript`) y la respuesta llega ya validada en
`message.parsed_output`. Así no hay que "parsear" texto libre a mano.
"""
from __future__ import annotations

import json

import anthropic

from .config import load_config
from .models import DocumentaryScript, ShortsBundle, VideoPackage, slugify
from .topics import Topic

SYSTEM_PROMPT = """Eres el guionista de un canal de YouTube de divulgación sobre biología: \
hechos poco conocidos (niche) de animales, plantas, hongos y microorganismos.

Principios del canal:
- Rigor: solo afirmaciones respaldadas por literatura científica o fuentes reputadas. \
Si un dato es discutido, dilo. Nunca inventes cifras, citas ni estudios. \
Cada guion lista sus fuentes reales.
- Estilo: educativo pero atractivo. Frases cortas para leer en voz alta, \
vocabulario claro, analogías cotidianas, curiosidad y humor ligero. Sin clickbait engañoso: \
el título promete lo que el vídeo cumple.
- Apto para anunciantes (monetización): nada de violencia gráfica ni lenguaje soez; \
la depredación y el parasitismo se explican con tono científico, sin recrearse.
- Retención: el primer párrafo es un gancho que plantea una pregunta o una imagen potente \
en menos de 15 segundos. Cada 60-90 segundos, un "bucle abierto" (algo que se resolverá más \
adelante) para que la gente siga viendo.
- Estructura global: Gancho -> Hechos interesantes (de menos a más sorprendente) -> Llamada a la acción \
(suscribirse / comentar una pregunta concreta).
- Las búsquedas de imágenes (`visual_query`) van en inglés y usan el nombre científico o \
términos que existan en Wikimedia Commons."""


class ScriptGenerationError(RuntimeError):
    pass


def _client() -> anthropic.Anthropic:
    # El cliente lee ANTHROPIC_API_KEY del entorno (.env se carga en load_config)
    load_config()
    return anthropic.Anthropic()


def _structured_call(prompt: str, output_model):
    """Llamada a Claude con salida estructurada, en streaming.

    - streaming: un guion largo puede tardar; el streaming evita timeouts HTTP.
    - thinking adaptativo + effort: Claude decide cuánto "piensa" antes de escribir.
    - fallbacks="default": si el modelo rechazara la petición por un falso positivo
      de sus filtros de seguridad (p.ej. hablar de venenos o parásitos),
      la API reintenta automáticamente con otro modelo adecuado.
    """
    cfg = load_config()
    client = _client()
    with client.beta.messages.stream(
        model=cfg["llm"]["model"],
        max_tokens=cfg["llm"]["max_tokens"],
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"effort": cfg["llm"]["effort"]},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": prompt}],
        output_format=output_model,
    ) as stream:
        message = stream.get_final_message()

    if message.stop_reason == "refusal":
        raise ScriptGenerationError(f"El modelo rechazó la petición: {message.stop_details}")
    if message.stop_reason == "max_tokens":
        raise ScriptGenerationError("Respuesta cortada por max_tokens; súbelo en config.yaml")
    if message.parsed_output is None:
        raise ScriptGenerationError("La respuesta no contiene JSON válido")
    return message.parsed_output


def generate_documentary(topic: Topic, performance_notes: str = "") -> DocumentaryScript:
    cfg = load_config()
    lo, hi = cfg["content"]["documentary_minutes"]
    wpm = cfg["content"]["words_per_minute"]
    lang = cfg["channel"]["language"]
    prompt = f"""Escribe el guion de un documental de YouTube.

Tema: {topic.topic}
Especies: {", ".join(topic.species) or "a determinar"}
Categoría: {topic.category} / {topic.subcategory}
Idioma de la narración y los rótulos: {lang}
Duración objetivo: {lo}-{hi} minutos a {wpm} palabras/minuto \
=> entre {lo * wpm} y {hi * wpm} palabras de narración en total.
Escenas: entre 18 y 30, de 40-90 palabras cada una. Marca `key_fact=true` en 4-6 escenas \
con los hechos más sorprendentes (se reutilizarán en shorts).

{("Lo que está funcionando en el canal (úsalo como guía):" + chr(10) + performance_notes) if performance_notes else ""}"""
    script = _structured_call(prompt, DocumentaryScript)

    minutes = script.estimated_minutes(wpm)
    if not lo * 0.9 <= minutes <= hi * 1.1:
        print(f"[aviso] duración estimada {minutes:.1f} min fuera del rango {lo}-{hi}")
    return script


def split_into_shorts(script: DocumentaryScript, n_shorts: int | None = None) -> ShortsBundle:
    cfg = load_config()
    n = n_shorts or cfg["content"]["shorts_per_video"]
    max_words = int(cfg["content"]["short_max_seconds"] / 60 * cfg["content"]["words_per_minute"] * 1.08)
    prompt = f"""A partir de este guion de documental, crea {n} YouTube Shorts independientes \
y los metadatos SEO de todos los vídeos.

Reglas de cada short:
- Estructura estricta: `hook` (1 frase, <2 s, sin saludos) -> `fact` (un único hecho, bien explicado) \
-> `cta` (invita a ver el documental completo o a seguir el canal).
- Máximo {max_words} palabras en total (hook+fact+cta) para no pasar de {cfg["content"]["short_max_seconds"]} s.
- Cada short se entiende sin haber visto nada más. No repitas el mismo hecho en dos shorts.
- Prioriza las escenas con key_fact=true.

Reglas de metadatos:
- Títulos: palabra clave (nombre común del animal/planta) al principio, máx. 70 caracteres, \
curiosidad sin engañar. Los de shorts, máx. 60 caracteres.
- Descripción del documental: 2 primeras líneas que enganchan (se ven en el buscador), \
luego un resumen de 3-5 frases. NO incluyas capítulos ni fuentes (se añaden automáticamente).
- tags: de específico (nombre científico) a general (biología, naturaleza).
- Idioma: {cfg["channel"]["language"]}.

Guion:
{json.dumps(script.model_dump(), ensure_ascii=False)}"""
    bundle = _structured_call(prompt, ShortsBundle)
    if len(bundle.shorts) != len(bundle.shorts_metadata):
        raise ScriptGenerationError("Número de shorts y de metadatos no coincide")
    return bundle


def create_package(topic: Topic, performance_notes: str = "") -> VideoPackage:
    doc = generate_documentary(topic, performance_notes)
    bundle = split_into_shorts(doc)
    return VideoPackage(
        id=slugify(topic.topic),
        language=load_config()["channel"]["language"],
        documentary=doc,
        documentary_metadata=bundle.documentary_metadata,
        shorts=bundle.shorts,
        shorts_metadata=bundle.shorts_metadata,
    )
