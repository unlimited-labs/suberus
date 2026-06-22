"""Golden baseline for the full DOCX normalize pipeline (Pandoc + LibreOffice +
stylecss + math). Run inside the docx-api test image (see run-tests.sh).

For each representative fixture we run `main._normalize` and pin:
  - document.html   (figure SHAs canonicalized to ordinals so the golden is
                     stable across LibreOffice builds)
  - styles.css
  - a figures manifest (count + per-figure width/height/mode/bytes)
plus a few readable intent assertions so a blind golden refresh can't silently
hide a regression.

Refresh goldens after an intentional change with UPDATE_BASELINE=1, then review
the git diff — that diff IS the record of what the stack change altered.
"""

import io
import json
import os
import re
import shutil
import tempfile
from pathlib import Path

import pytest
from PIL import Image

import main

HERE = Path(__file__).parent
DOCS = HERE / "test_fixtures" / "docs"
REAL = HERE / "test_fixtures" / "real"
GOLDEN = HERE / "test_fixtures" / "golden"

PANDOC = shutil.which("pandoc")
SOFFICE = shutil.which("soffice")
UPDATE = os.environ.get("UPDATE_BASELINE") == "1"

pytestmark = pytest.mark.skipif(
    PANDOC is None, reason="pandoc not on PATH (run in the docx-api test image)"
)

_FIG_RE = re.compile(r"figures/([0-9a-f]{64})\.png")


# Generated fixtures: (filename, expected figure count, intent substrings).
GENERATED = [
    ("text-formatting.docx", 0, ["ta-center", "ta-right", "ta-justify", "font-size"]),
    ("lists.docx", 0, ["ol-paren", "olp-"]),
    ("tables.docx", 0, ["<table", "<th", "ta-center"]),
    ("images.docx", 2, ["<img"]),
    ("equations-omml.docx", 0, ['class="math', "\\frac"]),
    ("mathtype.docx", 0, ['class="math', "\\sum", "\\int", "\\frac"]),
    ("headings.docx", 0, ["<h1", "<h2", "<h3", "data-custom-style"]),
    ("kitchen-sink-v1.docx", 0, ['class="math', "<table", "<th"]),
    ("kitchen-sink-v2.docx", 0, ['class="math', "<table", "<th"]),
]


def _normalize_fixture(docx_path: Path):
    """Copy the fixture into a scratch dir (─ `_normalize` rewrites the file when
    it converts MathType OLEs) and normalize it."""
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        local = work / docx_path.name
        shutil.copyfile(docx_path, local)
        return main._normalize(local, work)


def _canon(html: str):
    """Rewrite figures/<sha>.png → figures/<ordinal>.png; return (html, sha_order)."""
    order: dict[str, int] = {}

    def repl(m: re.Match) -> str:
        sha = m.group(1)
        order.setdefault(sha, len(order))
        return f"figures/{order[sha]}.png"

    return _FIG_RE.sub(repl, html), list(order)


def _figure_manifest(figures: dict[str, bytes], sha_order: list[str]):
    items = []
    for i, sha in enumerate(sha_order):
        raw = figures[sha]
        im = Image.open(io.BytesIO(raw))
        items.append(
            {"index": i, "width": im.width, "height": im.height, "mode": im.mode, "bytes": len(raw)}
        )
    return items


def _check_text(path: Path, actual: str) -> None:
    if UPDATE:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(actual, encoding="utf-8")
        return
    assert path.exists(), f"missing golden {path.name} — run with UPDATE_BASELINE=1"
    assert actual == path.read_text(encoding="utf-8"), (
        f"golden mismatch for {path.name}; review and refresh with UPDATE_BASELINE=1"
    )


def _check_json(path: Path, actual) -> None:
    serialized = json.dumps(actual, indent=2, ensure_ascii=False, sort_keys=True)
    _check_text(path, serialized + "\n")


def _run_baseline(docx_path: Path, stem: str, expect_figures, contains) -> None:
    html, figures, _warnings, css = _normalize_fixture(docx_path)
    canon_html, sha_order = _canon(html)

    # Every referenced figure must be present and a valid PNG.
    assert len(figures) == len(sha_order), "html references a figure not in the bundle"
    for sha in sha_order:
        Image.open(io.BytesIO(figures[sha])).verify()
    if expect_figures is not None:
        assert len(figures) == expect_figures, (
            f"{stem}: expected {expect_figures} figures, got {len(figures)}"
        )

    for needle in contains:
        assert needle in canon_html or needle in css, f"{stem}: missing intent marker {needle!r}"

    _check_text(GOLDEN / f"{stem}.html", canon_html)
    _check_text(GOLDEN / f"{stem}.css", css)
    _check_json(GOLDEN / f"{stem}.figures.json", _figure_manifest(figures, sha_order))


@pytest.mark.parametrize("name,figures,contains", GENERATED, ids=[f[0] for f in GENERATED])
def test_generated_fixture_baseline(name, figures, contains):
    docx = DOCS / name
    assert docx.is_file(), f"missing fixture {name} — run generate_fixtures.py"
    _run_baseline(docx, Path(name).stem, figures, contains)


def _real_fixtures():
    if not REAL.is_dir():
        return []
    return sorted(p for p in REAL.glob("*.docx") if not p.name.startswith("~"))


@pytest.mark.skipif(SOFFICE is None, reason="soffice (LibreOffice) not on PATH")
@pytest.mark.parametrize(
    "docx", _real_fixtures(), ids=[p.name for p in _real_fixtures()] or ["none"]
)
def test_real_fixture_baseline(docx):
    if not _real_fixtures():
        pytest.skip("no real .docx fixtures provided yet (see test_fixtures/real/README)")
    # Content is unknown ahead of time — pin whatever the pipeline produces so a
    # later stack change shows up as a golden diff.
    _run_baseline(docx, docx.stem, expect_figures=None, contains=[])
