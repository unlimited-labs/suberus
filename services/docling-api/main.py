"""
Minimal Docling document conversion server (DOCX/PDF -> markdown/JSON/DocTags/bundle).

Endpoints:
  GET  /              -> health check (unversioned)
  POST /v1/markdown   -> markdown output
  POST /v1/json       -> docling JSON structure
  POST /v1/doctags    -> DocTags output
  POST /v1/bundle     -> application/zip: document.html (the fragment the diff pipeline
                         consumes; figure refs -> figures/<sha256>.png), document.md +
                         document.json (diagnostics), content-addressed figures/*.png,
                         meta.json (pandoc/docling versions + normalizerConfigHash +
                         integer schemaVersion for the artifact cache key).
                         Used by the submission version-diff feature; opt-in so the default
                         extraction path stays lean (figures + formula enrichment are ON
                         only here). HTML comes from pandoc (markdown -> HTML); the Node
                         worker DOMPurify-sanitizes it — this service does NOT sanitize.

Functional endpoints are versioned under /v1 so a future contract change can ship /v2
while older app deploys keep calling /v1. Health stays unversioned at /.
"""

import base64
import hashlib
import io
import json
import os
import re
import tempfile
import zipfile
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import EasyOcrOptions, PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.types.doc import ImageRefMode
from fastapi import APIRouter, FastAPI, HTTPException, Response, UploadFile

import bundle_meta

easyocr_path = os.getenv("EASYOCR_MODULE_PATH")
easyocr_options = EasyOcrOptions(download_enabled=True)
if easyocr_path:
    easyocr_options.model_storage_directory = f"{easyocr_path}/model"

artifacts_path = os.getenv("DOCLING_ARTIFACTS_PATH")


def _pdf_options(
    generate_picture_images: bool, do_formula_enrichment: bool = False
) -> PdfPipelineOptions:
    opts = PdfPipelineOptions(
        do_ocr=True,
        do_table_structure=True,
        ocr_options=easyocr_options,
        generate_picture_images=generate_picture_images,
        do_formula_enrichment=do_formula_enrichment,
        images_scale=2.0,
    )
    opts.table_structure_options.do_cell_matching = True
    if artifacts_path:
        opts.artifacts_path = artifacts_path
    return opts


def _converter(
    generate_picture_images: bool, do_formula_enrichment: bool = False
) -> DocumentConverter:
    return DocumentConverter(
        allowed_formats=[InputFormat.DOCX, InputFormat.PDF],
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_options=_pdf_options(
                    generate_picture_images, do_formula_enrichment
                )
            ),
        },
    )


# Default converter: no figure rendering / no enrichment -> extraction stays lean.
converter = _converter(generate_picture_images=False)
# Image+formula converter is built lazily on first /bundle call (avoids the extra
# model memory + the formula model until the diff feature is actually used).
_image_converter: DocumentConverter | None = None


def get_image_converter() -> DocumentConverter:
    global _image_converter
    if _image_converter is None:
        _image_converter = _converter(
            generate_picture_images=True, do_formula_enrichment=True
        )
    return _image_converter


app = FastAPI()
v1 = APIRouter(prefix="/v1")


async def _to_temp(file: UploadFile) -> str:
    suffix = Path(file.filename or "doc.bin").suffix
    contents = await file.read()
    if not contents:
        raise HTTPException(400, "No file uploaded")
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        return tmp.name


async def convert_upload(file: UploadFile):
    """Save upload to temp file, convert with docling, return document."""
    tmp_path = await _to_temp(file)
    try:
        return converter.convert(tmp_path).document
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@app.get("/")
def health():
    # The fingerprint fields feed the Node artifact cache pre-check; they MUST be
    # byte-identical to the bundle meta (see bundle_meta.fingerprint/build_meta).
    return {"status": "healthy", **bundle_meta.fingerprint()}


@v1.post("/markdown")
async def to_markdown(file: UploadFile):
    doc = await convert_upload(file)
    return {"markdown": doc.export_to_markdown()}


@v1.post("/json")
async def to_json(file: UploadFile):
    doc = await convert_upload(file)
    return doc.model_dump(mode="json")


@v1.post("/doctags")
async def to_doctags(file: UploadFile):
    doc = await convert_upload(file)
    return {"doctags": doc.export_to_document_tokens()}


_DATA_URI_RE = re.compile(r"data:image/[^;]+;base64,([A-Za-z0-9+/=]+)")


@v1.post("/bundle")
async def to_bundle(file: UploadFile):
    """Convert WITH figure rendering and return a zip bundle for the diff pipeline."""
    tmp_path = await _to_temp(file)
    try:
        doc = get_image_converter().convert(tmp_path).document
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    figures: dict[str, bytes] = {}

    def externalize(b64: str) -> str:
        raw = base64.b64decode(b64)
        sha = hashlib.sha256(raw).hexdigest()
        figures[sha] = raw
        return f"figures/{sha}.png"

    # Markdown with embedded images, then move each base64 image into figures/<sha>.png.
    md = doc.export_to_markdown(image_mode=ImageRefMode.EMBEDDED)
    md = _DATA_URI_RE.sub(lambda m: externalize(m.group(1)), md)

    # JSON without heavy inline base64: point picture.image.uri at the same figures/ ref.
    dj = doc.model_dump(mode="json")
    for pic in dj.get("pictures", []):
        img = pic.get("image")
        if isinstance(img, dict) and isinstance(img.get("uri"), str) and img["uri"].startswith("data:"):
            m = _DATA_URI_RE.match(img["uri"])
            if m:
                img["uri"] = externalize(m.group(1))

    # Convert to the HTML the diff pipeline actually consumes (Node parseBundle
    # reads document.html; md/json are kept for diagnostics). A pandoc failure is a
    # hard error (the job retries) — never a silently empty document.html.
    try:
        html, warnings = bundle_meta.md_to_html(md)
    except bundle_meta.PandocError as e:
        raise HTTPException(500, str(e))

    meta = bundle_meta.build_meta(
        filename=file.filename,
        docling_doc_schema=dj.get("version"),
        figures_count=len(figures),
        warnings=warnings,
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("document.html", html)
        z.writestr("document.md", md)
        z.writestr("document.json", json.dumps(dj, ensure_ascii=False))
        z.writestr("meta.json", json.dumps(meta, ensure_ascii=False))
        for sha, raw in figures.items():
            z.writestr(f"figures/{sha}.png", raw)

    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="bundle.zip"'},
    )


app.include_router(v1)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8100"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
