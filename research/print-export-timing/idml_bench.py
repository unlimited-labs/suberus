"""IDML generation timing on the same synthetic programs (lxml + zipfile, sidecar-style)."""

import io
import json
import sys
import time
import tracemalloc
import zipfile
from pathlib import Path

from lxml import etree

PKG = "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"


def el(tag, attrs=None, *children, text=None):
    e = etree.Element(tag, {k: str(v) for k, v in (attrs or {}).items()})
    if text is not None:
        e.text = text
    for c in children:
        e.append(c)
    return e


def para(style, *runs):
    psr = el("ParagraphStyleRange", {"AppliedParagraphStyle": f"ParagraphStyle/{style}"})
    if not runs:
        psr.append(el("CharacterStyleRange", {"AppliedCharacterStyle": "CharacterStyle/$ID/[No character style]"}))
    for text, cstyle in runs:
        csr = el("CharacterStyleRange", {"AppliedCharacterStyle": f"CharacterStyle/{cstyle}"})
        csr.append(el("Content", text=text))
        psr.append(csr)
    psr[-1].append(el("Br"))
    return psr


def hhmm(m):
    return f"{m // 60:02d}:{m % 60:02d}"


def build(days):
    story = el("Story", {"Self": "u_story"})
    for d, day in enumerate(days):
        story.append(para("DayHeading", (f"Program at a glance — {day['label']}", "$ID/[No character style]")))
        starts = sorted({s["start"] for s in day["sessions"]})
        cols, rows = 1 + len(day["rooms"]), 1 + 2 * len(starts)
        tab = el("Table", {"Self": f"t{d}", "HeaderRowCount": 1, "BodyRowCount": rows - 1, "ColumnCount": cols})
        for r in range(rows):
            tab.append(el("Row", {"Self": f"t{d}r{r}", "Name": r}))
        for c in range(cols):
            tab.append(el("Column", {"Self": f"t{d}c{c}", "Name": c}))
        by = {(s["start"], s["room"]): s for s in day["sessions"]}
        for ri, t in enumerate(starts):
            r = 1 + 2 * ri
            for c in range(cols):
                cell = el("Cell", {"Self": f"t{d}i{c}i{r}", "Name": f"{c}:{r}", "RowSpan": 1 if c == 0 else 2})
                s = by.get((t, c - 1))
                text = hhmm(t) if c == 0 else (f"{s['code']} {s['title']}" if s else "")
                if text:
                    cell.append(para("GridCell", (text, "$ID/[No character style]")))
                tab.append(cell)
            tab.append(el("Cell", {"Self": f"t{d}i0i{r + 1}", "Name": f"0:{r + 1}"}))
        wrap = para("GridCell")
        wrap[0].insert(0, tab)
        story.append(wrap)
    for day in days:
        story.append(para("DayHeading", (day["label"], "$ID/[No character style]")))
        for s in day["sessions"]:
            story.append(para("SessionHeading", (f"{s['code']} ", "Code"), (s["title"], "$ID/[No character style]")))
            story.append(para("SessionMeta", (f"{hhmm(s['start'])}–{hhmm(s['end'])} · Chair: {s['chair']}", "$ID/[No character style]")))
            for i, sl in enumerate(s["slots"]):
                story.append(para("SlotTitle", (f"{hhmm(s['start'] + i * 15)} ", "Time"), (sl["title"], "$ID/[No character style]")))
                runs = [(f"{a['first'][0]}. {a['last']}", "Presenter" if j == 0 else "$ID/[No character style]") for j, a in enumerate(sl["authors"])]
                story.append(para("SlotAuthors", *runs))
    root = el(f"{{{PKG}}}Story", {"DOMVersion": "20.0"}, story)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), "application/vnd.adobe.indesign-idml-package", compress_type=zipfile.ZIP_STORED)
        z.writestr("Stories/Story_u_story.xml", etree.tostring(root, xml_declaration=True, encoding="UTF-8"), compress_type=zipfile.ZIP_DEFLATED)
    return buf.getvalue()


here = Path(__file__).parent
for name in ["S", "M", "L", "XL"]:
    raw = (here / f"program-{name}.json").read_text(encoding="utf-8")
    tracemalloc.start()
    t0 = time.perf_counter()
    days = json.loads(raw)
    out = build(days)
    ms = (time.perf_counter() - t0) * 1000
    peak = tracemalloc.get_traced_memory()[1] / 1e6
    tracemalloc.stop()
    print(json.dumps({"scale": name, "idml": f"{ms:.0f} ms (parse+build+zip), peak {peak:.0f} MB, {len(out) // 1024} KB"}))
    sys.stdout.flush()
