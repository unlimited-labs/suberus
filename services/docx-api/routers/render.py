"""Render API — DOCX→PDF via LibreOffice headless. Used by the document generator
(the docx is produced by the Node worker from a template + data)."""

import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile

from config import MAX_NORMALIZE_BYTES
from core.libreoffice import soffice_to_pdf
from core.security import reject_zip_bomb, require_token

router = APIRouter(prefix="/v1", dependencies=[Depends(require_token)])


@router.post("/render-pdf")
def render_pdf(file: UploadFile):
    contents = file.file.read()
    if not contents:
        raise HTTPException(400, "No file uploaded")
    if len(contents) > MAX_NORMALIZE_BYTES:
        raise HTTPException(
            413, f"File exceeds the {MAX_NORMALIZE_BYTES // (1024 * 1024)}MB limit"
        )
    reject_zip_bomb(contents)

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        docx_path = workdir / (Path(file.filename or "doc.docx").name)
        docx_path.write_bytes(contents)
        pdf_path = soffice_to_pdf(docx_path, workdir / "out")
        pdf_bytes = pdf_path.read_bytes()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="document.pdf"'},
    )
