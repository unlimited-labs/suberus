"""
DOCX -> normalized-HTML bundle service for the submission version-diff pipeline.

Pandoc converts DOCX to an HTML fragment; every referenced figure is rasterized
to PNG (EMF/WMF/SVG via LibreOffice headless, other rasters via Pillow) and
content-addressed. The service does NOT sanitize — DOMPurify-on-jsdom runs in the
Node worker (Phase 0 established that the sanitizer must be bound to a DOM).

Endpoints:
  GET  /             -> health + toolchain versions (unversioned)
  POST /v1/normalize -> application/zip:
                       document.html  (figure refs rewritten -> figures/<sha256>.png)
                       figures/<sha256>.png  (content-addressed, rasterized)
                       meta.json  (pandoc/libreoffice versions + normalizerConfigHash
                                   + schemaVersion + pandoc stderr warnings, for the
                                   artifact cache key)

Functional endpoints are versioned under /v1 so a future contract change can ship /v2
while older app deploys keep calling /v1. Health stays unversioned at /.

Concurrency: each LibreOffice invocation gets an isolated -env:UserInstallation
profile (gotcha C5 — shared profiles corrupt under concurrent convert).
"""

import hashlib
import io
import json
import os
import re
import subprocess
import tempfile
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException, Response, UploadFile
from PIL import Image

# Bundle schema version — bump when the bundle layout or normalize recipe changes
# (participates in the artifact cache key so historical diffs aren't silently mutated).
SCHEMA_VERSION = 2

# Pinned pandoc recipe. `--sandbox` blocks pandoc IO; `--wrap=none` keeps diff-friendly
# lines; raw HTML is dropped so author-supplied markup can't smuggle script through.
PANDOC_ARGS = ["-f", "docx+styles", "-t", "html", "--sandbox", "--wrap=none"]

NORMALIZER_CONFIG = {
    "pandocArgs": PANDOC_ARGS,
    "figures": "all->png",
    "imgDims": "style->attr@px",
    "schemaVersion": SCHEMA_VERSION,
}
NORMALIZER_CONFIG_HASH = hashlib.sha256(
    json.dumps(NORMALIZER_CONFIG, sort_keys=True).encode()
).hexdigest()

RASTER_PASSTHROUGH = {".png"}
RASTER_VIA_PILLOW = {".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff", ".webp"}
RASTER_VIA_SOFFICE = {".emf", ".wmf", ".svg", ".eps", ".pict", ".pdf"}

app = FastAPI()
v1 = APIRouter(prefix="/v1")


def _run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, **kw)


def _pandoc_version() -> str | None:
    try:
        out = _run(["pandoc", "--version"]).stdout.decode(errors="replace")
        return out.splitlines()[0].split()[1] if out else None
    except Exception:
        return None


def _libreoffice_version() -> str | None:
    try:
        out = _run(["soffice", "--version"]).stdout.decode(errors="replace")
        return out.splitlines()[0].strip() if out else None
    except Exception:
        return None


def _soffice_to_png(src: Path, outdir: Path) -> Path:
    """Rasterize a vector image to PNG via LibreOffice with an isolated profile."""
    profile = f"file:///tmp/lo_{uuid.uuid4().hex}"
    proc = _run([
        "soffice", "--headless", "--convert-to", "png", "--outdir", str(outdir),
        f"-env:UserInstallation={profile}", str(src),
    ])
    png = outdir / (src.stem + ".png")
    if not png.exists():
        raise HTTPException(
            500, f"LibreOffice failed to rasterize {src.name}: {proc.stderr.decode(errors='replace')[:200]}"
        )
    return png


def _to_png_bytes(src: Path, workdir: Path) -> bytes:
    ext = src.suffix.lower()
    if ext in RASTER_PASSTHROUGH:
        return src.read_bytes()
    if ext in RASTER_VIA_PILLOW:
        buf = io.BytesIO()
        with Image.open(src) as im:
            im.convert("RGBA").save(buf, format="PNG")
        return buf.getvalue()
    if ext in RASTER_VIA_SOFFICE:
        return _soffice_to_png(src, workdir / "raster").read_bytes()
    # Unknown: best-effort Pillow, else skip rasterization (keep original bytes).
    try:
        buf = io.BytesIO()
        with Image.open(src) as im:
            im.convert("RGBA").save(buf, format="PNG")
        return buf.getvalue()
    except Exception:
        return src.read_bytes()


_SRC_RE = re.compile(r'src="([^"]+)"')

# Pandoc emits figure size as an inline `style="width:Xin;height:Yin"`. The node
# sanitizer strips `style` (it's an XSS vector) but keeps `width`/`height`
# attributes, so figures otherwise lose their intended size and render full-bleed.
# Hoist the dimensions into unitless-px attributes here, before the bundle leaves,
# so they survive sanitization and the redline reproduces the document faithfully.
_IMG_RE = re.compile(r"<img\b[^>]*>", re.I)
_STYLE_RE = re.compile(r'style="([^"]*)"', re.I)
_PX_PER_UNIT = {
    "px": 1.0,
    "in": 96.0,
    "cm": 96.0 / 2.54,
    "mm": 96.0 / 25.4,
    "pt": 96.0 / 72.0,
    "pc": 16.0,
}


def _style_dim_px(prop: str, style: str) -> int | None:
    m = re.search(rf"\b{prop}\s*:\s*([\d.]+)\s*([a-z%]*)", style, re.I)
    if not m:
        return None
    unit = (m.group(2) or "px").lower()
    if unit not in _PX_PER_UNIT:  # e.g. "%" — not expressible as a px attribute
        return None
    try:
        return round(float(m.group(1)) * _PX_PER_UNIT[unit])
    except ValueError:
        return None


def _hoist_img_dims(html: str) -> str:
    def repl(m: re.Match) -> str:
        tag = m.group(0)
        style_m = _STYLE_RE.search(tag)
        if not style_m:
            return tag
        style = style_m.group(1)
        adds: list[str] = []
        for prop in ("width", "height"):
            if re.search(rf"\b{prop}\s*=", tag, re.I):
                continue  # respect an explicit attribute already present
            px = _style_dim_px(prop, style)
            if px is not None:
                adds.append(f'{prop}="{px}"')
        if not adds:
            return tag
        return "<img " + " ".join(adds) + tag[4:]

    return _IMG_RE.sub(repl, html)


def _normalize(docx_path: Path, workdir: Path) -> tuple[str, dict[str, bytes], str]:
    media_dir = workdir / "media"
    html_path = workdir / "document.html"
    proc = _run([
        "pandoc", str(docx_path), *PANDOC_ARGS,
        "--extract-media", str(media_dir), "-o", str(html_path),
    ])
    if proc.returncode != 0:
        raise HTTPException(500, f"pandoc failed: {proc.stderr.decode(errors='replace')[:300]}")
    warnings = proc.stderr.decode(errors="replace").strip()
    html = _hoist_img_dims(html_path.read_text(encoding="utf-8"))

    figures: dict[str, bytes] = {}

    def replace(match: re.Match) -> str:
        ref = match.group(1)
        if ref.startswith(("http://", "https://", "data:", "#")):
            return match.group(0)
        src = (workdir / ref).resolve()
        if not src.is_file():
            src = (html_path.parent / ref).resolve()
        if not src.is_file():
            return match.group(0)
        png = _to_png_bytes(src, workdir)
        sha = hashlib.sha256(png).hexdigest()
        figures[sha] = png
        return f'src="figures/{sha}.png"'

    html = _SRC_RE.sub(replace, html)
    return html, figures, warnings


@app.get("/")
def health():
    return {
        "status": "healthy",
        "pandocVersion": _pandoc_version(),
        "libreofficeVersion": _libreoffice_version(),
        "schemaVersion": SCHEMA_VERSION,
        "normalizerConfigHash": NORMALIZER_CONFIG_HASH,
    }


@v1.post("/normalize")
async def normalize(file: UploadFile):
    contents = await file.read()
    if not contents:
        raise HTTPException(400, "No file uploaded")

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        docx_path = workdir / (Path(file.filename or "doc.docx").name)
        docx_path.write_bytes(contents)

        html, figures, warnings = _normalize(docx_path, workdir)

        meta = {
            "filename": file.filename,
            "pandocVersion": _pandoc_version(),
            "libreofficeVersion": _libreoffice_version(),
            "normalizerConfigHash": NORMALIZER_CONFIG_HASH,
            "schemaVersion": SCHEMA_VERSION,
            "figures": len(figures),
            "warnings": warnings or None,
        }

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("document.html", html)
            z.writestr("meta.json", json.dumps(meta, ensure_ascii=False))
            for sha, raw in figures.items():
                z.writestr(f"figures/{sha}.png", raw)

    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="bundle.zip"'},
    )


app.include_router(v1)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8101"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
