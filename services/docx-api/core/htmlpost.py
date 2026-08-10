"""Post-pandoc HTML fixups that survive the Node DOMPurify sanitizer: hoist inline
`style` dimensions/alignment into allowlisted attributes/classes (the sanitizer strips
`style`, so figure sizes and alignment would otherwise be lost)."""

import re

_IMG_RE = re.compile(r"<img\b[^>]*>", re.I)
_STYLE_RE = re.compile(r'style="([^"]*)"', re.I)
_PX_PER_UNIT = {
    "px": 1.0,
    "in": 96.0,
    "cm": 96.0 / 2.54,
    "mm": 96.0 / 25.4,
    "pt": 96.0 / 72.0,
    "pc": 16.0,
}


def _style_dim_px(prop: str, style: str) -> int | None:
    m = re.search(rf"\b{prop}\s*:\s*([\d.]+)\s*([a-z%]*)", style, re.I)
    if not m:
        return None
    unit = (m.group(2) or "px").lower()
    if unit not in _PX_PER_UNIT:  # e.g. "%" — not expressible as a px attribute
        return None
    try:
        return round(float(m.group(1)) * _PX_PER_UNIT[unit])
    except ValueError:
        return None


def hoist_img_dims(html: str) -> str:
    """Convert `<img style="width:Xin;height:Yin">` into unitless-px width/height
    attributes that survive sanitization, so figures keep their intended size."""
    def repl(m: re.Match) -> str:
        tag = m.group(0)
        style_m = _STYLE_RE.search(tag)
        if not style_m:
            return tag
        style = style_m.group(1)
        adds: list[str] = []
        for prop in ("width", "height"):
            if re.search(rf"\b{prop}\s*=", tag, re.I):
                continue  # respect an explicit attribute already present
            px = _style_dim_px(prop, style)
            if px is not None:
                adds.append(f'{prop}="{px}"')
        if not adds:
            return tag
        return "<img " + " ".join(adds) + tag[4:]

    return _IMG_RE.sub(repl, html)


_BLOCK_OPEN_RE = re.compile(r"<(p|div|td|th|h[1-6]|caption|table)\b([^>]*)>", re.I)
_TEXTALIGN_RE = re.compile(r"text-align\s*:\s*(center|right|justify)", re.I)
_WIDTH_FULL_RE = re.compile(r"width\s*:\s*100\s*%", re.I)
_CLASS_RE = re.compile(r'\bclass="([^"]*)"', re.I)


def hoist_block_styles(html: str) -> str:
    """Hoist block alignment/width into allowlisted classes: `text-align:*` -> `ta-*`,
    table `width:100%` -> `tbl-full`. (Paragraph direct alignment pandoc drops entirely
    is recovered separately in stylecss from document.xml.)"""
    def repl(m: re.Match) -> str:
        tag, attrs = m.group(1).lower(), m.group(2)
        style_m = _STYLE_RE.search(attrs)
        if not style_m:
            return m.group(0)
        style = style_m.group(1)
        adds: list[str] = []
        align = _TEXTALIGN_RE.search(style)
        if align:
            adds.append(f"ta-{align.group(1).lower()}")
        if tag == "table" and _WIDTH_FULL_RE.search(style):
            adds.append("tbl-full")
        if not adds:
            return m.group(0)
        cls_m = _CLASS_RE.search(attrs)
        if cls_m:
            merged = f'{cls_m.group(1)} {" ".join(adds)}'
            attrs = _CLASS_RE.sub(f'class="{merged}"', attrs, count=1)
        else:
            attrs = f'{attrs} class="{" ".join(adds)}"'
        return f"<{tag}{attrs}>"

    return _BLOCK_OPEN_RE.sub(repl, html)
