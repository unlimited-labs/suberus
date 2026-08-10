"""LibreOffice headless conversions (vector→PNG, DOCX→PDF). Each invocation gets an
isolated -env:UserInstallation profile (gotcha C5 — shared profiles corrupt under
concurrent convert)."""

import subprocess
import uuid
from pathlib import Path

from fastapi import HTTPException

from config import SOFFICE_TIMEOUT_S
from core.proc import run


def soffice_to_png(src: Path, outdir: Path) -> Path:
    """Rasterize a vector image to PNG via LibreOffice with an isolated profile."""
    profile = f"file:///tmp/lo_{uuid.uuid4().hex}"
    try:
        proc = run([
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


def soffice_to_pdf(src: Path, outdir: Path) -> Path:
    """Convert a DOCX to PDF via LibreOffice with an isolated profile."""
    profile = f"file:///tmp/lo_{uuid.uuid4().hex}"
    try:
        proc = run([
            "soffice", "--headless", "--convert-to", "pdf", "--outdir", str(outdir),
            f"-env:UserInstallation={profile}", str(src),
        ], timeout=SOFFICE_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, f"LibreOffice timed out converting {src.name}")
    pdf = outdir / (src.stem + ".pdf")
    if not pdf.exists():
        raise HTTPException(
            500, f"LibreOffice failed to convert {src.name}: {proc.stderr.decode(errors='replace')[:200]}"
        )
    return pdf
