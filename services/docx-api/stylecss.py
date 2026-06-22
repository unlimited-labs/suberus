"""
Per-style CSS + direct-alignment recovery for the version-diff render substrate,
derived from the DOCX's own `word/styles.xml` and `word/document.xml`.

Pandoc's `docx+styles` preserves each paragraph/character style's NAME as
`data-custom-style="<name>"` but drops the formatting; it ALSO drops direct
paragraph alignment (a `<w:jc>` applied to the paragraph itself). Word keeps both:
the style formatting in styles.xml, the direct alignment in document.xml. We
reconstruct both here so the redline reproduces the document's own look — title /
authors / affiliation centered, body justified, the ABSTRACT / REFERENCES headings
centered (direct formatting), captions centered — none of which survives Pandoc's
semantic HTML otherwise.

Two mechanisms, both routed through SAFE channels (CSS classes, never the `style`
attribute the sanitizer strips):

  1. styles.xml -> a constrained per-style stylesheet, keyed to opaque `cs<hash>`
     classes (a hash of the style NAME, so the same style maps to the same rule in
     both versions and the combined redline styles correctly under one sheet).
  2. document.xml -> for each paragraph carrying a DIRECT alignment, an `ta-*`
     override class on the matching element (matched by (style-name, text)).

Security: the CSS is GENERATED from parsed XML values against a closed
property+value allowlist; class tokens are hashes/enums, never raw author text, so
the output cannot carry `url()`/`@import`/`expression()` or escape a selector. It
is delivered as a separate payload, NOT through the HTML sanitizer; the Node
DOMPurify gate over the HTML is unchanged.
"""

import hashlib
import re
import zipfile
from xml.etree import ElementTree as ET

from lxml import html as lhtml

_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _q(tag: str) -> str:
    return f"{{{_W}}}{tag}"


# Word `w:jc` -> CSS text-align. "both"/"distribute" are Word's justify; unknown
# values are dropped rather than guessed.
_ALIGN = {
    "left": "left", "start": "left",
    "right": "right", "end": "right",
    "center": "center",
    "both": "justify", "distribute": "justify",
}

# Strip anything from a font name that could escape the CSS string value.
_FONT_STRIP = re.compile(r"[^A-Za-z0-9 \-]")
_SERIF_HINTS = ("times", "georgia", "garamond", "cambria", "roman", "serif",
                "minion", "palatino", "book antiqua", "comni", "wccm")
_HEX6 = re.compile(r"^[0-9A-Fa-f]{6}$")


def _cls(name: str) -> str:
    """Opaque, stable, injection-proof class token for a style name."""
    return "cs" + hashlib.sha256(name.encode("utf-8")).hexdigest()[:10]


def _norm(text: str | None) -> str:
    return " ".join((text or "").split())


def _truthy(el: ET.Element | None) -> bool:
    """A boolean toggle like <w:b/> is on unless explicitly w:val="0"/"false"."""
    if el is None:
        return False
    return el.get(_q("val")) not in ("0", "false", "none")


def _font_family(raw: str | None) -> str | None:
    if not raw:
        return None
    name = _FONT_STRIP.sub("", raw).strip()
    if not name:
        return None
    generic = "serif" if any(h in name.lower() for h in _SERIF_HINTS) else "sans-serif"
    return f'"{name}", {generic}'


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


class _Styles:
    """Parsed styles.xml: docDefaults + each style's pPr/rPr and basedOn chain."""

    def __init__(self, root: ET.Element):
        self.by_id: dict[str, dict] = {}
        self.name_of: dict[str, str] = {}  # styleId -> human name (pandoc's key)
        dd = root.find(_q("docDefaults"))
        self.def_ppr = dd.find(f"{_q('pPrDefault')}/{_q('pPr')}") if dd is not None else None
        self.def_rpr = dd.find(f"{_q('rPrDefault')}/{_q('rPr')}") if dd is not None else None
        for s in root.findall(_q("style")):
            sid = s.get(_q("styleId"))
            if not sid:
                continue
            name_el = s.find(_q("name"))
            name = name_el.get(_q("val")) if name_el is not None else sid
            based = s.find(_q("basedOn"))
            self.by_id[sid] = {
                "name": name,
                "basedOn": based.get(_q("val")) if based is not None else None,
                "pPr": s.find(_q("pPr")),
                "rPr": s.find(_q("rPr")),
            }
            self.name_of[sid] = name

    def _chain(self, sid: str) -> list[dict]:
        out: list[dict] = []
        seen: set[str] = set()
        while sid and sid in self.by_id and sid not in seen:
            seen.add(sid)
            out.append(self.by_id[sid])
            sid = self.by_id[sid]["basedOn"]
        out.reverse()  # root ancestor first, so the style itself wins
        return out

    def _resolve(self, sid: str) -> dict:
        """Effective raw formatting: docDefaults, then basedOn chain, then style."""
        layers = [(self.def_ppr, self.def_rpr)]
        layers += [(s["pPr"], s["rPr"]) for s in self._chain(sid)]
        p: dict = {}
        for ppr, rpr in layers:
            if ppr is not None:
                jc = ppr.find(_q("jc"))
                if jc is not None:
                    p["align"] = jc.get(_q("val"))
                spacing = ppr.find(_q("spacing"))
                if spacing is not None:
                    if spacing.get(_q("before")) is not None:
                        p["mt"] = spacing.get(_q("before"))
                    if spacing.get(_q("after")) is not None:
                        p["mb"] = spacing.get(_q("after"))
            if rpr is not None:
                if rpr.find(_q("b")) is not None:
                    p["bold"] = _truthy(rpr.find(_q("b")))
                if rpr.find(_q("i")) is not None:
                    p["italic"] = _truthy(rpr.find(_q("i")))
                if rpr.find(_q("u")) is not None:
                    p["underline"] = _truthy(rpr.find(_q("u")))
                if rpr.find(_q("caps")) is not None:
                    p["caps"] = _truthy(rpr.find(_q("caps")))
                sz = rpr.find(_q("sz"))
                if sz is not None:
                    p["sz"] = sz.get(_q("val"))
                fonts = rpr.find(_q("rFonts"))
                if fonts is not None:
                    p["font"] = (fonts.get(_q("ascii")) or fonts.get(_q("hAnsi"))
                                 or fonts.get(_q("cs")))
                color = rpr.find(_q("color"))
                if color is not None:
                    p["color"] = color.get(_q("val"))
        return p

    def declarations(self, name: str) -> list[str]:
        """Allowlisted, validated CSS declarations for a style name (or [])."""
        sid = next((i for i, n in self.name_of.items() if n == name), None)
        if not sid:
            return []
        p = self._resolve(sid)
        out: list[str] = []
        if p.get("align") in _ALIGN:
            out.append(f"text-align:{_ALIGN[p['align']]}")
        if p.get("bold"):
            out.append("font-weight:700")
        if p.get("italic"):
            out.append("font-style:italic")
        if p.get("underline"):
            out.append("text-decoration:underline")
        if p.get("caps"):
            out.append("text-transform:uppercase")
        if p.get("sz"):
            try:
                pt = _clamp(int(p["sz"]) / 2.0, 5, 72)
                out.append(f"font-size:{pt:g}pt")
            except ValueError:
                pass
        fam = _font_family(p.get("font"))
        if fam:
            out.append(f"font-family:{fam}")
        for key, prop in (("mt", "margin-top"), ("mb", "margin-bottom")):
            if p.get(key) is not None:
                try:
                    pt = _clamp(int(p[key]) / 20.0, 0, 60)
                    out.append(f"{prop}:{pt:g}pt")
                except ValueError:
                    pass
        color = p.get("color")
        if color and color != "auto" and _HEX6.match(color):
            out.append(f"color:#{color}")
        return out


def _direct_aligns(
    doc_root: ET.Element, styles: _Styles
) -> tuple[dict[tuple[str, str], str], dict[str, str]]:
    """Recover DIRECT paragraph alignment (a `<w:jc>` on the paragraph itself —
    formatting Pandoc drops). Returns two text-keyed maps, both dropping ambiguous
    keys so we never guess:
      - by_name_text: (style-name, text) -> align, precise, for `data-custom-style`
        elements where we know the style name.
      - by_text: text -> align, for elements Pandoc emits with NO style hook (a bare
        `<p>` for a Normal/unstyled centered title/author block — the common gap).
    """
    by_nt: dict[tuple[str, str], str] = {}
    bad_nt: set[tuple[str, str]] = set()
    by_t: dict[str, str] = {}
    bad_t: set[str] = set()
    for p in doc_root.iter(_q("p")):
        ppr = p.find(_q("pPr"))
        if ppr is None:
            continue
        jc = ppr.find(_q("jc"))
        if jc is None or jc.get(_q("val")) not in _ALIGN:
            continue
        align = _ALIGN[jc.get(_q("val"))]
        text = _norm("".join(t.text or "" for t in p.iter(_q("t"))))
        if not text:
            continue
        if text in bad_t:
            pass
        elif text in by_t and by_t[text] != align:
            del by_t[text]
            bad_t.add(text)
        else:
            by_t[text] = align
        pstyle = ppr.find(_q("pStyle"))
        sid = pstyle.get(_q("val")) if pstyle is not None else None
        name = styles.name_of.get(sid) if sid else None
        if name:
            key = (name, text)
            if key in bad_nt:
                continue
            if key in by_nt and by_nt[key] != align:
                del by_nt[key]
                bad_nt.add(key)
                continue
            by_nt[key] = align
    return by_nt, by_t


_PLACEHOLDER_RE = re.compile(r"%\d+")


def _paren_list_texts(doc_root: ET.Element, numbering: ET.Element) -> set[str]:
    """Normalized text of numbered paragraphs whose Word list marker ends in ")".

    Pandoc emits `<ol type="a">` but drops the delimiter; the real one lives in
    numbering.xml's `lvlText` (e.g. "%1)"). Browsers render "a." by default, so we
    only need to flag the ")"-delimited lists for a CSS override. Matched by text so
    the right `<ol>` is tagged without correlating pandoc's output to numId."""
    # numId -> abstractNumId
    num2abs: dict[str, str] = {}
    for n in numbering.findall(_q("num")):
        a = n.find(_q("abstractNumId"))
        if a is not None and n.get(_q("numId")):
            num2abs[n.get(_q("numId"))] = a.get(_q("val"))
    # abstractNumId -> {ilvl: lvlText}
    abs2lvl: dict[str, dict[str, str | None]] = {}
    for an in numbering.findall(_q("abstractNum")):
        levels: dict[str, str | None] = {}
        for lvl in an.findall(_q("lvl")):
            t = lvl.find(_q("lvlText"))
            levels[lvl.get(_q("ilvl"))] = t.get(_q("val")) if t is not None else None
        abs2lvl[an.get(_q("abstractNumId"))] = levels

    out: set[str] = set()
    for p in doc_root.iter(_q("p")):
        ppr = p.find(_q("pPr"))
        numpr = ppr.find(_q("numPr")) if ppr is not None else None
        if numpr is None:
            continue
        ilvl_el = numpr.find(_q("ilvl"))
        nid_el = numpr.find(_q("numId"))
        ilvl = ilvl_el.get(_q("val")) if ilvl_el is not None else "0"
        nid = nid_el.get(_q("val")) if nid_el is not None else None
        lvl_text = abs2lvl.get(num2abs.get(nid, ""), {}).get(ilvl)
        if not lvl_text:
            continue
        delim = _PLACEHOLDER_RE.sub("", lvl_text).strip()
        if delim == ")":
            text = _norm("".join(t.text or "" for t in p.iter(_q("t"))))
            if text:
                out.add(text)
    return out


def _heading_styles(doc_root: ET.Element, styles: _Styles) -> dict[str, str]:
    """Map normalized paragraph text -> style name for paragraphs whose style maps
    to a heading. Pandoc renders a BUILTIN heading style (e.g. "heading 1") as a bare
    `<h1>` and DROPS the custom-style name, so styles.xml formatting can't reach it
    via `data-custom-style`. We recover the real style (e.g. an 11pt author line vs a
    14pt title) by matching the heading's text back to its source paragraph. Ambiguous
    texts (same text, different style) are dropped so we never guess."""
    out: dict[str, str] = {}
    bad: set[str] = set()
    for p in doc_root.iter(_q("p")):
        ppr = p.find(_q("pPr"))
        pstyle = ppr.find(_q("pStyle")) if ppr is not None else None
        sid = pstyle.get(_q("val")) if pstyle is not None else None
        name = styles.name_of.get(sid) if sid else None
        if not name:
            continue
        text = _norm("".join(t.text or "" for t in p.iter(_q("t"))))
        if not text or text in bad:
            continue
        if text in out and out[text] != name:
            del out[text]
            bad.add(text)
            continue
        out[text] = name
    return out


def _read(docx_path: str):
    try:
        with zipfile.ZipFile(docx_path) as z:
            styles = _Styles(ET.fromstring(z.read("word/styles.xml")))
            doc = ET.fromstring(z.read("word/document.xml"))
            paren = set()
            try:
                numbering = ET.fromstring(z.read("word/numbering.xml"))
                paren = _paren_list_texts(doc, numbering)
            except (KeyError, ET.ParseError):
                pass  # no list numbering — nothing to recover
            direct_nt, direct_t = _direct_aligns(doc, styles)
            return styles, direct_nt, direct_t, paren, _heading_styles(doc, styles)
    except (KeyError, zipfile.BadZipFile, ET.ParseError):
        return None, {}, {}, set(), {}


def annotate(html: str, docx_path: str) -> tuple[str, str]:
    """Tag custom-styled elements with a stable `cs<hash>` class (plus a `ta-*`
    override where the paragraph is directly aligned) and return `(html, css)`.
    `css` defines one rule per style actually used. On any failure the html is
    returned unchanged with empty css (degrades to the base typography)."""
    styles, direct_nt, direct_t, paren_lists, heading_styles = _read(docx_path)
    if styles is None:
        return html, ""
    try:
        frag = lhtml.fragment_fromstring(html, create_parent="cssroot")
    except Exception:
        return html, ""

    headings = {"h1", "h2", "h3", "h4", "h5", "h6"}
    align_tags = headings | {"p", "div"}
    used: dict[str, str] = {}
    for el in frag.iter():
        tag = el.tag if isinstance(el.tag, str) else ""
        # Tag a ")"-delimited ordered list (Word "a)") so the CSS renders the paren
        # pandoc dropped. Match the <li> text, flag its parent <ol>.
        if tag == "li" and paren_lists and _norm(el.text_content()) in paren_lists:
            ol = el.getparent()
            if ol is not None and ol.tag == "ol":
                cls = (ol.get("class") or "").split()
                if "ol-paren" not in cls:
                    cls.append("ol-paren")
                # Encode the numbering style as a class (case-sensitive, unlike a
                # `[type=a]` attr selector which collides a/A in HTML) so the CSS
                # renders the right glyph. pandoc's type is one of 1/a/A/i/I.
                t = (ol.get("type") or "1")
                if t in ("1", "a", "A", "i", "I"):
                    olp = f"olp-{t}"
                    if olp not in cls:
                        cls.append(olp)
                ol.set("class", " ".join(cls))
        name = el.get("data-custom-style")
        # Builtin heading styles lose their name (pandoc -> bare <hN>); recover the
        # real style by text so the author <h1> renders at its true size, not base 1.5em.
        if not name and tag in headings:
            name = heading_styles.get(_norm(el.text_content()))
        txt = _norm(el.text_content())
        # Direct paragraph alignment pandoc dropped: precise (name,text) when we know
        # the style, else text-only — the latter recovers a bare <p> centered title/
        # author block that carries no style hook at all (the common header-centering gap).
        align = direct_nt.get((name, txt)) if name else None
        if not align and tag in align_tags:
            align = direct_t.get(txt)
        if not name and not align:
            continue
        classes = (el.get("class") or "").split()
        if name:
            cls = _cls(name)
            used[name] = cls
            if cls not in classes:
                classes.append(cls)
        if align:
            ta = f"ta-{align}"
            if ta not in classes:
                classes.append(ta)
        el.set("class", " ".join(classes))

    out = (frag.text or "") + "".join(
        lhtml.tostring(c, encoding="unicode") for c in frag
    )

    rules: list[str] = []
    for name, cls in used.items():
        decls = styles.declarations(name)
        if decls:
            rules.append(f".{cls}{{{';'.join(decls)}}}")
    return out, "\n".join(rules)
