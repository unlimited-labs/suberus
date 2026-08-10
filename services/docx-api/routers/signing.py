"""Signing API — PAdES digital signatures via pyHanko. The Node app owns the cert
lifecycle and keeps this sidecar stateless: the P12 + password ride along on every
sign request.

`import signing` below resolves (absolute import) to the top-level `signing.py` domain
module, not this router package member."""

import base64

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

import signing
from config import MAX_NORMALIZE_BYTES
from core.security import require_token

router = APIRouter(prefix="/v1", dependencies=[Depends(require_token)])


class GenCertRequest(BaseModel):
    commonName: str
    org: str = ""
    validDays: int = 1825  # ~5 years


@router.post("/gen-cert")
def gen_cert(req: GenCertRequest):
    """Generate a self-signed signing certificate as a password-protected P12."""
    if not req.commonName.strip():
        raise HTTPException(400, "commonName is required")
    p12, password, metadata, cert_pem = signing.gen_self_signed_p12(
        req.commonName.strip(), req.org.strip(), req.validDays
    )
    return {
        "p12Base64": base64.b64encode(p12).decode(),
        "password": password,
        "metadata": metadata,
        "certPem": cert_pem,
    }


@router.post("/inspect-cert")
async def inspect_cert(p12: UploadFile, password: str = Form("")):
    """Validate an uploaded P12 and return its certificate metadata + public PEM."""
    data = await p12.read()
    if not data:
        raise HTTPException(400, "No P12 uploaded")
    try:
        metadata, cert_pem = signing.inspect_p12(data, password)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"metadata": metadata, "certPem": cert_pem}


@router.post("/sign-pdf")
async def sign_pdf(
    file: UploadFile,
    p12: UploadFile = File(...),
    password: str = Form(""),
    reason: str = Form(""),
    location: str = Form(""),
    corner: str = Form("bottom-right"),
    qrUrl: str = Form(""),
    timestampUrl: str = Form(""),
    certify: str = Form("false"),
):
    """Apply a PAdES signature (visible seal) to an uploaded PDF."""
    pdf_bytes = await file.read()
    p12_bytes = await p12.read()
    if not pdf_bytes:
        raise HTTPException(400, "No PDF uploaded")
    if not p12_bytes:
        raise HTTPException(400, "No P12 uploaded")
    if len(pdf_bytes) > MAX_NORMALIZE_BYTES:
        raise HTTPException(413, "PDF exceeds the size limit")
    try:
        # Offload to a worker thread: pyHanko's sync sign_pdf calls asyncio.run()
        # internally, which fails inside FastAPI's running event loop.
        signed = await run_in_threadpool(
            signing.sign_pdf,
            pdf_bytes,
            p12_bytes,
            password,
            {
                "reason": reason,
                "location": location,
                "corner": corner,
                "qr_url": qrUrl or None,
                "timestamp_url": timestampUrl or None,
                "certify": certify.lower() == "true",
            },
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return Response(
        content=signed,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="signed.pdf"'},
    )


@router.post("/verify-pdf")
async def verify_pdf(file: UploadFile):
    """Verify a PDF's signature (trust anchor = the embedded signer cert)."""
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(400, "No PDF uploaded")
    if len(pdf_bytes) > MAX_NORMALIZE_BYTES:
        raise HTTPException(413, "PDF exceeds the size limit")
    # Offload: validate_pdf_signature also wraps an async path with asyncio.run().
    return await run_in_threadpool(signing.verify_pdf, pdf_bytes)
