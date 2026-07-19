"""Editor API — DOCX→structured for the docx→Typst editor. Pandoc JSON AST + Word
clipboard OMML→LaTeX. (Future home of a `/typst` compile endpoint.)"""

import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile
from pydantic import BaseModel

import omml
from config import MAX_NORMALIZE_BYTES
from core.pandoc import docx_to_json_ast
from core.security import reject_zip_bomb, require_token

router = APIRouter(prefix="/v1", dependencies=[Depends(require_token)])


@router.post("/ast")
def ast(file: UploadFile):
    """Convert a DOCX to the Pandoc JSON AST (`docx+styles`) for structured mapping —
    editor slots / Typst emission walk this tree. Word paragraph styles survive as
    Div `custom-style` attributes (the semantic role: title/abstract/figure-caption).
    Media is NOT extracted; the AST carries figure paths — pair with /normalize for
    bytes. Native OMML equations become `Math` nodes; MathType OLE is not pre-converted
    here (that path is HTML-sentinel specific)."""
    contents = file.file.read()
    if not contents:
        raise HTTPException(400, "No file uploaded")
    if len(contents) > MAX_NORMALIZE_BYTES:
        raise HTTPException(
            413, f"File exceeds the {MAX_NORMALIZE_BYTES // (1024 * 1024)}MB limit"
        )
    reject_zip_bomb(contents)

    with tempfile.TemporaryDirectory() as tmp:
        docx_path = Path(tmp) / (Path(file.filename or "doc.docx").name)
        docx_path.write_bytes(contents)
        ast_json = docx_to_json_ast(docx_path)

    return Response(content=ast_json, media_type="application/json")


class OmmlRequest(BaseModel):
    html: str


@router.post("/omml")
def omml_to_math(req: OmmlRequest):
    """Convert Word-clipboard OMML (`<m:oMath>` blocks in pasted HTML) to LaTeX math,
    one string per equation in document order — reusing the same pandoc/texmath path as
    /normalize. Empty list if the paste carries no OMML. The editor pastes the clipboard
    HTML here, swaps each equation for the returned LaTeX (→ a MathLive node), and keeps
    the surrounding text."""
    if len(req.html) > MAX_NORMALIZE_BYTES:
        raise HTTPException(413, "Input exceeds the size limit")
    try:
        return {"latex": omml.omml_to_latex(req.html)}
    except Exception as e:
        raise HTTPException(500, f"OMML conversion failed: {str(e)[:300]}")
