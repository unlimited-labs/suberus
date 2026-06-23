"""Toolchain fingerprint + meta for the docling `/v1/bundle` (PDF version-diff).

Kept dependency-light (stdlib + pandoc only, no docling/fastapi imports) so the
fingerprint/meta logic is unit-testable without loading docling models. `main.py`
imports these and wraps `md_to_html` errors into HTTP responses.

The single invariant: `fingerprint()` (served at `/` health) and `build_meta()`
(in the bundle) MUST emit byte-identical `pandocVersion`/`normalizerConfigHash`/
`schemaVersion`, or the Node artifact cache pre-check can never hit.
"""

import hashlib
import json
import os
import subprocess
from importlib.metadata import version as _pkg_version

# Bundle layout/recipe version (integer, like docx-api). The `schemaVersion` column
# of the artifact cache key. NOT docling's per-document schema string ("1.10.0") —
# that is folded into the config hash via the docling versions below.
SCHEMA_VERSION = 1

# pandoc recipe for markdown -> HTML. `--sandbox` blocks pandoc IO; `--wrap=none`
# keeps diff-friendly lines. Math stays as `<span class="math">` spans (pandoc's
# default HTML math), which the diff protects atomically and KaTeX renders.
PANDOC_ARGS = ["-f", "markdown", "-t", "html", "--sandbox", "--wrap=none"]
PANDOC_TIMEOUT_S = int(os.getenv("PDF_API_PANDOC_TIMEOUT_S", "120"))


class PandocError(RuntimeError):
    """pandoc exited non-zero or timed out converting markdown to HTML."""


def safe_version(pkg: str) -> str | None:
    try:
        return _pkg_version(pkg)
    except Exception:
        return None


def pandoc_version() -> str | None:
    try:
        out = subprocess.run(
            ["pandoc", "--version"], capture_output=True, timeout=10
        ).stdout.decode(errors="replace")
        return out.splitlines()[0].split()[1] if out else None
    except Exception:
        return None


# The full normalize fingerprint folded into one hash. A bump of docling (reading
# order / extraction can shift — gotchas C4/C7), the PDF pipeline options (OCR,
# formula enrichment, image scale), or the md->HTML recipe yields a NEW cache key,
# so a toolchain change never silently mutates a historical diff.
_PDF_PIPELINE = {
    "do_ocr": True,
    "do_table_structure": True,
    "generate_picture_images": True,
    "do_formula_enrichment": True,
    "images_scale": 2.0,
}
NORMALIZER_CONFIG = {
    "doclingVersion": safe_version("docling"),
    "doclingCoreVersion": safe_version("docling-core"),
    "pdfPipeline": _PDF_PIPELINE,
    "pandocArgs": PANDOC_ARGS,
    "figures": "embedded->png@sha256",
    "schemaVersion": SCHEMA_VERSION,
}
NORMALIZER_CONFIG_HASH = hashlib.sha256(
    json.dumps(NORMALIZER_CONFIG, sort_keys=True).encode()
).hexdigest()


def fingerprint() -> dict:
    return {
        "pandocVersion": pandoc_version(),
        "doclingVersion": NORMALIZER_CONFIG["doclingVersion"],
        "normalizerConfigHash": NORMALIZER_CONFIG_HASH,
        "schemaVersion": SCHEMA_VERSION,
    }


def md_to_html(md: str) -> tuple[str, str]:
    """Convert docling markdown to an HTML fragment via pandoc. Returns (html,
    warnings). Raises PandocError on a non-zero exit / timeout — never returns a
    silently empty document."""
    try:
        proc = subprocess.run(
            ["pandoc", *PANDOC_ARGS],
            input=md.encode("utf-8"),
            capture_output=True,
            timeout=PANDOC_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired as e:
        raise PandocError("pandoc timed out converting markdown to HTML") from e
    if proc.returncode != 0:
        raise PandocError(
            f"pandoc md->html failed: {proc.stderr.decode(errors='replace')[:300]}"
        )
    return proc.stdout.decode("utf-8"), proc.stderr.decode(errors="replace").strip()


def build_meta(
    filename: str | None,
    docling_doc_schema: str | None,
    figures_count: int,
    warnings: str | None,
) -> dict:
    """meta.json for a bundle. Shares the fingerprint fields with `fingerprint()`."""
    return {
        "filename": filename,
        # pandocVersion is the artifact-key column (here: the md->HTML pandoc).
        "pandocVersion": pandoc_version(),
        # libreoffice is unused on the PDF path; Node's BundleMeta tolerates null.
        "libreofficeVersion": None,
        "normalizerConfigHash": NORMALIZER_CONFIG_HASH,
        "schemaVersion": SCHEMA_VERSION,
        # Diagnostics (versions folded into hash; doclingDocSchema is per-document, not the column).
        "doclingVersion": NORMALIZER_CONFIG["doclingVersion"],
        "doclingCoreVersion": NORMALIZER_CONFIG["doclingCoreVersion"],
        "doclingDocSchema": docling_doc_schema,
        "figures": figures_count,
        "warnings": warnings or None,
    }
