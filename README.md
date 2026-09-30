# BioTube: canal automatizado de biología en YouTube

Sistema en Python que, cada semana:

1. **Investiga** qué temas de biología tienen demanda en YouTube.
2. **Escribe** con Claude un guion de documental (8-12 min) y lo **trocea** en 3-4 shorts (gancho → hecho → llamada a la acción).
3. **Monta los vídeos**: narración con voz neural, imágenes con licencia libre, efecto Ken Burns, rótulos, subtítulos, miniatura.
4. **Revisa** que el paquete sea apto para monetizar (licencias, duración, lenguaje, contenido repetido).
5. **Sube y programa** los vídeos en YouTube con títulos, descripciones, capítulos y etiquetas optimizados.
6. **Mide** qué funciona (dashboard) y usa esos datos para **elegir el siguiente tema**.

```
 banco de temas ──► research.py ──► scriptwriter.py (Claude) ──► render.py ──► compliance.py ──► publisher.py
       ▲             (YouTube)        documental + shorts          ffmpeg        licencias,        YouTube
       │                                                                          duración...     (publishAt)
       └──────────── insights.py ◄──────────── analytics.py ◄─────────────────────────────────────────┘
                     (qué funciona)             (métricas diarias en SQLite)  ──► dashboard.html
```

---

## ⚠️ Antes de nada: lo que la automatización NO garantiza

Léelo, porque afecta a si el canal gana dinero o no:

- **Programa de Partners (YPP).** Para tener anuncios necesitas 1000 suscriptores y 4000 horas de visualización pública en 12 meses (o 10 millones de vistas de shorts en 90 días). Al principio no habrá ingresos.
- **Contenido "inauténtico" / producido en masa.** YouTube desmonetiza canales que publican vídeos casi iguales generados en serie. Este sistema lo mitiga (cada guion es distinto, con fuentes, y `compliance.py` bloquea guiones parecidos a otros anteriores), pero **la mejor protección eres tú**: revisa cada guion, corrige datos, y si puedes, añade algo propio (tu voz, un comentario, una ilustración).
- **Verifica los datos.** Claude escribe con rigor y cita fuentes, pero puede equivocarse. Un canal de divulgación vive de su credibilidad. Por eso el flujo recomendado al principio es `generate` → **leer el guion** → `render` → `publish`, y no el piloto automático completo.
- **Proyecto de API sin verificar.** Los vídeos subidos por la API desde un proyecto de Google Cloud *no auditado* se quedan bloqueados como privados. Hay que pedir la auditoría gratuita de la API ("YouTube API Services - Audit and Quota Extension Form"). Hasta entonces, usa `--dry-run` o sube a mano.
- **Voz sintética.** El sistema marca los vídeos con `containsSyntheticMedia: true` y lo menciona en la descripción. Es lo honesto y evita problemas con las políticas de contenido alterado.

---

## Estructura del proyecto

| Fichero | Qué hace | Conceptos que aprendes |
|---|---|---|
| `config.yaml` | Toda la configuración (idioma, voz, horarios, licencias...) | Separar configuración y código |
| `biotube/models.py` | Modelos de datos: documental, escena, short, metadatos | **Pydantic**, validación, tipado |
| `biotube/topics.py` + `data/topic_bank.yaml` | Banco de temas y elección del siguiente | dataclasses, YAML |
| `biotube/research.py` | Puntúa temas con la API de búsqueda de YouTube | APIs REST, mediana, logaritmos |
| `biotube/scriptwriter.py` | Guiones con Claude (salida estructurada) | LLMs, prompts, *structured outputs*, streaming |
| `biotube/shorts.py` | Troceado del documental en shorts **sin** API (respaldo) | Algoritmos de texto |
| `biotube/seo.py` | Títulos, descripción, capítulos, etiquetas, hashtags | Reglas de negocio |
| `biotube/compliance.py` | Revisión para monetizar | Validaciones, similitud de textos (Jaccard) |
| `biotube/tts.py` | Texto a voz (edge-tts) | `asyncio`, patrón "proveedor" |
| `biotube/media.py` | Imágenes de Wikimedia Commons / Pexels con licencia apta | HTTP, reintentos, caché, Pillow |
| `biotube/render.py` | Montaje de vídeo con ffmpeg | Procesos externos, *filter graphs*, subtítulos ASS/SRT |
| `biotube/scheduler.py` | Calendario de publicación | Fechas y zonas horarias (`zoneinfo`) |
| `biotube/youtube_client.py` | OAuth y subida reanudable | OAuth 2.0, *refresh tokens*, cuotas |
| `biotube/publisher.py` | Orquesta la publicación de un paquete | Orquestación, `--dry-run` |
| `biotube/analytics.py` | Métricas diarias en SQLite + datos demo | **SQL**, SQLite |
| `biotube/insights.py` | Qué funciona y qué publicar después | Estadística básica, *shrinkage* |
| `biotube/dashboard.py` + `templates/dashboard.html` | Dashboard HTML | HTML/CSS/JS, SVG, modo oscuro |
| `biotube/__main__.py` | Línea de comandos | `argparse` |
| `examples/*.yaml` | 3 paquetes de ejemplo completos | — |
| `tests/` | 41 tests con pytest | Testing |
| `.github/workflows/` | Tests en cada push + publicación semanal | CI/CD, cron |

---

## Puesta en marcha (paso a paso)

### 1. Entorno de Python

Necesitas Python 3.10 o superior.

```bash
git clone https://github.com/lagoanadia/Biology-Youtube.git
cd Biology-Youtube
python -m venv .venv
# Windows: .venv\Scripts\activate      Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
python -m pytest -q          # deberían pasar todos los tests
```

¿Por qué un *entorno virtual* (`venv`)? Porque cada proyecto tiene sus propias versiones de librerías. El `venv` es una carpeta con un Python "privado" para este proyecto, así no rompes otros.

No hace falta instalar ffmpeg: el paquete `imageio-ffmpeg` trae el ejecutable.

### 2. Clave de Claude (Anthropic)

1. Crea una cuenta en <https://platform.claude.com> y genera una API key.
2. Copia `.env.example` a `.env` y pega la clave en `ANTHROPIC_API_KEY`.

`.env` está en `.gitignore`: **nunca** subas claves a GitHub.

### 3. Acceso a YouTube (Google Cloud)

1. Entra en <https://console.cloud.google.com>, crea un proyecto.
2. "APIs y servicios" → Biblioteca → activa **YouTube Data API v3** y **YouTube Analytics API**.
3. "Pantalla de consentimiento OAuth" → tipo *Externo* → añade tu cuenta como usuario de prueba.
4. "Credenciales" → Crear credenciales → **ID de cliente OAuth** → tipo **Aplicación de escritorio**. Descarga el JSON y guárdalo como `secrets/client_secret.json`.
5. Ejecuta:

```bash
python -m biotube auth
```

Se abrirá el navegador, eliges tu canal y aceptas. Se crea `secrets/youtube_token.json`, que contiene un *refresh token*: con él el programa obtiene permisos nuevos solo, sin volver a abrir el navegador. Eso es lo que permite automatizarlo.

> **Importante:** mientras la pantalla de consentimiento esté en modo "Prueba", Google caduca el refresh token a los 7 días. Pásala a "En producción" para que dure. Si solo la usas tú no hace falta completar la verificación de Google: al autorizar verás un aviso de "app no verificada" y puedes continuar.

### 4. (Opcional) Pexels

Si Wikimedia no tiene fotos de algo, se usa Pexels. Clave gratis en <https://www.pexels.com/api/> → `PEXELS_API_KEY` en `.env`.

---

## Uso

### Probar sin claves (lo primero que deberías hacer)

```bash
python -m biotube render examples/rana-de-cristal.yaml     # crea los MP4 en output/
python -m biotube check examples/rana-de-cristal.yaml
python -m biotube dashboard --demo                         # output/dashboard_demo.html
```

Sin internet: `--tts silent` genera el vídeo con audio en silencio y `--placeholder-images` usa fondos generados en vez de descargar fotos (útil para probar el montaje). Renderizar un documental tarda unos 15-20 minutos en un portátil normal: el zoom se calcula a doble resolución para que no tiemble.

### Flujo recomendado (semi-automático)

```bash
python -m biotube recommend                 # ¿qué tema toca?
python -m biotube generate                  # Claude escribe el paquete -> data/packages/<id>.json
#   >>> LEE y corrige el JSON (datos, tono, títulos) <<<
python -m biotube render <id>
#   >>> mira output/<id>/contact_sheet.jpg: todas las imágenes elegidas en un mosaico <<<
python -m biotube publish <id> --dry-run    # muestra el calendario y guarda output/<id>/upload_plan.json
python -m biotube publish <id>              # sube y programa
```

### Subir a mano (sin API ni OAuth)

Si todavía no has configurado Google Cloud, o `auth` te da problemas, puedes publicar desde el navegador:

```bash
python -m biotube render examples/rana-de-cristal.yaml
python -m biotube kit rana-de-cristal-esconde-su-sangre   # -> output/<id>/SUBIR_A_YOUTUBE.txt
```

El fichero trae, para cada vídeo, el archivo a subir, el título, la descripción completa (capítulos, fuentes y créditos de las fotos), las etiquetas y la fecha recomendada. En YouTube Studio: **Crear → Subir vídeos**, arrastra el MP4, copia y pega, y en "Visibilidad" elige **Programar**.

### Versiones en inglés

`examples/en/glass-frog.yaml` es la versión en inglés (`language: en`). La voz se elige según el idioma de cada paquete (`voice_es` / `voice_en` en `config.yaml`). Consejo: si publicas en los dos idiomas, mejor en **dos canales distintos**; mezclar idiomas en un canal confunde al algoritmo de recomendación.

### Piloto automático

```bash
python -m biotube weekly            # métricas -> 2 paquetes -> render -> revisión -> subida
python -m biotube weekly --dry-run  # igual pero sin subir
```

### Analítica

```bash
python -m biotube analytics fetch   # descarga métricas reales de los últimos 90 días
python -m biotube dashboard         # output/dashboard.html
python -m biotube research          # puntúa los temas pendientes con datos de YouTube (1 vez/semana)
python -m biotube recommend --ideas 10   # además pide a Claude 10 temas nuevos
```

---

## Automatizar con GitHub Actions

`.github/workflows/weekly.yml` ejecuta `weekly` cada lunes. Los vídeos se suben **programados** (`publishAt`), así que YouTube los estrena solos a la hora prevista aunque tu ordenador esté apagado.

Configura en GitHub → Settings → Secrets and variables → Actions:

| Secreto | Contenido |
|---|---|
| `ANTHROPIC_API_KEY` | tu clave de Claude |
| `YOUTUBE_CLIENT_SECRET_JSON` | contenido de `secrets/client_secret.json` |
| `YOUTUBE_TOKEN_JSON` | contenido de `secrets/youtube_token.json` (tras `auth` en tu PC) |
| `PEXELS_API_KEY` | opcional |

Pruébalo primero desde la pestaña Actions → *weekly-publish* → *Run workflow* con "Simular" marcado.

Alternativa sin GitHub: una tarea programada de Windows o `cron` en Linux que ejecute `python -m biotube weekly`.

---

## Cómo funciona cada pieza (para entenderlo, no solo usarlo)

### Guiones con Claude: salidas estructuradas

En vez de pedir "escribe un guion" y luego intentar trocear el texto, `scriptwriter.py` le pasa a la API un **modelo Pydantic** (`output_format=DocumentaryScript`). La API obliga a Claude a responder con JSON que cumple ese esquema, y el SDK lo convierte en un objeto Python ya validado (`message.parsed_output`). Es como tipar la respuesta de una IA.

Otros detalles de la llamada (`_structured_call`):

- **Streaming**: un guion largo tarda; recibir la respuesta en trozos evita que la conexión HTTP caduque.
- **`thinking: adaptive` + `effort`**: Claude decide cuánto razonar antes de escribir. `effort` (en `config.yaml`) regula calidad vs. coste.
- **`fallbacks: "default"`**: si el filtro de seguridad del modelo rechazara por error un tema (venenos, parásitos...), la API reintenta automáticamente con otro modelo. Si aun así se rechaza, lanzamos una excepción clara.
- Se comprueba `stop_reason` antes de usar la respuesta (`refusal`, `max_tokens`).
- El *system prompt* fija el estilo del canal: rigor, gancho en <15 s, "bucles abiertos" cada 60-90 s para la retención, tono apto para anunciantes.
- `insights.performance_notes()` añade al prompt lo que está funcionando en tu canal (qué ganchos y temas rinden más), cerrando el ciclo datos → contenido.

Coste orientativo con el modelo por defecto: del orden de unos céntimos a medio dólar por paquete, según la longitud y el `effort`. Puedes ver el consumo real en la consola de Anthropic.

### Montaje de vídeo con ffmpeg

ffmpeg es un programa de línea de comandos; Python lo llama con `subprocess` (`biotube/ffmpeg.py`). La idea clave de `render.py` es **separar audio y vídeo**:

1. Cada escena → mp3 de voz → WAV con la duración exacta *voz + pausa* (`apad`).
2. Cada escena → imagen recortada (Pillow) + capa transparente con rótulos → clip **mudo** de exactamente esa duración, con zoom lento (`zoompan`).
3. Se concatenan todos los clips y todos los WAV por separado (duraciones idénticas → sincronía perfecta).
4. Mezcla final: voz (+ música opcional al 8 %), normalización a **-14 LUFS** (el volumen de referencia de YouTube) y, en los shorts, subtítulos grandes quemados (`.ass`; el gancho en amarillo).

Los shorts (9:16) ponen la foto horizontal sobre una copia desenfocada de sí misma: así no se recorta el animal.

Al final del documental hay 12 s de **pantalla final** con dos huecos: en YouTube Studio coloca ahí "vídeo recomendado" y "suscribirse" (la API no permite configurarlos).

Música: pon mp3 de la *Biblioteca de audio de YouTube* (libres para monetizar) en `assets/music/` y se mezclarán automáticamente.

### Licencias de imágenes

Solo sirven licencias que permitan **uso comercial**: CC0, dominio público, CC BY, CC BY-SA y la licencia de Pexels. Las marcadas **NC** (no comercial) o **ND** (sin obras derivadas) se descartan; hay un test que lo comprueba. Las atribuciones se añaden a la descripción automáticamente (CC BY lo exige).

La búsqueda por texto a veces falla (buscando "glass frog" puede salir una figurita de cristal): el código descarta ficheros cuyo nombre contiene palabras como *figurine*, *statue* o *stamp*, prueba después con el nombre científico y genera `contact_sheet.jpg` para que revises las imágenes en segundos.

Wikimedia limita las descargas: el código usa sus tamaños de miniatura estándar (960/1280/1920 px), espera 1 s entre descargas y respeta la cabecera `Retry-After` cuando responde 429.

### SEO

- Título ≤ 70 caracteres (60 en shorts) con la palabra clave al principio.
- Descripción: 2 primeras líneas que enganchan (es lo único visible en el buscador), resumen, **capítulos** (YouTube los activa con ≥ 3 marcas de tiempo desde 00:00, de ≥ 10 s cada una), fuentes, créditos y aviso de voz sintética.
- Etiquetas: de lo específico (nombre científico) a lo general, ≤ 500 caracteres.
- Máximo 3 hashtags (+ `#shorts` en los shorts).
- Categoría *Educación* (id 27): suele tener mejores anunciantes que "Gente y blogs".
- Cada short enlaza al documental: los shorts atraen público nuevo, el documental es el que genera ingresos.

### Calendario y cuota

- 2 documentales por semana (martes y viernes, 17:00) y sus shorts en los días siguientes, **máximo uno al día** (13:00).
- Subir un vídeo cuesta 1600 unidades de cuota y el límite diario es 10 000 → un paquete de 5 vídeos (8000) cabe en un día. `publisher.py` lo comprueba antes de empezar.

### Analítica: ¿qué funciona?

`insights.py` calcula una **puntuación por vídeo** comparándolo solo con vídeos de su mismo formato:

```
score = 0.5 · vistas_7_días / base  +  0.3 · %_visto / mediana  +  0.2 · subs_por_1000_vistas / mediana
```

- **Primeros 7 días**: así un vídeo de hace 3 meses y uno de la semana pasada compiten en igualdad.
- **Base móvil**: como el canal crece, se compara con la mediana de los 6 vídeos anteriores. (Sin esto, los vídeos nuevos siempre "ganarían": lo descubrimos con los datos demo.)
- **Encogimiento hacia 1,0**: la media de un grupo se corrige como `(suma + 2) / (n + 2)`. Con un solo vídeo de "reptiles" que fue bien no sabemos si fue suerte; con diez, sí. Es una idea básica de estadística bayesiana.

Esos pesos por categoría, subcategoría y tipo de gancho, multiplicados por la puntuación de oportunidad de `research.py`, deciden el siguiente tema.

---

## Los 3 ejemplos incluidos

| Paquete | Documental | Shorts |
|---|---|---|
| `examples/avispa-esmeralda.yaml` | La avispa que convierte cucarachas en zombis (~9 min) | 4 |
| `examples/venus-atrapamoscas.yaml` | La Venus atrapamoscas sabe contar (~9 min) | 4 |
| `examples/rana-de-cristal.yaml` | La rana de cristal que esconde su sangre (~9 min) | 4 |

Cada uno incluye guion por escenas, búsquedas de imagen, rótulos, fuentes científicas y metadatos SEO. Son YAML legible: ábrelos para ver exactamente qué produce el sistema y cómo es un buen gancho. Revisa las fuentes antes de publicar.

---

## Ideas para seguir aprendiendo

- Añadir un proveedor de voz premium en `tts.py` (misma firma que `_synth_edge`).
- Subir los subtítulos `.srt` con `captions.insert` (cuesta 400 unidades de cuota).
- Test A/B de miniaturas (YouTube Studio lo permite a mano).
- Traducir el canal a inglés (`channel.language: en`): el CPM suele ser bastante más alto.
- Publicar `dashboard.html` en GitHub Pages.
