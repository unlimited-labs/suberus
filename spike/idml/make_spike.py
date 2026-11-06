"""Throwaway IDML spike for wayfinder ticket 103. Builds 3 .idml files + linked logo."""

import base64
import struct
import sys
import zipfile
import zlib
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "out")
PKG = 'xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"'
HDR = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

W, H, M = 595.2756, 841.8898, 42.52
TOP, BOT = -H / 2, H / 2
FRAME = (M, TOP + M + 50, W - M, BOT - M - 24)  # x0 y0 x1 y1 in spread coords
MARGINS = f'<MarginPreference ColumnCount="1" ColumnGutter="12" Top="{M + 50}" Bottom="{M + 24}" Left="{M}" Right="{M}"/>'


def png(w: int, h: int, colour: tuple[int, int, int]) -> bytes:
    rows = b""
    for y in range(h):
        row = b"\x00"
        for x in range(w):
            band = (x // 40 + y // 20) % 2
            row += bytes(colour) if band else b"\xff\xff\xff"
        rows += row

    def chunk(t: bytes, d: bytes) -> bytes:
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(rows))
        + chunk(b"IEND", b"")
    )


def geom(x0: float, y0: float, x1: float, y1: float) -> str:
    pts = [(x0, y0), (x0, y1), (x1, y1), (x1, y0)]
    p = "".join(
        f'<PathPointType Anchor="{x} {y}" LeftDirection="{x} {y}" RightDirection="{x} {y}"/>'
        for x, y in pts
    )
    return (
        '<Properties><PathGeometry><GeometryPathType PathOpen="false"><PathPointArray>'
        f"{p}</PathPointArray></GeometryPathType></PathGeometry></Properties>"
    )


def page(self_id: str, name: str, master: str | None) -> str:
    applied = f' AppliedMaster="{master}"' if master else ""
    return (
        f'<Page Self="{self_id}" Name="{name}"{applied} GeometricBounds="0 0 {H} {W}" '
        f'ItemTransform="1 0 0 1 0 {TOP}" MasterPageTransform="1 0 0 1 0 0">{MARGINS}</Page>'
    )


def text_frame(self_id, story, rect, layer="ulayer_content", prev="n", nxt="n", extra=""):
    return (
        f'<TextFrame Self="{self_id}" ParentStory="{story}" PreviousTextFrame="{prev}" '
        f'NextTextFrame="{nxt}" ContentType="TextType" ItemLayer="{layer}" '
        f'ItemTransform="1 0 0 1 0 0"{extra}>{geom(*rect)}'
        '<TextFramePreference TextColumnCount="1"/></TextFrame>'
    )


def image_frame(self_id, rect, png_bytes, linked_uri=None):
    x0, y0, x1, _ = rect
    scale = (x1 - x0) / 240
    if linked_uri:
        contents, state, uri = "", "Normal", linked_uri
    else:
        b64 = base64.b64encode(png_bytes).decode()
        contents, state, uri = f"<Contents><![CDATA[{b64}]]></Contents>", "Embedded", "file:logo-embedded.png"
    return (
        f'<Rectangle Self="{self_id}" ContentType="GraphicType" ItemLayer="ulayer_content" '
        f'ItemTransform="1 0 0 1 0 0">{geom(*rect)}'
        f'<Image Self="{self_id}img" ItemTransform="{scale} 0 0 {scale} {x0} {y0}" '
        'ImageTypeName="$ID/Portable Network Graphics (PNG)" ActualPpi="72 72" EffectivePpi="72 72">'
        '<Properties><Profile type="string">$ID/None</Profile>'
        f'<GraphicBounds Left="0" Top="0" Right="240" Bottom="80"/>{contents}</Properties>'
        f'<Link Self="{self_id}lnk" LinkResourceURI={quoteattr(uri)} StoredState="{state}" '
        'LinkResourceFormat="$ID/Portable Network Graphics (PNG)"/>'
        "</Image></Rectangle>"
    )


def run(text: str, cstyle: str = "$ID/[No character style]") -> str:
    return f'<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/{cstyle}"><Content>{escape(text)}</Content></CharacterStyleRange>'


def para(style: str, *runs: str) -> str:
    return (
        f'<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/{style}">'
        + "".join(runs)
        + '<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]"><Br/></CharacterStyleRange>'
        "</ParagraphStyleRange>"
    )


def cell(tab, col, row, text, style="GridCell", rs=1, cs=1, accent=False):
    acc = ' LeftEdgeStrokeWeight="4" LeftEdgeStrokeColor="Color/Track1"' if accent else ""
    body = (
        f'<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/{style}">{run(text)}</ParagraphStyleRange>'
        if text
        else ""
    )
    return (
        f'<Cell Self="{tab}i{col}i{row}" Name="{col}:{row}" RowSpan="{rs}" ColumnSpan="{cs}" '
        f'AppliedCellStyle="CellStyle/$ID/[None]" AppliedCellStylePriority="0"{acc}>{body}</Cell>'
    )


def grid(tab: str, list_covered: bool) -> str:
    rooms = ["Room A", "Room B", "Sala Łódź", "Room D"]
    times = [f"{9 + i // 4:02d}:{(i % 4) * 15:02d}" for i in range(36)]
    ncols, nrows = 1 + len(rooms), 1 + len(times)
    anchors: dict[tuple[int, int], str] = {}
    covered: set[tuple[int, int]] = set()

    def merged(col, row, rs, cs, text, **kw):
        anchors[(col, row)] = cell(tab, col, row, text, rs=rs, cs=cs, **kw)
        for c in range(col, col + cs):
            for r in range(row, row + rs):
                if (c, r) != (col, row):
                    covered.add((c, r))

    anchors[(0, 0)] = cell(tab, 0, 0, "Time", "GridHeader")
    for i, room in enumerate(rooms, 1):
        anchors[(i, 0)] = cell(tab, i, 0, room, "GridHeader")
    merged(1, 1, 4, 4, "1A1 — Opening keynote (ColumnSpan=4, RowSpan=4)", style="GridBand")
    merged(1, 5, 1, 4, "Coffee break (full-width band)", style="GridBand")
    for r in range(6, nrows, 4):
        merged(1, r, 4, 1, f"1A{r} — Session spanning 4 rows", accent=True)
        merged(2, r, 2, 1, f"1B{r} — 2 rows")
        merged(3, r, 3, 1, f"1C{r} — Żółć gęślą jaźń (3 rows)", accent=True)
    for r, t in enumerate(times, 1):
        anchors[(0, r)] = cell(tab, 0, r, t, "GridTime")
    cells = []
    for r in range(nrows):
        for c in range(ncols):
            if (c, r) in anchors:
                cells.append(anchors[(c, r)])
            elif (c, r) in covered:
                if list_covered:
                    cells.append(cell(tab, c, r, ""))
            else:
                cells.append(cell(tab, c, r, ""))
    rows = "".join(f'<Row Self="{tab}Row{r}" Name="{r}" SingleRowHeight="20" MinimumHeight="20"/>' for r in range(nrows))
    room_w = (FRAME[2] - FRAME[0] - 50) / len(rooms)
    cols = "".join(
        f'<Column Self="{tab}Column{c}" Name="{c}" SingleColumnWidth="{50 if c == 0 else room_w}"/>' for c in range(ncols)
    )
    table = (
        f'<Table Self="{tab}" HeaderRowCount="1" FooterRowCount="0" BodyRowCount="{nrows - 1}" '
        f'ColumnCount="{ncols}" AppliedTableStyle="TableStyle/$ID/[Basic Table]" '
        f'TableDirection="LeftToRightDirection">{rows}{cols}{"".join(cells)}</Table>'
    )
    return (
        '<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/GridCell">'
        f'<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">{table}<Br/></CharacterStyleRange>'
        "</ParagraphStyleRange>"
    )


def main_story() -> str:
    parts = [
        para("Title", run("Spike Conference 2026 — Zjazd Łódź")),
        para("Subtitle", run("14–16 September 2026")),
        para("TocEntry1", run("[TOC placeholder — regenerate via Layout › Update Table of Contents]")),
        para("DayHeading", run("Day 1 grid — covered cells OMITTED (only anchors listed)")),
        grid("utabA", list_covered=False),
        para("DayHeading", run("Day 2 grid — covered cells LISTED explicitly as empty cells")),
        grid("utabB", list_covered=True),
        para("PartHeading", run("Detailed program")),
    ]
    for d in (1, 2):
        parts.append(para("DayHeading", run(f"Day {d} — Monday 14 September")))
        for s in range(1, 9):
            parts.append(para("SessionHeading", run(f"{d}A{s} ", "Code"), run(f"Session {s}: Materials and methods")))
            parts.append(para("SessionMeta", run("09:00–10:30", "Time"), run(" · Room A · Track: Polymers")))
            parts.append(para("ChairLine", run("Chair: J. Kowalski")))
            for t in range(1, 6):
                parts.append(para("SlotTitle", run(f"{9 + t}:00 ", "Time"), run(f"Talk {t}: Ćwiczenia z żółtą łodzią and other long titles that wrap")))
                parts.append(para("SlotAuthors", run("A. Nowak", "Presenter"), run(", B. Wiśniewska, C. Zając")))
    return (
        f'{HDR}<idPkg:Story {PKG} DOMVersion="{{dom}}"><Story Self="u_story" AppliedTOCStyle="n" '
        'TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n">'
        '<StoryPreference OpticalMarginAlignment="false" FrameType="TextFrameType" '
        'StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection"/>'
        + "".join(parts)
        + "</Story></idPkg:Story>"
    )


def small_story(self_id: str, body: str) -> str:
    return (
        f'{HDR}<idPkg:Story {PKG} DOMVersion="{{dom}}"><Story Self="{self_id}" AppliedTOCStyle="n" '
        'TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n">'
        f"{body}</Story></idPkg:Story>"
    )


PSTYLES = {
    "Title": 'PointSize="24" FontStyle="Bold"',
    "Subtitle": 'PointSize="14" SpaceAfter="12"',
    "TocEntry1": 'PointSize="10" SpaceAfter="12"',
    "PartHeading": 'PointSize="20" FontStyle="Bold" StartParagraph="NextPage" SpaceAfter="12"',
    "DayHeading": 'PointSize="16" FontStyle="Bold" StartParagraph="NextPage" SpaceAfter="8"',
    "SessionHeading": 'PointSize="11" FontStyle="Bold" SpaceBefore="10"',
    "SessionMeta": 'PointSize="9"',
    "ChairLine": 'PointSize="9" FontStyle="Italic" SpaceAfter="4"',
    "SlotTitle": 'PointSize="9.5"',
    "SlotAuthors": 'PointSize="8.5" SpaceAfter="3"',
    "GridHeader": 'PointSize="8" FontStyle="Bold"',
    "GridTime": 'PointSize="7.5"',
    "GridCell": 'PointSize="7.5"',
    "GridBand": 'PointSize="8" FontStyle="Bold" Justification="CenterAlign"',
    "Footer": 'PointSize="8"',
    "DraftMark": 'PointSize="110" FontStyle="Bold" FillColor="Color/Black" FillTint="20" Justification="CenterAlign"',
}
CSTYLES = {"Code": 'FontStyle="Bold"', "Time": 'FontStyle="Bold"', "Presenter": 'Underline="true"'}


def styles() -> str:
    lang = 'AppliedLanguage="$ID/Polish"'
    ps = "".join(
        f'<ParagraphStyle Self="ParagraphStyle/{n}" Name="{n}" {a} {lang}>'
        '<Properties><BasedOn type="string">$ID/[No paragraph style]</BasedOn>'
        '<AppliedFont type="string">Arial</AppliedFont></Properties></ParagraphStyle>'
        for n, a in PSTYLES.items()
    )
    cs = "".join(f'<CharacterStyle Self="CharacterStyle/{n}" Name="{n}" {a}/>' for n, a in CSTYLES.items())
    return (
        f'{HDR}<idPkg:Styles {PKG} DOMVersion="{{dom}}">'
        '<RootCharacterStyleGroup Self="u_rcsg">'
        '<CharacterStyle Self="CharacterStyle/$ID/[No character style]" Name="$ID/[No character style]"/>'
        f"{cs}</RootCharacterStyleGroup>"
        '<RootParagraphStyleGroup Self="u_rpsg">'
        '<ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]"/>'
        '<ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle"/>'
        f"{ps}</RootParagraphStyleGroup>"
        '<RootCellStyleGroup Self="u_rcellsg"><CellStyle Self="CellStyle/$ID/[None]" Name="$ID/[None]"/></RootCellStyleGroup>'
        '<RootTableStyleGroup Self="u_rtsg"><TableStyle Self="TableStyle/$ID/[Basic Table]" Name="$ID/[Basic Table]"/></RootTableStyleGroup>'
        '<RootObjectStyleGroup Self="u_rosg"><ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]"/></RootObjectStyleGroup>'
        "</idPkg:Styles>"
    )


def graphic() -> str:
    return (
        f'{HDR}<idPkg:Graphic {PKG} DOMVersion="{{dom}}">'
        '<Color Self="Color/Track1" Model="Process" Space="RGB" ColorValue="220 90 30" Name="Track1"/>'
        "</idPkg:Graphic>"
    )


def preferences(pages: int, limit_to_master: bool) -> str:
    return (
        f'{HDR}<idPkg:Preferences {PKG} DOMVersion="{{dom}}">'
        f'<DocumentPreference PageHeight="{H}" PageWidth="{W}" FacingPages="false"/>'
        f"{MARGINS}"
        f'<TextPreference SmartTextReflow="true" AddPages="EndOfStory" '
        f'LimitToMasterTextFrames="{str(limit_to_master).lower()}" PreserveFacingPageSpreads="false" DeleteEmptyPages="true"/>'
        "</idPkg:Preferences>"
    )


def master_spread(primary: bool, embedded_png: bytes) -> str:
    logo_l = image_frame("umlogoE", (M, TOP + M, M + 120, TOP + M + 40), embedded_png)
    logo_r = image_frame("umlogoL", (W - M - 120, TOP + M, W - M, TOP + M + 40), b"", "file:/C:/suberus-spike-missing/logo-linked.png")
    footer = text_frame("umfoot", "u_foot", (M, BOT - M - 16, W - M, BOT - M))
    draft = text_frame("umdraft", "u_draft", (M, -80, W - M, 80), layer="ulayer_draft")
    primary_frame = text_frame("umtf", "u_mstory", FRAME) if primary else ""
    attr = ' PrimaryTextFrame="umtf"' if primary else ""
    return (
        f'{HDR}<idPkg:MasterSpread {PKG} DOMVersion="{{dom}}">'
        f'<MasterSpread Self="um" Name="A-Master" NamePrefix="A" BaseName="Master" ShowMasterItems="true" PageCount="1"{attr}>'
        f'<Page Self="umpg" Name="A" GeometricBounds="0 0 {H} {W}" ItemTransform="1 0 0 1 0 {TOP}" MasterPageTransform="1 0 0 1 0 0">{MARGINS}</Page>'
        f"{logo_l}{logo_r}{footer}{draft}{primary_frame}</MasterSpread></idPkg:MasterSpread>"
    )


def spread(i: int, n: int, primary: bool) -> str:
    prev = f"utf{i - 1}" if i > 1 else "n"
    nxt = f"utf{i + 1}" if i < n else "n"
    pg = page(f"upg{i}", str(i), "um")
    if primary:
        pg = pg.replace('MasterPageTransform', 'OverrideList="umtf" MasterPageTransform', 1)
    return (
        f'{HDR}<idPkg:Spread {PKG} DOMVersion="{{dom}}">'
        f'<Spread Self="usp{i}" PageCount="1" BindingLocation="0" AllowPageShuffle="true" ShowMasterItems="true">'
        f'{pg}{text_frame(f"utf{i}", "u_story", FRAME, prev=prev, nxt=nxt)}'
        "</Spread></idPkg:Spread>"
    )


def designmap(n: int, stories: list[str]) -> str:
    spreads = "".join(f'<idPkg:Spread src="Spreads/Spread_usp{i}.xml"/>' for i in range(1, n + 1))
    st = "".join(f'<idPkg:Story src="Stories/Story_{s}.xml"/>' for s in stories)
    return (
        f'{HDR}<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="8.0(370)" ?>\n'
        f'<Document {PKG} DOMVersion="{{dom}}" Self="d" StoryList="{" ".join(stories)}" ZeroPoint="0 0" ActiveLayer="ulayer_content">'
        '<idPkg:Graphic src="Resources/Graphic.xml"/>'
        '<idPkg:Styles src="Resources/Styles.xml"/>'
        '<idPkg:Preferences src="Resources/Preferences.xml"/>'
        '<Layer Self="ulayer_draft" Name="Draft mark" Visible="true" Locked="false" Printable="true" ShowGuides="true"/>'
        '<Layer Self="ulayer_content" Name="Content" Visible="true" Locked="false" Printable="true" ShowGuides="true"/>'
        '<idPkg:MasterSpread src="MasterSpreads/MasterSpread_um.xml"/>'
        f"{spreads}"
        f'<Section Self="usec" Length="{n}" Name="" ContinueNumbering="true" '
        'IncludeSectionPrefix="false" PageStart="upg1" SectionPrefix="" Marker=""/>'
        f"{st}</Document>"
    )


CONTAINER = (
    f'{HDR}<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
    '<rootfiles><rootfile full-path="designmap.xml" media-type="text/xml"/></rootfiles></container>'
)


def build(name: str, dom: str, pages: int, primary: bool, logo: bytes) -> None:
    foot = para("Footer", run("Spike Conference 2026 · page "), '<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]"><Content><?ACE 18?></Content></CharacterStyleRange>')
    stories = ["u_story", "u_foot", "u_draft"] + (["u_mstory"] if primary else [])
    parts = {
        "designmap.xml": designmap(pages, stories),
        "META-INF/container.xml": CONTAINER,
        "Resources/Graphic.xml": graphic(),
        "Resources/Styles.xml": styles(),
        "Resources/Preferences.xml": preferences(pages, limit_to_master=primary),
        "MasterSpreads/MasterSpread_um.xml": master_spread(primary, logo),
        "Stories/Story_u_story.xml": main_story(),
        "Stories/Story_u_foot.xml": small_story("u_foot", foot),
        "Stories/Story_u_draft.xml": small_story("u_draft", para("DraftMark", run("DRAFT"))),
    }
    if primary:
        parts["Stories/Story_u_mstory.xml"] = small_story("u_mstory", "")
    for i in range(1, pages + 1):
        parts[f"Spreads/Spread_usp{i}.xml"] = spread(i, pages, primary)
    with zipfile.ZipFile(OUT / name, "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), "application/vnd.adobe.indesign-idml-package", compress_type=zipfile.ZIP_STORED)
        for path, xml in parts.items():
            z.writestr(path, xml.replace("{dom}", dom), compress_type=zipfile.ZIP_DEFLATED)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    embedded = png(240, 80, (30, 90, 200))
    (OUT / "logo-linked.png").write_bytes(png(240, 80, (200, 40, 40)))
    if len(sys.argv) > 2:
        build("schemacheck.idml", sys.argv[2], 3, primary=False, logo=embedded)
        build("schemacheck-primary.idml", sys.argv[2], 1, primary=True, logo=embedded)
        sys.exit()
    build("spike-threaded-v2.idml", "20.0", 3, primary=False, logo=embedded)
    build("spike-primary-dom20.idml", "20.0", 1, primary=True, logo=embedded)
    build("spike-primary-dom8.idml", "8.0", 1, primary=True, logo=embedded)
    print("ok", sorted(p.name for p in OUT.iterdir()))
