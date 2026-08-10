"""Pandoc invocations shared by the normalize (HTML) and editor (JSON AST) paths."""

import subprocess
from pathlib import Path

from fastapi import HTTPException

from config import PANDOC_ARGS, PANDOC_TIMEOUT_S
from core.proc import run


def docx_to_html(docx_path: Path, media_dir: Path, out_path: Path) -> tuple[str, str]:
    """Run the pinned pandoc HTML recipe with media extraction. Writes HTML to
    `out_path`; returns (html, pandoc-stderr-warnings)."""
    try:
        proc = run([
            "pandoc", str(docx_path), *PANDOC_ARGS,
            "--extract-media", str(media_dir), "-o", str(out_path),
        ], timeout=PANDOC_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "pandoc timed out")
    if proc.returncode != 0:
        raise HTTPException(500, f"pandoc failed: {proc.stderr.decode(errors='replace')[:300]}")
    warnings = proc.stderr.decode(errors="replace").strip()
    return out_path.read_text(encoding="utf-8"), warnings


def docx_to_json_ast(docx_path: Path) -> bytes:
    """Convert a DOCX to the Pandoc JSON AST (`docx+styles`, sandboxed). No media
    extraction — the AST carries figure paths."""
    try:
        proc = run(
            ["pandoc", str(docx_path), "-f", "docx+styles", "-t", "json", "--sandbox"],
            timeout=PANDOC_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "pandoc timed out")
    if proc.returncode != 0:
        raise HTTPException(
            500, f"pandoc failed: {proc.stderr.decode(errors='replace')[:300]}"
        )
    return proc.stdout
