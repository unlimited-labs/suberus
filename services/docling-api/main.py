"""
Minimal Docling document conversion server (DOCX/PDF -> markdown/JSON/DocTags).

Endpoints:
  GET  /           -> health check
  POST /           -> markdown output
  POST /json       -> docling JSON structure
  POST /doctags    -> DocTags output
"""

import os
import tempfile
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import EasyOcrOptions, PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption
from fastapi import FastAPI, HTTPException, UploadFile

easyocr_path = os.getenv("EASYOCR_MODULE_PATH")
easyocr_options = EasyOcrOptions(download_enabled=True)
if easyocr_path:
    easyocr_options.model_storage_directory = f"{easyocr_path}/model"

pdf_pipeline_options = PdfPipelineOptions(
    do_ocr=True,
    do_table_structure=True,
    ocr_options=easyocr_options,
)
pdf_pipeline_options.table_structure_options.do_cell_matching = True

artifacts_path = os.getenv("DOCLING_ARTIFACTS_PATH")
if artifacts_path:
    pdf_pipeline_options.artifacts_path = artifacts_path

converter = DocumentConverter(
    allowed_formats=[InputFormat.DOCX, InputFormat.PDF],
    format_options={
        InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_pipeline_options),
    },
)
app = FastAPI()


async def convert_upload(file: UploadFile):
    """Save upload to temp file, convert with docling, return document."""
    suffix = Path(file.filename or "doc.bin").suffix
    contents = await file.read()
    if not contents:
        raise HTTPException(400, "No file uploaded")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        result = converter.convert(tmp_path)
        return result.document
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@app.get("/")
def health():
    return {"status": "healthy"}


@app.post("/")
async def to_markdown(file: UploadFile):
    doc = await convert_upload(file)
    return {"markdown": doc.export_to_markdown()}


@app.post("/json")
async def to_json(file: UploadFile):
    doc = await convert_upload(file)
    return doc.model_dump(mode="json")


@app.post("/doctags")
async def to_doctags(file: UploadFile):
    doc = await convert_upload(file)
    return {"doctags": doc.export_to_document_tokens()}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8100"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
