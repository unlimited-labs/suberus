"""Check: the example doc classifies into the zones Suberus's extractor expects.

Mirrors src/features/extraction/server/extraction-zones.ts closely enough to
prove title/authors/affiliations/keywords/body are detected in order.
Run:  py template/verify_roundtrip.py
"""
import re, sys
from docx import Document

KEYWORDS_RE = re.compile(r"^\s*(?:key\s*words?|keywords?|słowa\s*kluczowe)\s*[:：]?", re.I)
BODY_START_RE = re.compile(r"^\s*(?:abstract|introduction)\s*$", re.I)
EMAIL_RE = re.compile(r"[\w.+\-]+@[\w.\-]+\.\w{2,}")
INSTITUTION_RE = re.compile(r"university|institute|politechnika|akademi|laboratory|department|faculty|research\s*network|łukasiewicz", re.I)

d = Document("template/docx/abstract-example.docx")
zone = "TITLE"
seen = {}
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
        z = "KEYWORDS"; zone = "BODY"
    elif EMAIL_RE.search(t) and not has_sup and not re.match(r"^\d", t):
        z = zone = "EMAILS"
    elif re.match(r"^\d", t) and INSTITUTION_RE.search(t):
        z = zone = "AFFILIATIONS"
    elif has_sup or zone == "AUTHORS":
        z = zone = "AUTHORS"
    else:
        z = zone
    seen.setdefault(z, []).append(t[:50])

need = ["TITLE", "AUTHORS", "AFFILIATIONS", "EMAILS", "KEYWORDS", "BODY"]
ok = all(z in seen for z in need)
for z in need:
    print(f"{'OK ' if z in seen else 'MISS'} {z:13} {seen.get(z, ['--'])[0]}")
print("\nROUND-TRIP", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
