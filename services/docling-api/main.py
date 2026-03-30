"""
Minimal Docling document conversion server (DOCX → markdown/JSON/DocTags).

Endpoints:
  GET  /           → health check
  POST /           → markdown output
  POST /json       → docling JSON structure
  POST /doctags    → DocTags output
"""

import os
import tempfile
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter
from fastapi import FastAPI, HTTPException, UploadFile

converter = DocumentConverter(allowed_formats=[InputFormat.DOCX])
app = FastAPI()


async def convert_upload(file: UploadFile):
    """Save upload to temp file, convert with docling, return document."""
    suffix = Path(file.filename or "doc.docx").suffix
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
