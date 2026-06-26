"""DOCX -> PDF conversion smoke test for the document generator endpoint.
Calls the LibreOffice helper directly (no FastAPI TestClient, mirroring the other
tests) so it needs no extra deps. Runs inside the docx-api test image (soffice on PATH)."""

import shutil
import tempfile
from pathlib import Path

import pytest

import main

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
        pdf = main._soffice_to_pdf(local, work / "out")
        assert pdf.exists()
        assert pdf.read_bytes()[:5] == b"%PDF-"
