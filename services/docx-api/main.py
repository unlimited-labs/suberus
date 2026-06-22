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

from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as _pkg_version

from fastapi import APIRouter, FastAPI, HTTPException, Response, UploadFile
from PIL import Image
from pydantic import BaseModel

import diffhtml
import mathtype
import stylecss


def _xmldiff_version() -> str | None:
    try:
        return _pkg_version("xmldiff")
    except PackageNotFoundError:
        return None

# Hard ceiling on an accepted upload (anti-DoS: zip-bomb / pathological DOCX). Not
# the per-type business limit (the app enforces that at upload) — just a bound on
# what this sidecar hands to pandoc/LibreOffice.
MAX_NORMALIZE_BYTES = int(os.getenv("DOCX_API_MAX_MB", "50")) * 1024 * 1024
# Per-subprocess wall-clock caps so a crafted file can't hang a worker forever.
PANDOC_TIMEOUT_S = int(os.getenv("DOCX_API_PANDOC_TIMEOUT_S", "120"))
SOFFICE_TIMEOUT_S = int(os.getenv("DOCX_API_SOFFICE_TIMEOUT_S", "90"))


def _run(
    cmd: list[str], *, timeout: float | None = None, **kw
) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, timeout=timeout, **kw)


def _pandoc_version() -> str | None:
    try:
        out = _run(["pandoc", "--version"], timeout=10).stdout.decode(errors="replace")
        return out.splitlines()[0].split()[1] if out else None
    except Exception:
        return None


def _libreoffice_version() -> str | None:
    try:
        out = _run(["soffice", "--version"], timeout=30).stdout.decode(errors="replace")
        return out.splitlines()[0].strip() if out else None
    except Exception:
        return None


# Bundle schema version — bump when the bundle layout or normalize recipe changes
# (participates in the artifact cache key so historical diffs aren't silently mutated).
# v3: pre-pandoc MathType OLE -> LaTeX math-span conversion (mathtype.py).
# v4: Word-faithful rendering — emit styles.css (per-style fidelity from styles.xml
#     + direct paragraph alignment from document.xml), hoist inline block alignment/
#     table-width into classes, and tag ")"-delimited ordered lists (.ol-paren +
#     .olp-<type>) from numbering.xml so the Word "a)" marker renders (pandoc emits
#     <ol type> but drops the delimiter).
# v5: recover DIRECT paragraph alignment on style-less elements too (bare <p>) — a
#     centered title/author block with no style hook now centers (corpus audit gap).
# v6: re-insert a Title/Subtitle paragraph pandoc drops as doc metadata (builtin
#     "Title" style) so the title isn't missing entirely (corpus audit gap).
SCHEMA_VERSION = 6

# Pinned pandoc recipe. `--sandbox` blocks pandoc IO; `--wrap=none` keeps diff-friendly
# lines; raw HTML is dropped so author-supplied markup can't smuggle script through.
PANDOC_ARGS = ["-f", "docx+styles", "-t", "html", "--sandbox", "--wrap=none"]

# libreofficeVersion folds into the hash so an LO upgrade that changes figure
# rasterization invalidates the cache (gotcha C4 — else figures silently mutate
# while the artifact key stays stable).
NORMALIZER_CONFIG = {
    "pandocArgs": PANDOC_ARGS,
    "figures": "all->png",
    "imgDims": "style->attr@px",
    "mathtype": "ole-mtef-v5->latex-span",
    "blockStyles": "align+tblwidth->class",
    "styleCss": "styles.xml+document.xml->classed-css",
    "schemaVersion": SCHEMA_VERSION,
    "libreofficeVersion": _libreoffice_version(),
}
NORMALIZER_CONFIG_HASH = hashlib.sha256(
    json.dumps(NORMALIZER_CONFIG, sort_keys=True).encode()
).hexdigest()

RASTER_PASSTHROUGH = {".png"}
RASTER_VIA_PILLOW = {".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff", ".webp"}
RASTER_VIA_SOFFICE = {".emf", ".wmf", ".svg", ".eps", ".pict", ".pdf"}

app = FastAPI()
v1 = APIRouter(prefix="/v1")


def _soffice_to_png(src: Path, outdir: Path) -> Path:
    """Rasterize a vector image to PNG via LibreOffice with an isolated profile."""
    profile = f"file:///tmp/lo_{uuid.uuid4().hex}"
    try:
        proc = _run([
            "soffice", "--headless", "--convert-to", "png", "--outdir", str(outdir),
            f"-env:UserInstallation={profile}", str(src),
        ], timeout=SOFFICE_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, f"LibreOffice timed out rasterizing {src.name}")
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


# Pandoc emits figure/cell alignment and table width as inline `style` (e.g. a
# centered figure table: `<td style="text-align: center;">`, `<table
# style="width:100%;">`). The Node sanitizer strips `style`, so — as with image
# dims — hoist these into allowlisted classes that survive: `text-align:*` -> `ta-*`,
# table `width:100%` -> `tbl-full`. (Paragraph-level direct alignment that pandoc
# drops entirely is recovered separately in stylecss from document.xml.)
_BLOCK_OPEN_RE = re.compile(r"<(p|div|td|th|h[1-6]|caption|table)\b([^>]*)>", re.I)
_TEXTALIGN_RE = re.compile(r"text-align\s*:\s*(center|right|justify)", re.I)
_WIDTH_FULL_RE = re.compile(r"width\s*:\s*100\s*%", re.I)
_CLASS_RE = re.compile(r'\bclass="([^"]*)"', re.I)


def _hoist_block_styles(html: str) -> str:
    def repl(m: re.Match) -> str:
        tag, attrs = m.group(1).lower(), m.group(2)
        style_m = _STYLE_RE.search(attrs)
        if not style_m:
            return m.group(0)
        style = style_m.group(1)
        adds: list[str] = []
        align = _TEXTALIGN_RE.search(style)
        if align:
            adds.append(f"ta-{align.group(1).lower()}")
        if tag == "table" and _WIDTH_FULL_RE.search(style):
            adds.append("tbl-full")
        if not adds:
            return m.group(0)
        cls_m = _CLASS_RE.search(attrs)
        if cls_m:
            merged = f'{cls_m.group(1)} {" ".join(adds)}'
            attrs = _CLASS_RE.sub(f'class="{merged}"', attrs, count=1)
        else:
            attrs = f'{attrs} class="{" ".join(adds)}"'
        return f"<{tag}{attrs}>"

    return _BLOCK_OPEN_RE.sub(repl, html)


def _normalize(docx_path: Path, workdir: Path) -> tuple[str, dict[str, bytes], str, str]:
    media_dir = workdir / "media"
    html_path = workdir / "document.html"

    # Pre-pandoc: convert decodable MathType OLE equations into sentinel tokens so
    # pandoc (which drops OLE objects) doesn't leave them as oversized fallback images.
    # Undecodable equations are left untouched and flow through as before.
    equations: list[mathtype.ConvertedEquation] = []
    try:
        converted_docx, equations = mathtype.convert_mathtype_oles(docx_path.read_bytes())
        if equations:
            docx_path.write_bytes(converted_docx)
    except Exception:
        equations = []  # never let equation conversion block normalization

    try:
        proc = _run([
            "pandoc", str(docx_path), *PANDOC_ARGS,
            "--extract-media", str(media_dir), "-o", str(html_path),
        ], timeout=PANDOC_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "pandoc timed out")
    if proc.returncode != 0:
        raise HTTPException(500, f"pandoc failed: {proc.stderr.decode(errors='replace')[:300]}")
    warnings = proc.stderr.decode(errors="replace").strip()
    html = _hoist_img_dims(html_path.read_text(encoding="utf-8"))
    html = _hoist_block_styles(html)
    # Post-pandoc: swap each equation sentinel for a `<span class="math …">` the Node
    # worker's KaTeX pass renders (same shape pandoc emits for native Word equations).
    html = mathtype.apply_sentinels(html, equations)

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
    # Per-style CSS + direct-alignment recovery from the DOCX's own style tables, so
    # the redline reproduces the document's title/heading/body formatting that
    # pandoc's semantic HTML discards. Tags styled elements with `cs<hash>`/`ta-*`
    # classes; the CSS is trusted-by-construction (generated from validated XML
    # values), delivered separately from the sanitized HTML.
    html, style_css = stylecss.annotate(html, str(docx_path))
    return html, figures, warnings, style_css


@app.get("/")
def health():
    return {
        "status": "healthy",
        "pandocVersion": _pandoc_version(),
        "libreofficeVersion": _libreoffice_version(),
        "xmldiffVersion": _xmldiff_version(),
        "schemaVersion": SCHEMA_VERSION,
        "normalizerConfigHash": NORMALIZER_CONFIG_HASH,
    }


@v1.post("/normalize")
async def normalize(file: UploadFile):
    contents = await file.read()
    if not contents:
        raise HTTPException(400, "No file uploaded")
    if len(contents) > MAX_NORMALIZE_BYTES:
        raise HTTPException(
            413, f"File exceeds the {MAX_NORMALIZE_BYTES // (1024 * 1024)}MB normalize limit"
        )

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        docx_path = workdir / (Path(file.filename or "doc.docx").name)
        docx_path.write_bytes(contents)

        html, figures, warnings, style_css = _normalize(docx_path, workdir)

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
            z.writestr("styles.css", style_css)
            z.writestr("meta.json", json.dumps(meta, ensure_ascii=False))
            for sha, raw in figures.items():
                z.writestr(f"figures/{sha}.png", raw)

    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="bundle.zip"'},
    )


class DiffRequest(BaseModel):
    htmlA: str
    htmlB: str


@v1.post("/diff")
def diff(req: DiffRequest):
    """Structural redline between two already-normalized HTML fragments. Output is
    UNTRUSTED — the Node worker DOMPurify-sanitizes it before persisting."""
    total = len(req.htmlA) + len(req.htmlB)
    if total > MAX_NORMALIZE_BYTES:
        raise HTTPException(413, "Input HTML exceeds the diff size limit")
    return {"redline": diffhtml.diff_html(req.htmlA, req.htmlB)}


app.include_router(v1)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8101"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
