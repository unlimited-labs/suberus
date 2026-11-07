"""InDesign-verified (GH #94): margins = text area so reflow pages clear the footer, DRAFT layer
first, anchor + unoccupied cells only, no PagesPerDocument (Smart Text Reflow fixes the count)."""

import io
import math
import re
import zipfile
from collections.abc import Callable, Mapping
from dataclasses import dataclass

from lxml import etree

from idml_models import Paragraph, PrintDocument, Section, Table

PKG = "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"
DOM = "20.0"
PT_PER_MM = 72 / 25.4
MARGIN_MM = 15
FOOTER_MM = 10
PAGE_MM = {"A4": (210, 297), "B5": (176, 250), "A5": (148, 210)}
LANGUAGE = {"en": "$ID/English: USA", "pl": "$ID/Polish"}
NO_CHAR = "CharacterStyle/$ID/[No character style]"
FONT = "Arial"

PARAGRAPH_STYLES: dict[str, tuple[float, str, dict[str, str]]] = {
    "Title": (22, "Bold", {}),
    "Subtitle": (13, "Regular", {"SpaceAfter": "12"}),
    "PartHeading": (17, "Bold", {"SpaceAfter": "8"}),
    "DayHeading": (13, "Bold", {"SpaceBefore": "4", "SpaceAfter": "6", "KeepWithNext": "1"}),
    "SessionHeading": (10.5, "Bold", {"SpaceBefore": "9", "KeepWithNext": "2"}),
    "SessionMeta": (8.5, "Regular", {"KeepWithNext": "1"}),
    "ChairLine": (8.5, "Italic", {"KeepWithNext": "1"}),
    "SlotTitle": (9, "Regular", {"SpaceBefore": "3", "KeepWithNext": "1"}),
    "SlotAuthors": (8, "Regular", {}),
    "BreakLine": (9, "Italic", {"SpaceBefore": "6"}),
    "EventTitle": (9, "Bold", {"SpaceBefore": "6", "KeepWithNext": "1"}),
    "EventText": (8.5, "Regular", {}),
    "GridHeader": (7.5, "Bold", {}),
    "GridTime": (7, "Regular", {}),
    "GridCell": (7, "Regular", {}),
    "GridBand": (7.5, "Bold", {"Justification": "CenterAlign"}),
    "Legend": (7.5, "Regular", {"SpaceAfter": "6"}),
    "IndexLetter": (11, "Bold", {"SpaceBefore": "6", "KeepWithNext": "1"}),
    "IndexEntry": (8, "Regular", {}),
    "TocEntry1": (10, "Regular", {}),
    "TocEntry2": (9, "Regular", {"LeftIndent": "12"}),
}
DRAFT_STYLE = {"Self": "ParagraphStyle/DraftMark", "Name": "DraftMark", "PointSize": 110,
               "FontStyle": "Bold", "FillColor": "Color/Black", "FillTint": 20,
               "Justification": "CenterAlign"}
# Without this marker InDesign refuses the package as an unsupported format.
AID_MARKER = 'style="50" type="document" readerVersion="6.0" featureSet="257" product="8.0(370)"'
CHARACTER_STYLES = {
    "Code": {"FontStyle": "Bold"},
    "Time": {"FontStyle": "Bold"},
    "Presenter": {"Underline": "true"},
    "Presenting": {"FontStyle": "Bold"},
    "Cancelled": {"StrikeThru": "true"},
    "Badge": {"FontStyle": "Bold", "Capitalization": "SmallCaps"},
    "Invited": {"FontStyle": "Bold", "Capitalization": "SmallCaps"},
}
CELL_STYLES = ["GridHeader", "GridTime", "GridCell", "GridBand"]


XML_ILLEGAL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def xml_safe(value: object) -> str:
    return XML_ILLEGAL.sub("", str(value))


def el(tag: str, attrs: Mapping[str, object] | None = None, *children,
       text: str | etree.CDATA | None = None):
    node = etree.Element(tag, {k: xml_safe(v) for k, v in (attrs or {}).items()})
    if text is not None:
        node.text = text if isinstance(text, etree.CDATA) else xml_safe(text)
    for child in children:
        node.append(child)
    return node


def pkg_root(tag: str, *children) -> etree._Element:
    return el(f"{{{PKG}}}{tag}", {"DOMVersion": DOM}, *children)


def to_bytes(root: etree._Element) -> bytes:
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def mm(v: float) -> float:
    return round(v * PT_PER_MM, 3)


def page_size(section: Section) -> tuple[float, float]:
    w, h = PAGE_MM[section.page.size]
    if section.page.orientation == "landscape":
        w, h = h, w
    return mm(w), mm(h)


def color_self(name: str) -> str:
    return f"Color/Track: {name}"


def styles_xml(language: str) -> bytes:
    lang = LANGUAGE[language]
    chars = el("RootCharacterStyleGroup", {"Self": "u_rcsg"})
    chars.append(el("CharacterStyle", {"Self": NO_CHAR, "Name": "$ID/[No character style]"}))
    for name, attrs in CHARACTER_STYLES.items():
        chars.append(el("CharacterStyle", {"Self": f"CharacterStyle/{name}", "Name": name, **attrs}))
    paras = el("RootParagraphStyleGroup", {"Self": "u_rpsg"})
    for builtin in ("$ID/[No paragraph style]", "$ID/NormalParagraphStyle"):
        paras.append(el("ParagraphStyle", {"Self": f"ParagraphStyle/{builtin}", "Name": builtin}))
    for name, (size, font_style, extra) in PARAGRAPH_STYLES.items():
        attrs = {"Self": f"ParagraphStyle/{name}", "Name": name, "PointSize": size,
                 "FontStyle": font_style, "AppliedLanguage": lang, **extra}
        props = el("Properties", None,
                   el("BasedOn", {"type": "string"}, text="$ID/[No paragraph style]"),
                   el("AppliedFont", {"type": "string"}, text=FONT))
        paras.append(el("ParagraphStyle", attrs, props))
    paras.append(el("ParagraphStyle", {**DRAFT_STYLE, "AppliedLanguage": lang},
                    el("Properties", None, el("AppliedFont", {"type": "string"}, text=FONT))))
    toc = el("TOCStyle", {"Self": "TOCStyle/Program TOC", "Name": "Program TOC", "Title": "",
                          "TitleStyle": "ParagraphStyle/TocEntry1"})
    for level, (source, fmt) in enumerate([("PartHeading", "TocEntry1"),
                                          ("DayHeading", "TocEntry2")], start=1):
        props = el("Properties", None, el("FormatStyle", {"type": "object"},
                                          text=f"ParagraphStyle/{fmt}"))
        toc.append(el("TOCStyleEntry", {"Self": f"TOCStyle/Program TOC/{source}",
                                        "Name": source, "Level": level}, props))
    cells = el("RootCellStyleGroup", {"Self": "u_rcellsg"},
               el("CellStyle", {"Self": "CellStyle/$ID/[None]", "Name": "$ID/[None]"}))
    for name in CELL_STYLES:
        cells.append(el("CellStyle", {"Self": f"CellStyle/{name}", "Name": name,
                                      "AppliedParagraphStyle": f"ParagraphStyle/{name}"}))
    cells.append(el("CellStyle", {"Self": "CellStyle/GridEmpty", "Name": "GridEmpty",
                                  "AppliedParagraphStyle": "ParagraphStyle/GridCell",
                                  "FillColor": "Color/Black", "FillTint": "10"}))
    tables = el("RootTableStyleGroup", {"Self": "u_rtsg"},
                el("TableStyle", {"Self": "TableStyle/$ID/[Basic Table]", "Name": "$ID/[Basic Table]"}),
                el("TableStyle", {"Self": "TableStyle/GlanceGrid", "Name": "GlanceGrid"}))
    objects = el("RootObjectStyleGroup", {"Self": "u_rosg"},
                 el("ObjectStyle", {"Self": "ObjectStyle/$ID/[None]", "Name": "$ID/[None]"}),
                 el("ObjectStyle", {"Self": "ObjectStyle/Logo", "Name": "Logo"}))
    return to_bytes(pkg_root("Styles", chars, paras, toc, cells, tables, objects))


def graphic_xml(doc: PrintDocument) -> bytes:
    colors = []
    for s in doc.swatches:
        rgb = " ".join(str(int(s.color[i:i + 2], 16)) for i in (1, 3, 5))
        colors.append(el("Color", {"Self": color_self(s.name), "Model": "Process", "Space": "RGB",
                                   "ColorValue": rgb, "Name": f"Track: {s.name}"}))
    return to_bytes(pkg_root("Graphic", *colors))


def margin() -> etree._Element:
    return el("MarginPreference", {"ColumnCount": 1, "ColumnGutter": mm(6),
                                   "Top": mm(MARGIN_MM), "Bottom": mm(MARGIN_MM + FOOTER_MM),
                                   "Left": mm(MARGIN_MM), "Right": mm(MARGIN_MM)})


def preferences_xml(doc: PrintDocument) -> bytes:
    w, h = page_size(doc.sections[0])
    return to_bytes(pkg_root(
        "Preferences",
        el("DocumentPreference", {"PageHeight": h, "PageWidth": w, "FacingPages": "true"}),
        margin(),
        el("TextPreference", {"SmartTextReflow": "true", "AddPages": "EndOfStory",
                              "LimitToMasterTextFrames": "false",
                              "PreserveFacingPageSpreads": "false", "DeleteEmptyPages": "true"}),
    ))


def paragraph_range(p: Paragraph, swatch: Callable[[str], str], last: bool = False):
    psr = el("ParagraphStyleRange", {"AppliedParagraphStyle": f"ParagraphStyle/{p.style}"})
    for r in p.runs:
        attrs: dict[str, object] = {
            "AppliedCharacterStyle": f"CharacterStyle/{r.charStyle}" if r.charStyle else NO_CHAR}
        if r.color:
            attrs["FillColor"] = swatch(r.color)
        psr.append(el("CharacterStyleRange", attrs, el("Content", text=r.text)))
    if len(psr) == 0:
        psr.append(el("CharacterStyleRange", {"AppliedCharacterStyle": NO_CHAR}))
    if not last:
        psr[-1].append(el("Br"))
    return psr


def table_ranges(t: Table, sid: str, swatch: Callable[[str], str], width_pt: float):
    total = sum(c.widthWeight for c in t.columns)
    tab = el("Table", {"Self": sid, "HeaderRowCount": t.headerRows,
                       "BodyRowCount": t.rowCount - t.headerRows, "ColumnCount": len(t.columns),
                       "AppliedTableStyle": "TableStyle/GlanceGrid",
                       "TableDirection": "LeftToRightDirection"})
    for r in range(t.rowCount):
        tab.append(el("Row", {"Self": f"{sid}Row{r}", "Name": r}))
    for c, col in enumerate(t.columns):
        tab.append(el("Column", {"Self": f"{sid}Column{c}", "Name": c,
                                 "SingleColumnWidth": round(col.widthWeight / total * width_pt, 3)}))
    anchors = {(c.row, c.col): c for c in t.cells}
    covered = {(r, k) for c in t.cells for r in range(c.row, c.row + c.rowSpan)
               for k in range(c.col, c.col + c.colSpan) if (r, k) != (c.row, c.col)}
    for r in range(t.rowCount):
        for k in range(len(t.columns)):
            if (r, k) in covered:
                continue
            tab.append(table_cell(sid, r, k, anchors.get((r, k)), swatch))
    return el("ParagraphStyleRange", {"AppliedParagraphStyle": "ParagraphStyle/GridCell"},
              el("CharacterStyleRange", {"AppliedCharacterStyle": NO_CHAR}, tab, el("Br")))


def table_cell(sid, r, k, cell, swatch):
    name = {"Self": f"{sid}i{k}i{r}", "Name": f"{k}:{r}"}
    if cell is None:
        return el("Cell", {**name, "AppliedCellStyle": "CellStyle/GridEmpty"})
    style = cell.blocks[0].style if cell.blocks and cell.blocks[0].style in CELL_STYLES else "GridCell"
    attrs = {**name, "RowSpan": cell.rowSpan, "ColumnSpan": cell.colSpan,
             "AppliedCellStyle": f"CellStyle/{style}"}
    if cell.accent:
        attrs |= {"LeftEdgeStrokeWeight": 3, "LeftEdgeStrokeColor": swatch(cell.accent)}
    node = el("Cell", attrs)
    for i, p in enumerate(cell.blocks):
        node.append(paragraph_range(p, swatch, last=i == len(cell.blocks) - 1))
    return node


def story_xml(sid: str, section: Section, swatch) -> bytes:
    story = el("Story", {"Self": sid, "AppliedTOCStyle": "n", "TrackChanges": "false",
                         "StoryTitle": "$ID/", "AppliedNamedGrid": "n"})
    width = page_size(section)[0] - 2 * mm(MARGIN_MM)
    if section.columns == 2:
        width = (width - mm(6)) / 2
    for b, block in enumerate(section.blocks):
        if block.type == "paragraph":
            story.append(paragraph_range(block, swatch))
        elif block.type == "table":
            story.append(table_ranges(block, f"{sid}t{b}", swatch, width))
        elif block.type == "toc":
            hint = f"{block.title} (Layout › Table of Contents › Program TOC)"
            story.append(paragraph_range(Paragraph(type="paragraph", style="TocEntry1",
                                                   runs=[{"text": hint}]), swatch))
    return to_bytes(pkg_root("Story", story))


def small_story(sid: str, style: str, *contents) -> bytes:
    csr = el("CharacterStyleRange", {"AppliedCharacterStyle": NO_CHAR}, *contents)
    psr = el("ParagraphStyleRange", {"AppliedParagraphStyle": f"ParagraphStyle/{style}"}, csr)
    return to_bytes(pkg_root("Story", el("Story", {"Self": sid, "AppliedTOCStyle": "n",
                                                   "StoryTitle": "$ID/"}, psr)))


@dataclass
class PlannedPage:
    section: int | None
    width: float
    height: float
    master: str


def estimate_pages(section: Section) -> int:
    w, h = page_size(section)
    content = (h - mm(2 * MARGIN_MM + FOOTER_MM)) * section.columns
    chars_per_line = max(30, (w - mm(2 * MARGIN_MM)) / section.columns / 4.2)
    used = 0.0
    for b in section.blocks:
        if b.type == "paragraph":
            text = sum(len(r.text) for r in b.runs)
            used += 14 * (1 + text // chars_per_line)
        elif b.type == "table":
            used += 20 * b.rowCount
        else:
            used += 120
    return max(1, math.ceil(used / content))


def master_key(section: Section) -> str:
    return f"{section.page.size}-{section.page.orientation}"


def plan_pages(doc: PrintDocument) -> list[PlannedPage]:
    pages: list[PlannedPage] = []
    for si, s in enumerate(doc.sections):
        w, h = page_size(s)
        if s.start == "evenPage" and (len(pages) + 1) % 2 == 1:
            pages.append(PlannedPage(None, w, h, master_key(s)))
        pages.extend(PlannedPage(si, w, h, master_key(s)) for _ in range(estimate_pages(s)))
    return pages


def path_geometry(x0: float, y0: float, x1: float, y1: float):
    points = el("PathPointArray")
    for x, y in ((x0, y0), (x0, y1), (x1, y1), (x1, y0)):
        xy = f"{x} {y}"
        points.append(el("PathPointType", {"Anchor": xy, "LeftDirection": xy, "RightDirection": xy}))
    return el("Properties", None, el("PathGeometry", None,
                                     el("GeometryPathType", {"PathOpen": "false"}, points)))


def text_frame(fid, story, rect, layer="ulayer_content", prev="n", nxt="n", columns=1):
    return el("TextFrame", {"Self": fid, "ParentStory": story, "PreviousTextFrame": prev,
                            "NextTextFrame": nxt, "ContentType": "TextType", "ItemLayer": layer,
                            "ItemTransform": "1 0 0 1 0 0"},
              path_geometry(*rect),
              el("TextFramePreference", {"TextColumnCount": columns, "TextColumnGutter": mm(6)}))


def text_rect(x: float, w: float, h: float, top_offset: float = 0.0):
    return (x + mm(MARGIN_MM), -h / 2 + mm(MARGIN_MM) + top_offset,
            x + w - mm(MARGIN_MM), h / 2 - mm(MARGIN_MM + FOOTER_MM))


def page_element(pid: str, name: str, page: PlannedPage, x: float, master: str | None):
    attrs = {"Self": pid, "Name": name, "GeometricBounds": f"0 0 {page.height} {page.width}",
             "ItemTransform": f"1 0 0 1 {x} {-page.height / 2}",
             "MasterPageTransform": "1 0 0 1 0 0"}
    if master:
        attrs["AppliedMaster"] = master
    return el("Page", attrs, margin())


def spreads_of(pages: list[PlannedPage]) -> list[list[int]]:
    groups = [[0]] if pages else []
    groups += [list(range(i, min(i + 2, len(pages)))) for i in range(1, len(pages), 2)]
    return groups


def logo_frame(doc: PrintDocument, x: float, w: float, h: float):
    image = next((b for b in doc.sections[0].blocks if b.type == "image"), None)
    if image is None:
        return None, 0.0
    width = (w - mm(2 * MARGIN_MM)) * image.widthFraction
    height = width / image.aspectRatio
    x0, y0 = x + mm(MARGIN_MM), -h / 2 + mm(MARGIN_MM)
    kind = "PNG" if image.mime == "image/png" else "JPEG"
    img = el("Image", {"Self": "ulogo_img", "ItemTransform": f"1 0 0 1 {x0} {y0}",
                       "ImageTypeName": f"$ID/{kind}"},
             el("Properties", None,
                el("GraphicBounds", {"Left": 0, "Top": 0, "Right": round(width, 3),
                                     "Bottom": round(height, 3)}),
                el("Contents", text=etree.CDATA(image.dataBase64))),
             el("Link", {"Self": "ulogo_link", "LinkResourceURI": "file:logo",
                         "StoredState": "Embedded"}))
    rect = el("Rectangle", {"Self": "ulogo", "ContentType": "GraphicType", "ItemLayer": "ulayer_content",
                            "AppliedObjectStyle": "ObjectStyle/Logo", "ItemTransform": "1 0 0 1 0 0"},
              path_geometry(x0, y0, x0 + width, y0 + height), img)
    return rect, height + mm(4)


def build_spreads(doc: PrintDocument, pages: list[PlannedPage], masters: dict[str, str]):
    def link(j: int, section: int) -> str:
        # plan_pages lays each section's pages out consecutively
        return f"utf{j}" if 0 <= j < len(pages) and pages[j].section == section else "n"

    files = {}
    for g, group in enumerate(spreads_of(pages)):
        spread = el("Spread", {"Self": f"usp{g}", "PageCount": len(group),
                               "BindingLocation": 0 if g == 0 else 1, "ShowMasterItems": "true"})
        for slot, i in enumerate(group):
            p = pages[i]
            x = 0.0 if g == 0 or slot == 1 else -p.width
            spread.append(page_element(f"upg{i}", str(i + 1), p, x, masters[p.master]))
            if p.section is None:
                continue
            prev, nxt = link(i - 1, p.section), link(i + 1, p.section)
            offset = 0.0
            if p.section == 0 and prev == "n":
                logo, offset = logo_frame(doc, x, p.width, p.height)
                if logo is not None:
                    spread.append(logo)
            spread.append(text_frame(
                f"utf{i}", f"u_story{p.section}", text_rect(x, p.width, p.height, offset),
                prev=prev, nxt=nxt,
                columns=doc.sections[p.section].columns))
        files[f"Spreads/Spread_usp{g}.xml"] = to_bytes(pkg_root("Spread", spread))
    return files


def build_masters(doc: PrintDocument, pages: list[PlannedPage]):
    masters: dict[str, str] = {}
    spreads: dict[str, bytes] = {}
    stories: dict[str, bytes] = {}
    footer = doc.footer
    for n, key in enumerate(dict.fromkeys(p.master for p in pages)):
        sample = next(p for p in pages if p.master == key)
        mid = f"um{n}"
        prefix = chr(ord("A") + n)
        masters[key] = mid
        spread = el("MasterSpread", {"Self": mid, "Name": f"{prefix}-{key}", "NamePrefix": prefix,
                                     "BaseName": key, "ShowMasterItems": "true", "PageCount": 2})
        for slot, x in enumerate((-sample.width, 0.0)):
            spread.append(page_element(f"{mid}p{slot}", prefix, sample, x, None))
            fid = f"{mid}f{slot}"
            y1 = sample.height / 2 - mm(MARGIN_MM)
            rect = (x + mm(MARGIN_MM), y1 - mm(6), x + sample.width - mm(MARGIN_MM), y1)
            spread.append(text_frame(fid, f"u_{fid}", rect))
            stories[f"u_{fid}"] = small_story(
                f"u_{fid}", "Legend", el("Content", text=f"{footer} · "),
                el("Content", None, etree.ProcessingInstruction("ACE", "18")))
            if doc.draft:
                did = f"{mid}d{slot}"
                drect = (x + mm(MARGIN_MM), -mm(30), x + sample.width - mm(MARGIN_MM), mm(30))
                spread.append(text_frame(did, f"u_{did}", drect, layer="ulayer_draft"))
                stories[f"u_{did}"] = small_story(
                    f"u_{did}", "DraftMark", el("Content", text="DRAFT"))
        spreads[f"MasterSpreads/MasterSpread_{mid}.xml"] = to_bytes(pkg_root("MasterSpread", spread))
    return masters, spreads, stories


def story_path(sid: str) -> str:
    return f"Stories/Story_{sid}.xml"


def designmap_xml(pages, spread_files, master_files, story_ids) -> bytes:
    root = etree.Element("Document", nsmap={"idPkg": PKG})
    for k, v in {"DOMVersion": DOM, "Self": "d", "StoryList": " ".join(story_ids),
                 "ZeroPoint": "0 0", "ActiveLayer": "ulayer_content"}.items():
        root.set(k, v)
    for tag, src in (("Graphic", "Resources/Graphic.xml"), ("Styles", "Resources/Styles.xml"),
                     ("Preferences", "Resources/Preferences.xml")):
        root.append(el(f"{{{PKG}}}{tag}", {"src": src}))
    for self_id, name in (("ulayer_draft", "Draft mark"), ("ulayer_content", "Content")):
        root.append(el("Layer", {"Self": self_id, "Name": name, "Visible": "true",
                                 "Locked": "false", "Printable": "true", "ShowGuides": "true"}))
    for f in master_files:
        root.append(el(f"{{{PKG}}}MasterSpread", {"src": f}))
    for f in spread_files:
        root.append(el(f"{{{PKG}}}Spread", {"src": f}))
    root.append(el("Section", {"Self": "usec", "Length": len(pages), "Name": "",
                               "ContinueNumbering": "true", "IncludeSectionPrefix": "false",
                               "PageStart": "upg0", "SectionPrefix": "", "Marker": ""}))
    for sid in story_ids:
        root.append(el(f"{{{PKG}}}Story", {"src": story_path(sid)}))
    root.addprevious(etree.ProcessingInstruction("aid", AID_MARKER))
    return etree.tostring(root.getroottree(), xml_declaration=True, encoding="UTF-8",
                          standalone=True)


CONTAINER = (b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
             b'<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
             b'<rootfiles><rootfile full-path="designmap.xml" media-type="text/xml"/></rootfiles>'
             b"</container>")


def build_idml(doc: PrintDocument) -> bytes:
    colors = {s.color.lower(): color_self(s.name) for s in doc.swatches}

    def swatch(hex_color: str) -> str:
        return colors.get(hex_color.lower(), "Color/Black")

    pages = plan_pages(doc)
    masters, master_spreads, master_stories = build_masters(doc, pages)
    spread_files = build_spreads(doc, pages, masters)
    stories = {f"u_story{i}": story_xml(f"u_story{i}", s, swatch)
               for i, s in enumerate(doc.sections)}
    stories |= master_stories
    story_ids = list(stories)
    parts = {
        "designmap.xml": designmap_xml(pages, list(spread_files), list(master_spreads), story_ids),
        "META-INF/container.xml": CONTAINER,
        "Resources/Graphic.xml": graphic_xml(doc),
        "Resources/Styles.xml": styles_xml(doc.language),
        "Resources/Preferences.xml": preferences_xml(doc),
        **master_spreads,
        **spread_files,
        **{story_path(sid): data for sid, data in stories.items()},
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), "application/vnd.adobe.indesign-idml-package",
                   compress_type=zipfile.ZIP_STORED)
        for path, data in parts.items():
            z.writestr(path, data, compress_type=zipfile.ZIP_DEFLATED)
    return buf.getvalue()

