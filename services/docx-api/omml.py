"""OMML (from Word clipboard HTML) -> LaTeX math, via a minimal docx + pandoc.

Reuses the exact pandoc/texmath OMML->math path already proven for docx uploads,
instead of a client-side OMML->MathML->LaTeX chain. Word's clipboard interleaves
HTML presentation tags (span/b/i) inside <m:oMath>; strip them and normalise loose
run text into <m:t> so the fragment is valid OOXML math for pandoc.
"""

import re
import subprocess
import sys
import zipfile
from io import BytesIO

MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    "</Types>"
)
RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    "</Relationships>"
)


def extract_omath(html: str) -> list[str]:
    return re.findall(r"<m:oMath>.*?</m:oMath>", html, re.DOTALL)


def clean_omml(omath: str) -> str:
    # Drop HTML-presentation tags Word interleaves (anything not in the m:/w: namespaces).
    omath = re.sub(r"</?(?!m:|w:)[a-zA-Z][^>]*>", "", omath)
    # Word clipboard puts run text directly in <m:r>…</m:r>; OOXML needs <m:t>…</m:t>.
    def wrap(m: re.Match) -> str:
        inner = m.group(1)
        rpr = ""
        rpr_m = re.match(r"\s*(<m:rPr>.*?</m:rPr>)", inner, re.DOTALL)
        if rpr_m:
            rpr = rpr_m.group(1)
            inner = inner[rpr_m.end():]
        if "<m:t>" in inner or not inner.strip():
            return m.group(0)
        return f"<m:r>{rpr}<m:t xml:space=\"preserve\">{inner}</m:t></m:r>"
    return re.sub(r"<m:r>(.*?)</m:r>", wrap, omath, flags=re.DOTALL)


def build_docx(omath_blocks: list[str]) -> bytes:
    paras = "".join(f"<w:p><m:oMathPara>{b}</m:oMathPara></w:p>" for b in omath_blocks)
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document xmlns:w="{W_NS}" xmlns:m="{MATH_NS}">'
        f"<w:body>{paras}</w:body></w:document>"
    )
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        z.writestr("word/document.xml", document)
    return buf.getvalue()


def omml_to_latex(html: str) -> list[str]:
    """Each <m:oMath> becomes its own paragraph, so pandoc emits one display-math
    `\\[…\\]` block per equation — split on those. LaTeX (not Typst) keeps the math
    node's value in the same convention as the docx-AST path (MathLive renders LaTeX;
    the Typst emitter runs tex2typst on export)."""
    blocks = [clean_omml(b) for b in extract_omath(html)]
    if not blocks:
        return []
    docx = build_docx(blocks)
    proc = subprocess.run(
        ["pandoc", "-f", "docx", "-t", "latex", "--wrap=none"],
        input=docx, capture_output=True, timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode(errors="replace"))
    latex = proc.stdout.decode("utf-8")
    return [m.strip() for m in re.findall(r"\\\[(.+?)\\\]", latex, re.DOTALL)]


if __name__ == "__main__":
    html = open(sys.argv[1], encoding="utf-8").read()
    for i, t in enumerate(omml_to_latex(html)):
        print(f"[{i}] {t}")
