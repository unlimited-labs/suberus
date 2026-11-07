"""Pydantic mirror of the app's zod `printDocumentSchema` (print-document-schema.ts).
The zod schema is the source of truth; test_idml.py checks the shared JSON fixture."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Hex = Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")]

ParagraphStyle = Literal[
    "Title", "Subtitle", "PartHeading", "DayHeading", "SessionHeading", "SessionMeta",
    "ChairLine", "SlotTitle", "SlotAuthors", "BreakLine", "EventTitle", "EventText",
    "GridHeader", "GridTime", "GridCell", "GridBand", "Legend", "IndexLetter", "IndexEntry",
    "TocEntry1", "TocEntry2",
]
CharacterStyle = Literal["Code", "Time", "Presenter", "Presenting", "Cancelled", "Badge", "Invited"]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Run(Model):
    text: str
    charStyle: CharacterStyle | None = None
    color: Hex | None = None


class Paragraph(Model):
    type: Literal["paragraph"]
    style: ParagraphStyle
    runs: list[Run]


class TableColumn(Model):
    widthWeight: float = Field(gt=0)


class TableCell(Model):
    row: int = Field(ge=0)
    col: int = Field(ge=0)
    rowSpan: int = Field(ge=1)
    colSpan: int = Field(ge=1)
    accent: Hex | None
    blocks: list[Paragraph]


class Table(Model):
    type: Literal["table"]
    columns: list[TableColumn]
    headerRows: int = Field(ge=0)
    rowCount: int = Field(ge=0)
    cells: list[TableCell]


class Toc(Model):
    type: Literal["toc"]
    title: str


class Image(Model):
    type: Literal["image"]
    mime: Literal["image/png", "image/jpeg"]
    dataBase64: str
    widthFraction: float = Field(gt=0, le=1)
    aspectRatio: float = Field(gt=0)


Block = Annotated[Paragraph | Table | Toc | Image, Field(discriminator="type")]


class Page(Model):
    size: Literal["A4", "B5", "A5"]
    orientation: Literal["portrait", "landscape"]


class Section(Model):
    page: Page
    columns: Literal[1, 2]
    start: Literal["nextPage", "evenPage"]
    blocks: list[Block]


class Swatch(Model):
    name: str
    color: Hex


class PrintDocument(Model):
    schemaVersion: Literal[1]
    draft: bool
    language: Literal["en", "pl"]
    footer: str
    swatches: list[Swatch]
    sections: list[Section]
