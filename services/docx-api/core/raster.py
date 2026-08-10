"""Figure rasterization to content-addressable PNG (passthrough / Pillow / LibreOffice)."""

import io
from pathlib import Path

from PIL import Image

from core.libreoffice import soffice_to_png

RASTER_PASSTHROUGH = {".png"}
RASTER_VIA_PILLOW = {".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff", ".webp"}
RASTER_VIA_SOFFICE = {".emf", ".wmf", ".svg", ".eps", ".pict", ".pdf"}


def to_png_bytes(src: Path, workdir: Path) -> bytes:
    ext = src.suffix.lower()
    if ext in RASTER_PASSTHROUGH:
        return src.read_bytes()
    if ext in RASTER_VIA_SOFFICE:
        return soffice_to_png(src, workdir / "raster").read_bytes()
    try:
        buf = io.BytesIO()
        with Image.open(src) as im:
            im.convert("RGBA").save(buf, format="PNG")
        return buf.getvalue()
    except Exception:
        if ext in RASTER_VIA_PILLOW:
            raise  # a known raster type failing is an error, not an unknown to skip
        return src.read_bytes()  # unknown ext: keep original bytes
