"""Tests for per-style CSS + direct-alignment recovery from a DOCX (run: pytest).

A minimal synthetic DOCX (only word/styles.xml + word/document.xml, the two parts
stylecss reads) is built in-memory so the suite carries no real submission content.
"""

import io
import zipfile
from pathlib import Path

import stylecss

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _styles_xml() -> str:
    return f"""<?xml version="1.0"?>
<w:styles xmlns:w="{W}">
  <w:docDefaults><w:rPrDefault><w:rPr/></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:styleId="TitleId">
    <w:name w:val="Title Name"/><w:basedOn w:val="NormalId"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Times New Roman"/><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="BodyId">
    <w:name w:val="Body Name"/><w:basedOn w:val="NormalId"/>
    <w:pPr><w:jc w:val="both"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Times New Roman"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="HeadId">
    <w:name w:val="Head Name"/><w:basedOn w:val="NormalId"/>
    <w:rPr><w:b/><w:caps/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="NormalId"><w:name w:val="Normal"/></w:style>
</w:styles>"""


def _document_xml() -> str:
    # HeadId paragraph "ABSTRACT" carries a DIRECT jc=center (not in its style).
    # A BodyId paragraph has no direct jc — it must NOT pick up a ta-* class.
    # The last paragraph is a ")"-delimited (numId=1) numbered list item.
    return f"""<?xml version="1.0"?>
<w:document xmlns:w="{W}"><w:body>
  <w:p><w:pPr><w:pStyle w:val="TitleId"/></w:pPr><w:r><w:t>My Title</w:t></w:r></w:p>
  <w:p><w:pPr><w:pStyle w:val="HeadId"/><w:jc w:val="center"/></w:pPr><w:r><w:t>ABSTRACT</w:t></w:r></w:p>
  <w:p><w:pPr><w:pStyle w:val="BodyId"/></w:pPr><w:r><w:t>some body</w:t></w:r></w:p>
  <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>list item</w:t></w:r></w:p>
</w:body></w:document>"""


def _numbering_xml() -> str:
    return f"""<?xml version="1.0"?>
<w:numbering xmlns:w="{W}">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1)"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>"""


def _make_docx(tmp_path: Path, styles: str | None = None, document: str | None = None) -> str:
    p = tmp_path / "doc.docx"
    with zipfile.ZipFile(p, "w") as z:
        z.writestr("word/styles.xml", styles if styles is not None else _styles_xml())
        z.writestr("word/document.xml", document if document is not None else _document_xml())
        z.writestr("word/numbering.xml", _numbering_xml())
    return str(p)


HTML = (
    '<div data-custom-style="Title Name"><p>My Title</p></div>'
    '<div data-custom-style="Head Name"><p>ABSTRACT</p></div>'
    '<div data-custom-style="Body Name"><p>some body</p></div>'
)


def test_style_css_reflects_styles_xml(tmp_path):
    out, css = stylecss.annotate(HTML, _make_docx(tmp_path))
    # Title: center + bold + 14pt (sz 28) + Times New Roman serif.
    assert "text-align:center" in css
    assert "font-weight:700" in css
    assert "font-size:14pt" in css
    assert 'font-family:"Times New Roman", serif' in css
    # Body style is justified (Word jc="both").
    assert "text-align:justify" in css


def test_elements_get_stable_hashed_class(tmp_path):
    docx = _make_docx(tmp_path)
    out1, _ = stylecss.annotate(HTML, docx)
    out2, _ = stylecss.annotate(HTML, docx)
    assert out1 == out2  # deterministic
    assert 'class="cs' in out1  # opaque class injected, not the raw style name


def test_direct_center_recovered_only_where_applied(tmp_path):
    out, _ = stylecss.annotate(HTML, _make_docx(tmp_path))
    segs = {n: f"<div{s}" for s in out.split("<div")[1:]
            for n in ("ABSTRACT", "some body") if n in s}
    # ABSTRACT (HeadId) has a direct jc=center -> ta-center override on its element.
    assert "ta-center" in segs["ABSTRACT"]
    # The body paragraph has no direct jc -> no alignment-override class.
    assert not any(c in segs["some body"] for c in ("ta-center", "ta-right", "ta-justify"))


def test_font_name_injection_is_stripped(tmp_path):
    evil = _styles_xml().replace(
        'w:ascii="Times New Roman"', 'w:ascii="Evil&quot;}body{display:none"', 1
    )
    _, css = stylecss.annotate(HTML, _make_docx(tmp_path, styles=evil))
    assert "display:none" not in css
    assert "}body{" not in css
    # No CSS-injection vectors can be emitted by construction.
    for vector in ("url(", "@import", "expression(", "javascript:"):
        assert vector not in css


def test_paren_ordered_list_tagged(tmp_path):
    # Pandoc shape for a Word "a)" list: <ol type="a"><li>…</li></ol>.
    html = '<ol type="a"><li><p>list item</p></li></ol>'
    out, _ = stylecss.annotate(html, _make_docx(tmp_path))
    assert 'class="ol-paren"' in out or "ol-paren" in out

    # A "."-delimited list (browser default) must NOT be tagged.
    dot_numbering = _numbering_xml().replace("%1)", "%1.")
    p = tmp_path / "dot.docx"
    with zipfile.ZipFile(p, "w") as z:
        z.writestr("word/styles.xml", _styles_xml())
        z.writestr("word/document.xml", _document_xml())
        z.writestr("word/numbering.xml", dot_numbering)
    out2, _ = stylecss.annotate(html, str(p))
    assert "ol-paren" not in out2


def test_builtin_heading_recovered_for_bare_h_tag(tmp_path):
    # pandoc renders a builtin "heading 1" style as a bare <h1> (no data-custom-style);
    # we recover its real size (11pt here) by text so it isn't left at the base 1.5em.
    styles = _styles_xml().replace(
        "</w:styles>",
        '<w:style w:type="paragraph" w:styleId="H1"><w:name w:val="heading 1"/>'
        '<w:pPr><w:jc w:val="center"/></w:pPr>'
        '<w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style></w:styles>',
    )
    document = _document_xml().replace(
        "</w:body>",
        '<w:p><w:pPr><w:pStyle w:val="H1"/></w:pPr><w:r><w:t>Author Name</w:t></w:r></w:p></w:body>',
    )
    import re

    out, css = stylecss.annotate(
        "<h1>Author Name</h1>", _make_docx(tmp_path, styles=styles, document=document)
    )
    m = re.search(r'<h1 class="(cs[0-9a-f]+)"', out)
    assert m, out
    assert any("font-size:11pt" in line and m.group(1) in line for line in css.splitlines())


def test_direct_align_recovered_on_styleless_bare_p(tmp_path):
    # Many templates put a centered title/author in a bare <p> (no pStyle) with a
    # DIRECT jc=center that pandoc drops. The text-only map must still center it.
    document = _document_xml().replace(
        "</w:body>",
        '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>Bare Centered Title</w:t></w:r></w:p>'
        '<w:p><w:r><w:t>plain left body</w:t></w:r></w:p></w:body>',
    )
    out, _ = stylecss.annotate(
        "<p>Bare Centered Title</p><p>plain left body</p>",
        _make_docx(tmp_path, document=document),
    )
    segs = {n: f"<p{s}" for s in out.split("<p")[1:]
            for n in ("Bare Centered Title", "plain left body") if n in s}
    assert "ta-center" in segs["Bare Centered Title"]  # styleless title centered
    assert not any(c in segs["plain left body"] for c in ("ta-center", "ta-right", "ta-justify"))


def test_malformed_docx_degrades_gracefully(tmp_path):
    bad = tmp_path / "bad.docx"
    bad.write_bytes(b"not a zip")
    out, css = stylecss.annotate(HTML, str(bad))
    assert out == HTML
    assert css == ""
