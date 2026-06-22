r"""Pre-pandoc MathType-equation conversion for the version-diff DOCX pipeline.

Pandoc converts native Office Math (OMML) but DROPS MathType equations, which are
embedded as OLE objects (`word/embeddings/oleObject*.bin`, ProgID `Equation.DSMT4`/
`Equation.3`) and survive only as a rasterized fallback image — hence the oversized
images in the redline. This module decodes the OLE's MTEF binary to LaTeX *before*
pandoc and rewrites each equation run into a sentinel text token. After pandoc, the
caller swaps each sentinel for a `<span class="math …">\(…\)</span>` span, which the
Node worker's existing KaTeX pass renders exactly like a native Word equation.

Design: conservative + lossless-or-skip. Anything the decoder can't map confidently
(MTEF v3, matrices, accents, unknown glyphs) raises `UnsupportedMtef`; the caller then
leaves that equation's OLE/image untouched, so we never emit subtly-wrong math — we
only upgrade equations we can decode with confidence.

The MTEF v5 binary format is implemented clean-room from the public spec
(https://rtf2latex2e.sourceforge.net/MTEF5.html, Wiris MathType SDK docs).
"""
from __future__ import annotations

import io
import re
import zipfile
from dataclasses import dataclass, field

import olefile
from lxml import etree

from htmlesc import esc_text

# OOXML namespaces used to locate MathType OLE objects.
NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "o": "urn:schemas-microsoft-com:office:office",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

# Sentinel: a distinctive ASCII token (pandoc preserves it verbatim as text), unique
# enough to never collide with real document text. `<n>` is the equation index.
SENTINEL_RE = re.compile(r"zMTEQNz(\d+)zENDz")


def sentinel(idx: int) -> str:
    return f"zMTEQNz{idx}zENDz"


class UnsupportedMtef(Exception):
    """The MTEF stream uses a construct we don't decode — caller keeps the image."""


# --- MTCode/Unicode -> LaTeX for glyphs KaTeX won't accept as a raw character.
# ASCII and most Latin letters/digits pass through unchanged; an unmapped non-ASCII
# glyph raises (→ fallback to image) rather than risk a wrong rendering.
SYM: dict[int, str] = {
    0x00D7: r"\times", 0x00F7: r"\div", 0x00B1: r"\pm", 0x2213: r"\mp",
    0x2264: r"\leq", 0x2265: r"\geq", 0x2260: r"\neq", 0x2248: r"\approx",
    0x2261: r"\equiv", 0x221E: r"\infty", 0x2192: r"\to", 0x2190: r"\leftarrow",
    0x21D2: r"\Rightarrow", 0x21D4: r"\Leftrightarrow", 0x2208: r"\in",
    0x2209: r"\notin", 0x2211: r"\sum", 0x220F: r"\prod", 0x222B: r"\int",
    0x221A: r"\sqrt", 0x2202: r"\partial", 0x2207: r"\nabla", 0x22C5: r"\cdot",
    0x2026: r"\ldots", 0x2212: r"-", 0x2032: r"'", 0x00B7: r"\cdot",
    0x2245: r"\cong", 0x221D: r"\propto", 0x2220: r"\angle", 0x22A5: r"\perp",
    0x2225: r"\parallel", 0x2229: r"\cap", 0x222A: r"\cup", 0x2282: r"\subset",
    0x2286: r"\subseteq", 0x2200: r"\forall", 0x2203: r"\exists",
    # Greek lowercase
    0x03B1: r"\alpha", 0x03B2: r"\beta", 0x03B3: r"\gamma", 0x03B4: r"\delta",
    0x03B5: r"\epsilon", 0x03B6: r"\zeta", 0x03B7: r"\eta", 0x03B8: r"\theta",
    0x03B9: r"\iota", 0x03BA: r"\kappa", 0x03BB: r"\lambda", 0x03BC: r"\mu",
    0x03BD: r"\nu", 0x03BE: r"\xi", 0x03C0: r"\pi", 0x03C1: r"\rho",
    0x03C3: r"\sigma", 0x03C4: r"\tau", 0x03C5: r"\upsilon", 0x03C6: r"\varphi",
    0x03C7: r"\chi", 0x03C8: r"\psi", 0x03C9: r"\omega",
    # Greek uppercase
    0x0393: r"\Gamma", 0x0394: r"\Delta", 0x0398: r"\Theta", 0x039B: r"\Lambda",
    0x039E: r"\Xi", 0x03A0: r"\Pi", 0x03A3: r"\Sigma", 0x03A6: r"\Phi",
    0x03A8: r"\Psi", 0x03A9: r"\Omega",
}
# ASCII characters that are special in LaTeX math and must be escaped.
_LATEX_ESC = {"#": r"\#", "$": r"\$", "%": r"\%", "&": r"\&", "_": r"\_",
              "{": r"\{", "}": r"\}", "~": r"{\sim}", "^": r"\hat{}", "\\": r"\backslash "}


def char_to_latex(mtcode: int) -> str:
    if mtcode in SYM:
        return SYM[mtcode] + " "
    if 0x20 <= mtcode < 0x7F:
        c = chr(mtcode)
        return _LATEX_ESC.get(c, c)
    raise UnsupportedMtef(f"unmapped char U+{mtcode:04X}")


# --- MTEF v5 AST -------------------------------------------------------------
@dataclass
class Run:
    items: list = field(default_factory=list)


@dataclass
class Char:
    mtcode: int


@dataclass
class Tmpl:
    sel: int
    var: int
    slots: list  # list[Run]


class _Parser:
    """Linear MTEF v5 record reader. Each record's tag byte IS the full record type
    (options live in a separate byte); structures nest via END-terminated slots."""

    def __init__(self, data: bytes):
        self.d, self.p = data, 0

    def _rd(self) -> int:
        b = self.d[self.p]
        self.p += 1
        return b

    def _rd_str(self) -> str:
        s = bytearray()
        while (c := self._rd()) != 0:
            s.append(c)
        return s.decode("latin-1")

    def _rd_sint(self) -> int:
        b = self._rd()
        if b == 0xFF:
            lo, hi = self._rd(), self._rd()
            return (lo | (hi << 8)) - 32768
        return b - 128

    def header(self) -> None:
        ver = self._rd()
        if ver != 5:
            raise UnsupportedMtef(f"MTEF v{ver} (only v5 supported)")
        self._rd(); self._rd(); self._rd(); self._rd()  # platform, product, ver, sub
        self._rd_str()  # application key (e.g. "DSMT7")
        self._rd()      # equation options

    def _skip_nudge(self) -> None:
        if self._rd() == 0x80:
            self._rd(); self._rd(); self._rd(); self._rd()

    def _read_eqn_prefs(self) -> None:
        self._rd()  # options
        for _ in range(2):  # sizes + spaces: count byte then a 0xF-terminated nibble stream
            count = self._rd()
            dims = 0
            while dims < count:
                byte = self._rd()
                for nib in (byte >> 4, byte & 0xF):
                    if nib == 0xF:
                        dims += 1
                        if dims == count:
                            break
        for _ in range(self._rd()):  # styles: count then (font index [+ style byte])
            if self._rd_sint() != -128:
                self._rd()

    def parse_run(self, top: bool = False) -> Run:
        items: list = []
        while self.p < len(self.d):
            rtype = self._rd()
            if rtype == 0:  # END
                if top:
                    continue
                return Run(items)
            opts = self._rd() if rtype in _OPTS_RECORDS else 0  # opts byte: types 1–6 only
            if opts & 0x08:
                self._skip_nudge()
            handler = _DISPATCH.get(rtype)
            if handler is None:
                raise UnsupportedMtef(f"record type {rtype}")
            handler(self, opts, items)
        return Run(items)

    # Per-record handlers, dispatched by tag byte; uniform (opts, items) signature.
    def _h_char(self, opts: int, items: list) -> None:
        self._rd_sint()  # typeface
        mt = None
        if not (opts & 0x20):  # mtefOPT_CHAR_ENC_NO_MTCODE
            lo, hi = self._rd(), self._rd()
            mt = lo | (hi << 8)
        if opts & 0x04:  # 8-bit font position
            self._rd()
        if opts & 0x10:  # 16-bit font position
            self._rd(); self._rd()
        if opts & 0x01:  # embellishment list — would change the glyph; skip eqn
            raise UnsupportedMtef("char embellishment (accent)")
        if mt:
            items.append(Char(mt))

    def _h_line(self, opts: int, items: list) -> None:
        if opts & 0x01:        # mtefOPT_LINE_NULL: empty slot
            items.append(Run([])); return
        if opts & 0x02:        # mtefOPT_LP_RULER: a RULER record follows
            self._read_ruler()
        if opts & 0x04:        # mtefOPT_LINE_LSPACE
            self._rd_sint()
        items.append(self.parse_run())

    def _h_tmpl(self, opts: int, items: list) -> None:
        sel = self._rd()
        var = self._rd()
        if var & 0x80:
            var = (var & 0x7F) | (self._rd() << 8)
        self._rd()  # template options byte (present for every template)
        sub = self.parse_run()
        slots = [it for it in sub.items if isinstance(it, Run)]
        items.append(Tmpl(sel, var, slots))

    def _h_size(self, opts: int, items: list) -> None:  # SIZE / COLOR ref
        self._rd_sint()

    def _h_ruler(self, opts: int, items: list) -> None:
        self._read_ruler()

    def _h_font_style_def(self, opts: int, items: list) -> None:
        self._rd(); self._rd()

    def _h_encoding_def(self, opts: int, items: list) -> None:
        self._rd_str()

    def _h_font_def(self, opts: int, items: list) -> None:
        self._rd(); self._rd_str()

    def _h_eqn_prefs(self, opts: int, items: list) -> None:
        self._read_eqn_prefs()

    def _h_color_def(self, opts: int, items: list) -> None:
        raise UnsupportedMtef("color")

    def _h_pile(self, opts: int, items: list) -> None:  # PILE / MATRIX
        raise UnsupportedMtef("pile/matrix")

    def _h_nop(self, opts: int, items: list) -> None:  # typesize shortcuts 10–14
        pass

    def _read_ruler(self) -> None:
        count = self._rd()
        for _ in range(count):
            self._rd()        # tab-stop type
            self._rd_sint()   # offset


# Record types carrying an options byte. Tag byte -> handler; absent tags (incl. 6)
# are unsupported.
_OPTS_RECORDS = frozenset({1, 2, 3, 4, 5, 6})
_DISPATCH = {
    1: _Parser._h_line, 2: _Parser._h_char, 3: _Parser._h_tmpl,
    4: _Parser._h_pile, 5: _Parser._h_pile,
    7: _Parser._h_ruler, 8: _Parser._h_font_style_def, 9: _Parser._h_size,
    10: _Parser._h_nop, 11: _Parser._h_nop, 12: _Parser._h_nop,
    13: _Parser._h_nop, 14: _Parser._h_nop,
    15: _Parser._h_size, 16: _Parser._h_color_def,
    17: _Parser._h_font_def, 18: _Parser._h_eqn_prefs, 19: _Parser._h_encoding_def,
}


# --- AST -> LaTeX ------------------------------------------------------------
def _latex(n) -> str:
    if isinstance(n, Run):
        return "".join(_latex(x) for x in n.items)
    if isinstance(n, Char):
        return char_to_latex(n.mtcode)
    if isinstance(n, Tmpl):
        return _tmpl_latex(n)
    return ""


def _slot(slots: list, i: int) -> str:
    return _latex(slots[i]) if i < len(slots) else ""


_FENCES = {0: (r"\langle", r"\rangle"), 1: ("(", ")"), 2: (r"\{", r"\}"),
           3: ("[", "]"), 4: ("|", "|"), 5: (r"\|", r"\|"),
           6: (r"\lfloor", r"\rfloor"), 7: (r"\lceil", r"\rceil")}
_BIGOP = {15: r"\int", 16: r"\sum", 17: r"\prod", 18: r"\coprod",
          19: r"\bigcup", 20: r"\bigcap", 21: r"\int", 22: r"\sum"}


def _tmpl_latex(t: Tmpl) -> str:
    s = t.sel
    if s == 11:  # fraction (numerator, denominator)
        return r"\frac{%s}{%s}" % (_slot(t.slots, 0), _slot(t.slots, 1))
    if s == 10:  # root: square (slot0) or nth (index, radicand)
        if t.var & 1:
            return r"\sqrt[%s]{%s}" % (_slot(t.slots, 0), _slot(t.slots, 1))
        return r"\sqrt{%s}" % _slot(t.slots, 0)
    if s == 27:  # subscript
        return r"_{%s}" % _slot(t.slots, 0)
    if s == 28:  # superscript
        return r"^{%s}" % _slot(t.slots, 0)
    if s == 29:  # sub+superscript (subscript slot, superscript slot)
        return r"_{%s}^{%s}" % (_slot(t.slots, 0), _slot(t.slots, 1))
    if s in _BIGOP:  # big operator: main, upper, lower (operator char ignored)
        out = _BIGOP[s]
        lower, upper = _slot(t.slots, 2), _slot(t.slots, 1)
        if lower:
            out += "_{%s}" % lower
        if upper:
            out += "^{%s}" % upper
        return out + " " + _slot(t.slots, 0)
    if s in _FENCES:  # bracket/fence around the main slot
        left, right = _FENCES[s]
        lft = r"\left" + left if (t.var & 1) else r"\left."
        rgt = r"\right" + right if (t.var & 2) else r"\right."
        return "%s %s %s" % (lft, _slot(t.slots, 0), rgt)
    raise UnsupportedMtef(f"template selector {s} (var {t.var:#x})")


def decode_mtef_to_latex(mtef: bytes) -> str:
    """Decode an MTEF v5 byte stream to a LaTeX string. Raises UnsupportedMtef."""
    p = _Parser(mtef)
    p.header()
    latex = _latex(p.parse_run(top=True)).strip()
    if not latex:
        raise UnsupportedMtef("empty equation")
    return latex


def mtef_from_ole(ole_bytes: bytes) -> bytes:
    """Extract the MTEF stream from a MathType OLE compound file (`Equation Native`)."""
    if not olefile.isOleFile(io.BytesIO(ole_bytes)):
        raise UnsupportedMtef("not an OLE compound file")
    ole = olefile.OleFileIO(io.BytesIO(ole_bytes))
    try:
        if not ole.exists("Equation Native"):
            raise UnsupportedMtef("no 'Equation Native' stream")
        raw = ole.openstream("Equation Native").read()
    finally:
        ole.close()
    # Skip the 28-byte EQNOLEFILEHDR; the MTEF data follows.
    if len(raw) < 28:
        raise UnsupportedMtef("truncated Equation Native stream")
    cb_hdr = int.from_bytes(raw[0:2], "little")
    return raw[cb_hdr:]


# --- DOCX rewrite ------------------------------------------------------------
@dataclass
class ConvertedEquation:
    idx: int
    latex: str
    display: bool


def _rels_map(zf: zipfile.ZipFile) -> dict[str, str]:
    """rId -> target path (relative to word/) for document relationships."""
    try:
        data = zf.read("word/_rels/document.xml.rels")
    except KeyError:
        return {}
    root = etree.fromstring(data)
    out: dict[str, str] = {}
    for rel in root.findall("rel:Relationship", NS):
        out[rel.get("Id")] = rel.get("Target")
    return out


def _is_display(obj: etree._Element) -> bool:
    """Display (own line) if the object's paragraph has no other visible text/runs."""
    para = obj
    while para is not None and etree.QName(para).localname != "p":
        para = para.getparent()
    if para is None:
        return False
    text = "".join(t.text or "" for t in para.iter(f"{{{NS['w']}}}t"))
    n_objs = len(list(para.iter(f"{{{NS['w']}}}object")))
    return text.strip() == "" and n_objs <= 1


def convert_mathtype_oles(docx_bytes: bytes) -> tuple[bytes, list[ConvertedEquation]]:
    """Rewrite each decodable MathType OLE equation in `docx_bytes` into a sentinel
    text run. Returns the new DOCX bytes and the list of converted equations (sentinel
    index -> latex + display flag). Equations that fail to decode are left untouched
    (their fallback image flows through pandoc as before)."""
    zin = zipfile.ZipFile(io.BytesIO(docx_bytes))
    try:
        names = zin.namelist()
        if "word/document.xml" not in names:
            return docx_bytes, []
        rels = _rels_map(zin)
        doc = etree.fromstring(zin.read("word/document.xml"))

        converted: list[ConvertedEquation] = []
        idx = 0
        for obj in list(doc.iter(f"{{{NS['w']}}}object")):
            ole = obj.find("o:OLEObject", NS)
            if ole is None:
                continue
            prog = ole.get("ProgID") or ""
            rid = ole.get(f"{{{NS['r']}}}id")
            if not prog.startswith("Equation.") or not rid:
                continue
            target = rels.get(rid)
            if not target:
                continue
            bin_path = "word/" + target.lstrip("/")
            try:
                ole_bytes = zin.read(bin_path)
                latex = decode_mtef_to_latex(mtef_from_ole(ole_bytes))
            except (UnsupportedMtef, KeyError):
                continue  # leave this equation as its fallback image
            display = _is_display(obj)
            # Replace the <w:object> with a sentinel text run inside its run.
            run = obj.getparent()
            tok = etree.SubElement(run, f"{{{NS['w']}}}t")
            tok.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            tok.text = sentinel(idx)
            run.remove(obj)
            converted.append(ConvertedEquation(idx, latex, display))
            idx += 1

        if not converted:
            return docx_bytes, []

        new_doc = etree.tostring(doc, xml_declaration=True, encoding="UTF-8",
                                 standalone=True)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = new_doc if item.filename == "word/document.xml" else zin.read(item.filename)
                zout.writestr(item, data)
        return buf.getvalue(), converted
    finally:
        zin.close()


def apply_sentinels(html: str, equations: list[ConvertedEquation]) -> str:
    """Replace each sentinel token in pandoc's HTML with a math span the Node KaTeX
    pass renders. Mirrors pandoc's native-math output: HTML-escaped TeX inside
    `<span class="math inline|display">\\(…\\)</span>`."""
    by_idx = {e.idx: e for e in equations}

    def repl(m: re.Match) -> str:
        eq = by_idx.get(int(m.group(1)))
        if eq is None:
            return ""
        body = esc_text(eq.latex)
        if eq.display:
            return f'<span class="math display">\\[{body}\\]</span>'
        return f'<span class="math inline">\\({body}\\)</span>'

    return SENTINEL_RE.sub(repl, html)
