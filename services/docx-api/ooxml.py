"""Shared WordprocessingML (OOXML) helpers for stylecss and mathtype."""

from __future__ import annotations

from collections.abc import Iterator
from xml.etree import ElementTree as ET

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def q(tag: str) -> str:
    return f"{{{W}}}{tag}"


def local_name(tag: object) -> str:
    if isinstance(tag, str) and tag.startswith("{"):
        return tag.split("}", 1)[1]
    return tag if isinstance(tag, str) else ""


def norm_text(text: str | None) -> str:
    return " ".join((text or "").split())


def paragraph_text(p: ET.Element) -> str:
    return norm_text("".join(t.text or "" for t in p.iter(q("t"))))


def iter_paragraphs(
    doc_root: ET.Element, name_of: dict[str, str]
) -> Iterator[tuple[ET.Element, str | None, str]]:
    """Yield (paragraph, style-name | None, normalized-text) for every `w:p`."""
    for p in doc_root.iter(q("p")):
        ppr = p.find(q("pPr"))
        sid = None
        if ppr is not None:
            pstyle = ppr.find(q("pStyle"))
            sid = pstyle.get(q("val")) if pstyle is not None else None
        name = name_of.get(sid) if sid else None
        yield p, name, paragraph_text(p)


class AmbiguityMap:
    """First value for a key wins; a later conflicting value drops and bans it,
    so we never guess when the same text carries different formatting."""

    def __init__(self) -> None:
        self._d: dict = {}
        self._bad: set = set()

    def add(self, key, value) -> None:
        if key in self._bad:
            return
        if key in self._d and self._d[key] != value:
            del self._d[key]
            self._bad.add(key)
            return
        self._d[key] = value

    def as_dict(self) -> dict:
        return self._d
