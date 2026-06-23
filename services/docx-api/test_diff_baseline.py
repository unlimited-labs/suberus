"""End-to-end normalize → diff golden: the kitchen-sink v1/v2 pair exercises a
word change, a moved paragraph, an equation change and a table-cell change, so
the redline pins <del>/<ins>/moved/matheq handling against stack changes.

Run inside the docx-api test image (see run-tests.sh). Refresh with
UPDATE_BASELINE=1.
"""

import shutil
import tempfile
from pathlib import Path

import pytest

import diffhtml
import main
from test_baseline import (
    DOCS,
    GOLDEN,
    PANDOC,
    UPDATE,
    _check_json,
    _check_text,
)

pytestmark = pytest.mark.skipif(
    PANDOC is None, reason="pandoc not on PATH (run in the docx-api test image)"
)


def _normalize(name: str) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        local = work / name
        shutil.copyfile(DOCS / name, local)
        html, _figures, _warnings, _css = main._normalize(local, work)
        return html


def test_kitchen_sink_redline():
    html_a = _normalize("kitchen-sink-v1.docx")
    html_b = _normalize("kitchen-sink-v2.docx")
    redline = diffhtml.diff_html(html_a, html_b)

    assert "<del" in redline and "<ins" in redline, "word change should produce del/ins"
    assert 'class="moved"' in redline, "the reordered paragraph should be badged moved"
    assert 'class="matheq"' in redline, "the changed equation should be an atomic matheq"

    _check_text(GOLDEN / "kitchen-sink.redline.html", redline)
    # Pin the schema version so a normalizer-schema bump surfaces as a diff.
    _check_json(GOLDEN / "kitchen-sink.meta.json", {"schemaVersion": main.SCHEMA_VERSION})
