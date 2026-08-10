"""Cross-cutting request guards: bearer-token auth + zip-bomb rejection."""

import hmac
import io
import zipfile

from fastapi import Header, HTTPException

import config


def require_token(authorization: str | None = Header(default=None)) -> None:
    if not config.DOCX_API_TOKEN:
        return
    expected = f"Bearer {config.DOCX_API_TOKEN}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def reject_zip_bomb(contents: bytes) -> None:
    """Reject a DOCX whose uncompressed size or inflation ratio looks like a bomb,
    before any subprocess touches it. Also asserts the upload is a real zip/DOCX.
    Central-directory sizes can be forged, so this pairs with the container
    mem_limit (the real ceiling) rather than standing alone."""
    try:
        with zipfile.ZipFile(io.BytesIO(contents)) as z:
            total = sum(info.file_size for info in z.infolist())
    except zipfile.BadZipFile:
        raise HTTPException(400, "Uploaded file is not a valid DOCX (zip)")
    if total > config.MAX_UNCOMPRESSED_BYTES:
        raise HTTPException(413, "DOCX uncompressed size exceeds the limit")
    if contents and total / len(contents) > config.MAX_INFLATION_RATIO:
        raise HTTPException(413, "DOCX compression ratio looks like a zip bomb")
