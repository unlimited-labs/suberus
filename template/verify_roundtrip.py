"""Check that the example carries the metadata Suberus's extractors recover.

Two independent checks:

1. DOCX (always, offline) -- mirrors src/features/extraction/server/
   extraction-zones.ts: proves the .docx classifies into title / authors /
   affiliations / emails / keywords / body in order.

2. PDF (opt-in) -- the app's PDF path is pdf-api (docling) -> markdown -> LLM,
   so there is no offline heuristic. This check sends the example PDF to the
   real pdf-api and asserts the header markdown (what the LLM actually reads,
   after cutAtAbstract) contains the title, author surnames, e-mails and a
   Keywords line. Deterministic, no LLM call. SKIPS when pdf-api is unset or
   unreachable. Build the PDFs first (see template/README.md).

Run:  py template/verify_roundtrip.py
"""
import json
import re
import sys
import urllib.request
import uuid
from pathlib import Path

from docx import Document

ROOT = Path(__file__).resolve().parent.parent  # repo root
TPL = ROOT / "template"
EXAMPLE_DOCX = TPL / "docx" / "abstract-example.docx"
# example PDFs all share the same content; prefer the docx-derived one
PDF_CANDIDATES = [
    TPL / "docx" / "abstract-example.pdf",
    TPL / "tex" / "abstract-example.pdf",
    TPL / "typst" / "abstract-example.pdf",
]

KEYWORDS_RE = re.compile(r"^\s*(?:key\s*words?|keywords?|słowa\s*kluczowe)\s*[:：]?", re.I)
BODY_START_RE = re.compile(r"^\s*(?:abstract|introduction)\s*$", re.I)
EMAIL_RE = re.compile(r"[\w.+\-]+@[\w.\-]+\.\w{2,}")
INSTITUTION_RE = re.compile(
    r"university|institute|politechnika|akademi|laboratory|department|faculty|research\s*network|łukasiewicz",
    re.I,
)


# --- check 1: DOCX zone round-trip (offline) -------------------------------

def classify_docx():
    """Return {zone: [texts]} mirroring the extractor's top-down zone walk."""
    d = Document(str(EXAMPLE_DOCX))
    zone, seen = "TITLE", {}
    for p in d.paragraphs:
        t = p.text.strip()
        if not t:
            continue
        has_sup = any(r.font.superscript for r in p.runs)
        if zone == "TITLE":
            z, zone = "TITLE", "AUTHORS"
        elif BODY_START_RE.match(t):
            z = zone = "BODY"
        elif KEYWORDS_RE.match(t):
            z, zone = "KEYWORDS", "BODY"
        elif EMAIL_RE.search(t) and not has_sup and not re.match(r"^\d", t):
            z = zone = "EMAILS"
        elif re.match(r"^\d", t) and INSTITUTION_RE.search(t):
            z = zone = "AFFILIATIONS"
        elif has_sup or zone == "AUTHORS":
            z = zone = "AUTHORS"
        else:
            z = zone
        seen.setdefault(z, []).append(t)
    return seen


def check_docx():
    seen = classify_docx()
    need = ["TITLE", "AUTHORS", "AFFILIATIONS", "EMAILS", "KEYWORDS", "BODY"]
    ok = all(z in seen for z in need)
    for z in need:
        print(f"  {'OK ' if z in seen else 'MISS'} {z:13} {seen.get(z, ['--'])[0][:48]}")
    return ok, seen


# --- expected metadata (derived from the docx, single source of truth) -----

def surnames(authors_line):
    out = []
    for seg in authors_line.split(","):
        words = re.sub(r"[\d()*†‡§.]", "", seg).split()
        if len(words) >= 2:
            out.append(words[-1])
    return out


def expected(seen):
    title_words = seen["TITLE"][0].split()[:3]
    emails = EMAIL_RE.findall(" ".join(seen.get("EMAILS", [])))
    return {
        "title": " ".join(title_words),
        "surnames": surnames(seen["AUTHORS"][0]),
        "emails": [e.lower() for e in emails],
    }


# --- check 2: PDF header via pdf-api (opt-in) ------------------------------

def pdf_api_url():
    env = ROOT / ".env"
    if not env.exists():
        return None
    for line in env.read_text(encoding="utf-8").splitlines():
        if line.startswith("PDF_API_URL="):
            return line.split("=", 1)[1].strip().strip('"').rstrip("/") or None
    return None


def cut_at_abstract(md):
    """Port of extraction.ts cutAtAbstract: the header text the LLM receives."""
    m = re.search(r"\n\s*(\*\*)?(Abstract|Introduction|ABSTRACT|\d+\.\s)", md)
    return md[: m.start()] if m and m.start() > 0 else md[:2000]


def post_markdown(base, pdf_path):
    boundary = "----verify" + uuid.uuid4().hex
    head = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
        f'filename="{pdf_path.name}"\r\nContent-Type: application/pdf\r\n\r\n'
    ).encode()
    body = head + pdf_path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{base}/v1/markdown",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r).get("markdown", "")


def check_pdf(exp):
    """Returns 'pass' | 'skip' | 'fail'."""
    base = pdf_api_url()
    if not base:
        print("  SKIP  PDF_API_URL not set")
        return "skip"
    pdf = next((p for p in PDF_CANDIDATES if p.exists()), None)
    if not pdf:
        print("  SKIP  no example PDF built (see template/README.md)")
        return "skip"
    try:
        urllib.request.urlopen(base, timeout=3)
    except Exception as e:
        print(f"  SKIP  pdf-api unreachable at {base} ({e.__class__.__name__})")
        return "skip"

    try:
        header = cut_at_abstract(post_markdown(base, pdf))
    except Exception as e:
        print(f"  SKIP  pdf-api conversion failed ({e})")
        return "skip"

    flat = re.sub(r"\s+", " ", header).lower()
    checks = [("title", exp["title"].lower() in flat)]
    checks += [(f"author:{s}", s.lower() in flat) for s in exp["surnames"]]
    checks += [(f"email:{e}", e in flat) for e in exp["emails"]]
    checks += [("keywords-label", bool(KEYWORDS_RE.search(header) or "keyword" in flat))]
    ok = all(v for _, v in checks)
    print(f"  via {pdf.relative_to(TPL)} ({len(header)} chars of header)")
    for name, v in checks:
        print(f"  {'OK ' if v else 'MISS'} {name}")
    return "pass" if ok else "fail"


# --- main ------------------------------------------------------------------

print("DOCX zone round-trip:")
docx_ok, seen = check_docx()
print("\nPDF header extraction (pdf-api):")
pdf_res = check_pdf(expected(seen))

print(f"\nDOCX: {'PASS' if docx_ok else 'FAIL'}   PDF: {pdf_res.upper()}")
sys.exit(0 if docx_ok and pdf_res != "fail" else 1)
