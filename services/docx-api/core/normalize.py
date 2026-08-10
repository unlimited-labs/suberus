"""The normalize pipeline: MathType pre-convert → pandoc HTML → hoist passes →
equation sentinels → figure rasterization → per-style CSS annotation. Shared engine for
both the /normalize bundle and the version-diff input side."""

import hashlib
import re
from pathlib import Path

import mathtype
import stylecss
from core.htmlpost import hoist_block_styles, hoist_img_dims
from core.pandoc import docx_to_html
from core.raster import to_png_bytes

_SRC_RE = re.compile(r'src="([^"]+)"')


def normalize(docx_path: Path, workdir: Path) -> tuple[str, dict[str, bytes], str, str]:
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

    html, warnings = docx_to_html(docx_path, media_dir, html_path)
    html = hoist_img_dims(html)
    html = hoist_block_styles(html)
    # Post-pandoc: swap each equation sentinel for a `<span class="math …">` the Node
    # worker's KaTeX pass renders (same shape pandoc emits for native Word equations).
    html = mathtype.apply_sentinels(html, equations)

    figures: dict[str, bytes] = {}
    workdir_root = workdir.resolve()

    def replace(match: re.Match) -> str:
        ref = match.group(1)
        if ref.startswith(("http://", "https://", "data:", "#")):
            return match.group(0)
        src = (workdir / ref).resolve()
        if not src.is_file():
            src = (html_path.parent / ref).resolve()
        # `ref` comes from pandoc's output, not from us. Today pandoc resolves images
        # strictly inside the archive, so an absolute/`../` ref never reaches here — but
        # to_png_bytes falls back to raw read_bytes(), so without containment a future
        # pandoc would silently turn a crafted DOCX into an arbitrary host-file read.
        if not src.is_file() or not src.is_relative_to(workdir_root):
            return match.group(0)
        png = to_png_bytes(src, workdir)
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
