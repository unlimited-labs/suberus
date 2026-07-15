"""DOCX -> PDF conversion smoke test for the document generator endpoint.
Calls the LibreOffice helper directly (no FastAPI TestClient, mirroring the other
tests) so it needs no extra deps. Runs inside the docx-api test image (soffice on PATH)."""

import shutil
import tempfile
from pathlib import Path

import pytest

from core.libreoffice import soffice_to_pdf
from core.security import reject_zip_bomb

HERE = Path(__file__).parent
DOCS = HERE / "test_fixtures" / "docs"
SOFFICE = shutil.which("soffice")

pytestmark = pytest.mark.skipif(
    SOFFICE is None, reason="soffice not on PATH (run in the docx-api test image)"
)


def test_soffice_to_pdf_produces_pdf():
    docx = DOCS / "text-formatting.docx"
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        local = work / docx.name
        shutil.copyfile(docx, local)
        pdf = soffice_to_pdf(local, work / "out")
        assert pdf.exists()
        assert pdf.read_bytes()[:5] == b"%PDF-"


def test_reject_zip_bomb():
    from fastapi import HTTPException

    # A real DOCX passes.
    reject_zip_bomb((DOCS / "text-formatting.docx").read_bytes())

    # Non-zip input is refused (also covers "not a DOCX").
    with pytest.raises(HTTPException) as exc:
        reject_zip_bomb(b"not a zip at all")
    assert exc.value.status_code == 400

    # A tiny highly-compressible zip blows the inflation-ratio guard.
    import io
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("bomb.txt", b"0" * (5 * 1024 * 1024))
    with pytest.raises(HTTPException) as exc:
        reject_zip_bomb(buf.getvalue())
    assert exc.value.status_code == 413
