"""
Structural HTML redline between two normalized HTML fragments, for the
submission version-diff pipeline.

xmldiff (tree edit distance) gives us what no JS library does: heading/cell tag
changes (h2->h3, td->th), figure add/remove/swap, and MOVE detection — not just
word-level text. We run it on the already-normalized + sanitized HTML, translate
xmldiff's `diff:` annotations into the `<ins>`/`<del>`/`.matheq`/`.moved` markup
the render substrate styles, and hand the result back to the Node worker, whose
DOMPurify pass remains the authoritative sanitize gate.

Math spans are replaced with an empty `<mathtok h="sha">` placeholder before
diffing: xmldiff treats attribute values atomically (unlike text, which it
splits), so a one-character equation change marks the whole formula changed
instead of garbling the TeX. They are restored to KaTeX-ready spans afterwards.
"""

import hashlib
import re

from lxml import etree
from lxml import html as lhtml
from xmldiff import formatting, main

from htmlesc import esc_attr as _attr_esc
from htmlesc import esc_text as _esc

DIFF_NS = "http://namespaces.shoobx.com/diff"
DIFF = f"{{{DIFF_NS}}}"
VOID = {"img", "br", "hr"}

_MATH_SPAN_RE = re.compile(r'<span class="math[^"]*">.*?</span>', re.S)


def _protect_math(html: str, tokens: dict[str, str]) -> str:
    """Swap each `<span class="math">` for an empty `<mathtok h="sha">` element."""

    def repl(m: re.Match) -> str:
        span = m.group(0)
        sha = hashlib.sha256(span.encode()).hexdigest()
        tokens[sha] = span  # identical spans -> identical sha -> no spurious diff
        return f'<mathtok h="{sha}"></mathtok>'

    return _MATH_SPAN_RE.sub(repl, html)


def _open_tag(tag: str, el: etree._Element) -> str:
    attrs = "".join(
        f' {k}="{_attr_esc(v)}"'
        for k, v in el.attrib.items()
        if not k.startswith(DIFF)
    )
    return f"<{tag}{attrs}>"


def _split_update_attr(value: str, name: str) -> str | None:
    """Pull the old value of `name` out of a `diff:update-attr="src:old;..."`."""
    for part in value.split(";"):
        if part.startswith(f"{name}:"):
            return part[len(name) + 1 :]
    return None


def diff_html(html_a: str, html_b: str) -> str:
    """Redline between two normalized HTML fragments (untrusted output — the Node
    worker DOMPurify-sanitizes it before persisting)."""
    tokens: dict[str, str] = {}
    a = _protect_math(html_a, tokens)
    b = _protect_math(html_b, tokens)
    tree_a = lhtml.fragment_fromstring(a, create_parent="root")
    tree_b = lhtml.fragment_fromstring(b, create_parent="root")
    annotated = main.diff_trees(
        tree_a,
        tree_b,
        # WS_TAGS: ignore formatting whitespace between block tags, but preserve
        # significant inline spaces (WS_BOTH eats the space around inline elements).
        formatter=formatting.XMLFormatter(normalize=formatting.WS_TAGS),
    )
    root = etree.fromstring(annotated.encode())

    # A whole-element insert whose text equals a whole-element delete is a MOVE:
    # badge the inserted copy `moved`, drop the deleted copy. Marks live in DIFF-
    # namespace attributes (auto-stripped on emit); lxml reuses C nodes behind
    # fresh Python wrappers each iteration, so id()-based sets would not be stable.
    by_text: dict[str, list[etree._Element]] = {}
    for d in root.iter():
        if f"{DIFF}delete" in d.attrib:
            by_text.setdefault("".join(d.itertext()).strip(), []).append(d)
    for ins in root.iter():
        if f"{DIFF}insert" in ins.attrib:
            bucket = by_text.get("".join(ins.itertext()).strip())
            if bucket:
                ins.set(f"{DIFF}moved", "1")
                bucket.pop().set(f"{DIFF}drop", "1")

    def restore_span(el: etree._Element) -> str:
        return tokens.get(el.get("h", ""), "")

    def plain(el: etree._Element) -> str:
        """Render an element + subtree ignoring diff markers (whole ins/del block)."""
        q = etree.QName(el)
        if q.namespace == DIFF_NS:
            return kids(el, plain)  # unwrap nested diff:insert/delete inside the block
        tag = q.localname
        if tag == "mathtok":
            return restore_span(el)
        if tag in VOID:
            return _open_tag(tag, el)
        return f"{_open_tag(tag, el)}{kids(el, plain)}</{tag}>"

    def kids(el: etree._Element, render) -> str:
        out = [_esc(el.text)]
        for c in el:
            out.append(render(c))
            out.append(_esc(c.tail))
        return "".join(out)

    def build(el: etree._Element) -> str:
        q = etree.QName(el)
        if q.namespace == DIFF_NS:
            if q.localname == "delete":
                return f"<del>{kids(el, build)}</del>"
            if q.localname == "insert":
                return f"<ins>{kids(el, build)}</ins>"
            return kids(el, build)

        tag = q.localname
        a = el.attrib

        if tag == "mathtok":
            if f"{DIFF}update-attr" in a:
                old = tokens.get(_split_update_attr(a[f"{DIFF}update-attr"], "h") or "", "")
                new = restore_span(el)
                return f'<del class="matheq">{old}</del><ins class="matheq">{new}</ins>'
            return restore_span(el)

        if f"{DIFF}rename" in a:
            old_tag = a[f"{DIFF}rename"]
            inner = kids(el, plain)
            return f"<del><{old_tag}>{inner}</{old_tag}></del><ins><{tag}>{inner}</{tag}></ins>"

        if tag == "img" and f"{DIFF}update-attr" in a:
            old_src = _split_update_attr(a[f"{DIFF}update-attr"], "src")
            old_img = f'<img src="{_attr_esc(old_src)}">' if old_src else ""
            return f"<del>{old_img}</del><ins>{plain(el)}</ins>"

        if f"{DIFF}insert" in a:
            cls = ' class="moved"' if f"{DIFF}moved" in a else ""
            return f"<ins{cls}>{plain(el)}</ins>"

        if f"{DIFF}delete" in a:
            return "" if f"{DIFF}drop" in a else f"<del>{plain(el)}</del>"

        if tag in VOID:
            return _open_tag(tag, el)
        return f"{_open_tag(tag, el)}{kids(el, build)}</{tag}>"

    return kids(root, build)
