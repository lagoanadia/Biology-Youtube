"""Modelos de datos (Pydantic).

Estos modelos cumplen dos funciones:
1. Son el "contrato" entre módulos (el guionista produce un VideoPackage,
   el renderizador lo consume, el publicador lo sube...).
2. Se pasan a la API de Claude como `output_format`, así que Claude está
   obligado a devolver JSON que valida contra ellos (salidas estructuradas).
"""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


class Source(BaseModel):
    title: str = Field(description="Título del artículo, libro o web")
    reference: str = Field(description="URL, DOI o referencia bibliográfica")


class Scene(BaseModel):
    narration: str = Field(description="Texto que lee el narrador en esta escena")
    visual_query: str = Field(
        description="Búsqueda de imagen: preferentemente un nombre científico (Género especie) de la especie "
        "o de un pariente cercano; si no, términos en inglés concretos (ej: 'Aurelia aurita')"
    )
    on_screen_text: str = Field(description="Rótulo corto en pantalla, máximo 8 palabras")
    key_fact: bool = Field(description="True si la escena contiene un hecho sorprendente reutilizable en un short")


class DocumentaryScript(BaseModel):
    topic: str
    working_title: str
    category: Literal["animal", "planta", "hongo", "microorganismo", "otro"]
    subcategory: str = Field(description="Ej: insectos, anfibios, carnívoras, árboles...")
    hook_type: Literal["pregunta", "shock", "misterio", "superlativo", "historia"]
    species: list[str] = Field(description="Nombres científicos de las especies protagonistas")
    scenes: list[Scene] = Field(description="La primera escena es el gancho; la última incluye la llamada a la acción")
    sources: list[Source]

    @property
    def narration(self) -> str:
        return "\n\n".join(s.narration for s in self.scenes)

    @property
    def word_count(self) -> int:
        return len(self.narration.split())

    def estimated_minutes(self, wpm: int = 150) -> float:
        return self.word_count / wpm


class Beat(BaseModel):
    """Un trozo de la narración y lo que se ve en pantalla MIENTRAS suena."""

    text: str = Field(description="Trozo literal de la narración; todos los beats juntos = hook + fact + cta")
    visual: str = Field(
        description="Qué se ve mientras suena este trozo: nombre científico o término concreto que "
        "muestre exactamente lo que se dice (ej: 'Hyalinobatrachium ventral view', 'red blood cells microscope')"
    )
    sticker: str = Field(
        default="",
        description="Opcional: rótulo-pegatina de 1-3 palabras que salta en pantalla (ej: '90%', 'INVISIBLE'); vacío si no",
    )


class ShortScript(BaseModel):
    """Estructura obligatoria: Gancho -> Hecho interesante -> Llamada a la acción."""

    hook: str = Field(description="1 frase que atrapa en los primeros 2 segundos")
    fact: str = Field(description="El hecho explicado, 60-100 palabras")
    cta: str = Field(description="Llamada a la acción corta, idealmente enlazando al documental")
    visual_queries: list[str] = Field(
        description="5-7 búsquedas de imagen; prioriza nombres científicos (Género especie) y géneros cercanos"
    )
    on_screen_texts: list[str] = Field(description="1 titular corto (máx. 5 palabras) que se muestra durante el gancho")
    beats: list[Beat] = Field(
        default_factory=list,
        description="La narración partida en 5-9 trozos, cada uno con el visual que le corresponde",
    )

    @property
    def narration(self) -> str:
        return f"{self.hook} {self.fact} {self.cta}"

    @property
    def word_count(self) -> int:
        return len(self.narration.split())


class VideoMetadata(BaseModel):
    title: str = Field(description="Máx. 70 caracteres, con la palabra clave al principio")
    description: str = Field(description="Descripción SEO: 2 primeras líneas enganchan, luego resumen")
    tags: list[str] = Field(description="10-20 etiquetas, de específicas a generales")
    hashtags: list[str] = Field(description="3 hashtags máximo")
    thumbnail_text: str = Field(description="Texto de miniatura, máx. 4 palabras")


class ShortsBundle(BaseModel):
    """Lo que devuelve Claude al trocear el documental."""

    shorts: list[ShortScript]
    shorts_metadata: list[VideoMetadata]
    documentary_metadata: VideoMetadata


class VideoPackage(BaseModel):
    """1 documental + 3-4 shorts del mismo tema. Unidad de trabajo del sistema."""

    id: str
    language: str = "es"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    documentary: DocumentaryScript
    documentary_metadata: VideoMetadata
    shorts: list[ShortScript]
    shorts_metadata: list[VideoMetadata]
    # Visuales elegidos a mano: {"short0.beat2": {"type": "photo"|"clip", "url"|"path": ..., "start": s,
    #  "license": ..., "attribution": ..., "source_url": ...}}
    curated: dict = Field(default_factory=dict)
    # Se rellena al renderizar/subir
    assets: dict = Field(default_factory=dict)
    youtube: dict = Field(default_factory=dict)


def slugify(text: str, max_len: int = 50) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:max_len].strip("-") or "video"
