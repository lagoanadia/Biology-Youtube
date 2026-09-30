"""Acceso a las APIs de YouTube (Data API v3 + Analytics API v2).

Autenticación: OAuth 2.0 de tipo "Desktop app".
La primera vez se abre el navegador para que autorices tu canal; el token
se guarda en YOUTUBE_TOKEN_FILE y a partir de ahí se renueva solo, por lo
que la publicación automática (cron / GitHub Actions) no necesita navegador.
"""
from __future__ import annotations

import time
from pathlib import Path

from .config import env

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
]


def get_credentials(interactive: bool = True):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    token_file = Path(env("YOUTUBE_TOKEN_FILE", "secrets/youtube_token.json"))
    secrets_file = Path(env("YOUTUBE_CLIENT_SECRETS", "secrets/client_secret.json"))

    creds = None
    if token_file.exists():
        creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)
    if creds and creds.valid:
        return creds
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        if not interactive:
            raise RuntimeError(
                f"No hay token válido en {token_file}. Ejecuta 'python -m biotube auth' en tu PC."
            )
        flow = InstalledAppFlow.from_client_secrets_file(str(secrets_file), SCOPES)
        creds = flow.run_local_server(port=0)
    token_file.parent.mkdir(parents=True, exist_ok=True)
    token_file.write_text(creds.to_json(), encoding="utf-8")
    return creds


def youtube_service(interactive: bool = False):
    from googleapiclient.discovery import build

    return build("youtube", "v3", credentials=get_credentials(interactive), cache_discovery=False)


def analytics_service(interactive: bool = False):
    from googleapiclient.discovery import build

    return build("youtubeAnalytics", "v2", credentials=get_credentials(interactive), cache_discovery=False)


def upload_video(
    youtube,
    file_path: str | Path,
    *,
    title: str,
    description: str,
    tags: list[str],
    category_id: str,
    language: str,
    publish_at: str | None,
    privacy_status: str = "private",
    made_for_kids: bool = False,
    contains_synthetic_media: bool = True,
) -> str:
    """Sube un vídeo con subida reanudable y devuelve su videoId.

    Si `publish_at` (ISO 8601 UTC) está definido, el vídeo se sube como
    privado y YouTube lo hace público automáticamente a esa hora: así
    no hace falta tener el ordenador encendido en el momento del estreno.
    """
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload

    status = {
        "privacyStatus": "private" if publish_at else privacy_status,
        "selfDeclaredMadeForKids": made_for_kids,
        "containsSyntheticMedia": contains_synthetic_media,
    }
    if publish_at:
        status["publishAt"] = publish_at

    body = {
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "tags": tags,
            "categoryId": category_id,
            "defaultLanguage": language,
            "defaultAudioLanguage": language,
        },
        "status": status,
    }
    media = MediaFileUpload(str(file_path), chunksize=8 * 1024 * 1024, resumable=True, mimetype="video/mp4")
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    retries = 0
    while response is None:
        try:
            _, response = request.next_chunk()
        except HttpError as e:
            # 5xx = error temporal de Google -> reintento con espera exponencial
            if e.resp.status in (500, 502, 503, 504) and retries < 5:
                retries += 1
                time.sleep(2**retries)
                continue
            raise
    return response["id"]


def set_thumbnail(youtube, video_id: str, image_path: str | Path) -> None:
    """Requiere tener el canal verificado por teléfono."""
    from googleapiclient.http import MediaFileUpload

    youtube.thumbnails().set(videoId=video_id, media_body=MediaFileUpload(str(image_path))).execute()
