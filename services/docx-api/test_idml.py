"""IDML generator: shared-fixture contract + structural self-check of the package."""

import json
import os
import re
import shutil
import subprocess
import zipfile
from io import BytesIO
from pathlib import Path

import pytest

from idml import build_idml
from idml_models import PrintDocument

FIXTURE = Path(__file__).parent / "test_fixtures" / "print-document.json"


@pytest.fixture(scope="module")
def doc() -> PrintDocument:
    return PrintDocument.model_validate(json.loads(FIXTURE.read_text(encoding="utf-8")))


@pytest.fixture(scope="module")
def package(doc) -> zipfile.ZipFile:
    return zipfile.ZipFile(BytesIO(build_idml(doc)))


def text(package, name):
    return package.read(name).decode("utf-8")


def test_fixture_matches_the_pydantic_mirror(doc):
    assert doc.schemaVersion == 1 and doc.sections


def test_ucf_container_starts_with_a_stored_mimetype(package):
    first = package.infolist()[0]
    assert first.filename == "mimetype" and first.compress_type == zipfile.ZIP_STORED
    assert package.read("mimetype") == b"application/vnd.adobe.indesign-idml-package"


def test_every_reference_resolves(package):
    xml = "".join(text(package, n) for n in package.namelist() if n.endswith(".xml"))
    selfs = set(re.findall(r'Self="([^"]+)"', xml))
    refs = set(re.findall(
        r'(?:ParentStory|NextTextFrame|PreviousTextFrame|AppliedMaster|PageStart|ItemLayer)="([^"]+)"',
        xml)) - {"n"}
    styles = set(re.findall(r'Applied(?:Paragraph|Character|Cell|Table|Object)Style="([^"]+)"', xml))
    colors = set(re.findall(r'(?:FillColor|LeftEdgeStrokeColor)="([^"]+)"', xml)) - {"Color/Black"}
    srcs = set(re.findall(r'src="([^"]+)"', xml))
    assert refs - selfs == set()
    assert styles - selfs == set()
    assert colors - selfs == set()
    assert srcs - set(package.namelist()) == set()


def test_draft_layer_is_listed_first_so_it_sits_behind_content(package):
    layers = re.findall(r'<Layer [^>]*Name="([^"]+)"', text(package, "designmap.xml"))
    assert layers == ["Draft mark", "Content"]


def test_facing_pages_reflow_and_no_fixed_page_count(package):
    prefs = text(package, "Resources/Preferences.xml")
    assert 'FacingPages="true"' in prefs and 'SmartTextReflow="true"' in prefs
    assert "PagesPerDocument" not in prefs


def test_grid_lists_anchor_and_unoccupied_cells_never_covered_ones(doc, package):
    table = next(b for s in doc.sections for b in s.blocks if b.type == "table")
    covered = {(r, k) for c in table.cells for r in range(c.row, c.row + c.rowSpan)
               for k in range(c.col, c.col + c.colSpan) if (r, k) != (c.row, c.col)}
    story = text(package, "Stories/Story_u_story1.xml")
    names = set(re.findall(r'<Cell [^>]*Name="(\d+):(\d+)"', story))
    listed = {(int(r), int(k)) for k, r in names}
    assert listed.isdisjoint(covered)
    assert len(listed) == table.rowCount * len(table.columns) - len(covered)
    assert 'AppliedCellStyle="CellStyle/GridEmpty"' in story


def test_named_swatch_per_track_and_predefined_toc_style(doc, package):
    graphic = text(package, "Resources/Graphic.xml")
    for s in doc.swatches:
        assert f'Name="Track: {s.name}"' in graphic
    styles = text(package, "Resources/Styles.xml")
    assert 'Name="Program TOC"' in styles and "ParagraphStyle/TocEntry2" in styles
    assert 'AppliedLanguage="$ID/Polish"' in styles


@pytest.mark.skipif(not os.getenv("IDML_SCHEMA_DIR") or not shutil.which("java"),
                    reason="set IDML_SCHEMA_DIR (InDesign RNC package schemas) and install Java")
def test_parts_validate_against_the_indesign_schema(package, tmp_path):
    schema = Path(os.environ["IDML_SCHEMA_DIR"])
    jing = os.environ.get("JING_JAR", "jing.jar")
    package.extractall(tmp_path)
    for part, rnc in (("designmap.xml", "designmap.rnc"),
                      ("Resources/Styles.xml", "Resources/Styles.rnc"),
                      ("Resources/Preferences.xml", "Resources/Preferences.rnc")):
        xml = (tmp_path / part).read_text(encoding="utf-8").replace('DOMVersion="20.0"', 'DOMVersion="21.5"')
        (tmp_path / part).write_text(xml, encoding="utf-8")
        result = subprocess.run(["java", "-jar", jing, "-c", str(schema / rnc), str(tmp_path / part)],
                                capture_output=True, text=True)
        assert result.returncode == 0, result.stdout
