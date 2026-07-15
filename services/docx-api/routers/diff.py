"""Version-diff API — DOCX→normalized-HTML bundle + structural redline between two
already-normalized fragments."""

import io
import json
import tempfile
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile
from pydantic import BaseModel

import config
import diffhtml
from core.normalize import normalize
from core.security import reject_zip_bomb, require_token
from core.versions import libreoffice_version, pandoc_version

router = APIRouter(prefix="/v1", dependencies=[Depends(require_token)])


@router.post("/normalize")
async def normalize_endpoint(file: UploadFile):
    contents = await file.read()
    if not contents:
        raise HTTPException(400, "No file uploaded")
    if len(contents) > config.MAX_NORMALIZE_BYTES:
        raise HTTPException(
            413, f"File exceeds the {config.MAX_NORMALIZE_BYTES // (1024 * 1024)}MB normalize limit"
        )
    reject_zip_bomb(contents)

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        docx_path = workdir / (Path(file.filename or "doc.docx").name)
        docx_path.write_bytes(contents)

        html, figures, warnings, style_css = normalize(docx_path, workdir)

        meta = {
            "filename": file.filename,
            "pandocVersion": pandoc_version(),
            "libreofficeVersion": libreoffice_version(),
            "normalizerConfigHash": config.NORMALIZER_CONFIG_HASH,
            "schemaVersion": config.SCHEMA_VERSION,
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


@router.post("/diff")
def diff(req: DiffRequest):
    """Structural redline between two already-normalized HTML fragments. Output is
    UNTRUSTED — the Node worker DOMPurify-sanitizes it before persisting."""
    total = len(req.htmlA) + len(req.htmlB)
    if total > config.MAX_NORMALIZE_BYTES:
        raise HTTPException(413, "Input HTML exceeds the diff size limit")
    return {"redline": diffhtml.diff_html(req.htmlA, req.htmlB)}
