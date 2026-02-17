import hashlib
from pathlib import Path

import httpx
from PIL import Image

from backend.config import settings


def _cache_path(url: str) -> Path:
    h = hashlib.sha256(url.encode()).hexdigest()
    return settings.image_cache_dir / h


def download_image(url: str) -> Image.Image:
    cached = _cache_path(url)
    if cached.exists():
        return Image.open(cached).convert("RGB")

    resp = httpx.get(url, timeout=30, follow_redirects=True)
    resp.raise_for_status()
    cached.write_bytes(resp.content)
    return Image.open(cached).convert("RGB")


def download_images(urls: list[str]) -> list[Image.Image]:
    return [download_image(url) for url in urls if url.strip()]
