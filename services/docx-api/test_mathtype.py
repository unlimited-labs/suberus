"""Tests for pre-pandoc MathType OLE -> LaTeX conversion (run: pytest).

The fixture `test_fixtures/mathtype_equation_dsmt4.bin` is a real `Equation.DSMT4`
(MathType 7, MTEF v5) OLE object extracted from a submission — it encodes only a
generic equation (no author content) and exercises chars, subscript, a big-operator
sum, an integral with limits, fences, and a fraction.
"""

import io
import zipfile
from pathlib import Path

import pytest

import mathtype

FIXTURE = Path(__file__).parent / "test_fixtures" / "mathtype_equation_dsmt4.bin"
EXPECTED_LATEX = r"y=ax+b+\sum b_{i}\int_{b}^{a} \left( \frac{g}{4} \right)"


def test_extract_and_decode_real_equation():
    mtef = mathtype.mtef_from_ole(FIXTURE.read_bytes())
    assert mathtype.decode_mtef_to_latex(mtef) == EXPECTED_LATEX


def test_non_ole_bytes_raise():
    with pytest.raises(mathtype.UnsupportedMtef):
        mathtype.mtef_from_ole(b"not an ole compound file")


def test_unsupported_mtef_version_raises():
    # MTEF header with version byte 3 (Equation Editor 3.x) — not supported, kept as image.
    fake = bytes([3, 1, 1, 3, 0]) + b"\x00" * 8
    with pytest.raises(mathtype.UnsupportedMtef):
        mathtype.decode_mtef_to_latex(fake)


def test_apply_sentinels_inline_and_display():
    eqs = [
        mathtype.ConvertedEquation(0, r"x^2", display=False),
        mathtype.ConvertedEquation(1, r"a<b & c", display=True),
    ]
    html = f"<p>{mathtype.sentinel(0)} and {mathtype.sentinel(1)}</p>"
    out = mathtype.apply_sentinels(html, eqs)
    assert r'<span class="math inline">\(x^2\)</span>' in out
    # display mode + HTML-escaping of <, &, >
    assert r'<span class="math display">\[a&lt;b &amp; c\]</span>' in out
    assert mathtype.sentinel(0) not in out and mathtype.sentinel(1) not in out


def _minimal_docx(ole_bytes: bytes) -> bytes:
    """A minimal DOCX with one MathType OLE object on its own paragraph."""
    w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    o = "urn:schemas-microsoft-com:office:office"
    r = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    document = (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document xmlns:w="{w}" xmlns:o="{o}" xmlns:r="{r}"><w:body>'
        f'<w:p><w:r><w:object>'
        f'<o:OLEObject Type="Embed" ProgID="Equation.DSMT4" r:id="rId1"/>'
        f"</w:object></w:r></w:p>"
        f"</w:body></w:document>"
    )
    rels = (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f'<Relationship Id="rId1" Type="http://x/oleObject" Target="embeddings/oleObject1.bin"/>'
        f"</Relationships>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", document)
        z.writestr("word/_rels/document.xml.rels", rels)
        z.writestr("word/embeddings/oleObject1.bin", ole_bytes)
    return buf.getvalue()


def test_convert_mathtype_oles_rewrites_to_sentinel():
    docx = _minimal_docx(FIXTURE.read_bytes())
    new_docx, eqs = mathtype.convert_mathtype_oles(docx)
    assert len(eqs) == 1
    assert eqs[0].latex == EXPECTED_LATEX
    assert eqs[0].display is True  # object alone in its paragraph

    doc = zipfile.ZipFile(io.BytesIO(new_docx)).read("word/document.xml").decode("utf-8")
    assert "<w:object" not in doc  # OLE removed
    assert mathtype.sentinel(0) in doc  # sentinel inserted


def test_undecodable_equation_is_left_untouched():
    # ProgID present but the OLE payload is not a valid equation -> keep as-is.
    docx = _minimal_docx(b"garbage")
    new_docx, eqs = mathtype.convert_mathtype_oles(docx)
    assert eqs == []
    assert new_docx == docx  # unchanged
