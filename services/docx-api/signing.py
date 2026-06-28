"""PAdES digital signing for generated PDFs (document generator feature).

The Node app owns the certificate lifecycle and keeps the sidecar stateless: it
passes the PKCS#12 (with its password) on every sign request. This module:

  - generates a self-signed signing certificate (cryptography),
  - signs a PDF with a visible seal (+ optional QR / logo / timestamp / DocMDP),
  - inspects an uploaded P12,
  - verifies a signed PDF (trust anchor = the embedded signer cert, since
    self-signed is the expected default).

pyHanko was chosen over endesive/node-signpdf: first-class PAdES B/T/LTA, a
documented server-side validation API, and composable visible seals.
"""

import datetime
import hashlib
import io
import os
import secrets
import tempfile

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID
from PIL import Image
from pyhanko.pdf_utils.images import PdfImage
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign import fields, signers
from pyhanko.sign.timestamps import HTTPTimeStamper
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko.stamp import QRStampStyle, TextStampStyle
from pyhanko_certvalidator import ValidationContext

FIELD_NAME = "Signature1"
# Visible seal box in PDF points (bottom-left origin) + page margin.
SEAL_W, SEAL_H, MARGIN = 200, 70, 28


def _cert_metadata(cert: x509.Certificate) -> dict:
    cn = cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
    org = cert.subject.get_attributes_for_oid(NameOID.ORGANIZATION_NAME)
    return {
        "subject": cert.subject.rfc4514_string(),
        "commonName": cn[0].value if cn else "",
        "org": org[0].value if org else "",
        "fingerprintSha256": hashlib.sha256(
            cert.public_bytes(serialization.Encoding.DER)
        ).hexdigest(),
        "validFrom": cert.not_valid_before_utc.isoformat(),
        "validUntil": cert.not_valid_after_utc.isoformat(),
        "serial": str(cert.serial_number),
    }


def gen_self_signed_p12(
    common_name: str, org: str, valid_days: int
) -> tuple[bytes, str, dict, str]:
    """Generate an RSA-3072 self-signed signing cert, returned as a
    password-protected PKCS#12 plus its metadata and public-cert PEM."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    name = x509.Name(
        [
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, org or common_name),
        ]
    )
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(minutes=5))
        .not_valid_after(now + datetime.timedelta(days=max(1, valid_days)))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            # digital_signature + content_commitment (= non-repudiation): pyHanko's
            # default expectation for a signer cert.
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=True,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(key, hashes.SHA256())
    )
    password = secrets.token_urlsafe(24)
    p12 = pkcs12.serialize_key_and_certificates(
        name=common_name.encode(),
        key=key,
        cert=cert,
        cas=None,
        encryption_algorithm=serialization.BestAvailableEncryption(password.encode()),
    )
    cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode()
    return p12, password, _cert_metadata(cert), cert_pem


def inspect_p12(p12_bytes: bytes, password: str) -> tuple[dict, str]:
    """Validate an uploaded P12 and return (metadata, public-cert PEM). Raises
    ValueError on a bad password or a P12 without a certificate."""
    try:
        _key, cert, _cas = pkcs12.load_key_and_certificates(
            p12_bytes, password.encode() if password else None
        )
    except Exception as e:  # cryptography raises ValueError on bad password
        raise ValueError(f"Could not open the P12 (wrong password?): {e}") from e
    if cert is None:
        raise ValueError("The P12 contains no certificate")
    return _cert_metadata(cert), cert.public_bytes(serialization.Encoding.PEM).decode()


def _first_page_size(pdf_bytes: bytes) -> tuple[float, float]:
    """First page (width, height) in points. Falls back to A4 if the page tree is
    not the flat shape LibreOffice emits. ponytail: flat Pages tree assumed."""
    try:
        r = PdfFileReader(io.BytesIO(pdf_bytes), strict=False)
        page = r.root["/Pages"]["/Kids"][0]
        mb = page["/MediaBox"]
        return float(mb[2]) - float(mb[0]), float(mb[3]) - float(mb[1])
    except Exception:
        return 595.0, 842.0


def _seal_box(corner: str, page_w: float, page_h: float) -> tuple[int, int, int, int]:
    right = "right" in corner
    top = "top" in corner
    x2 = (page_w - MARGIN) if right else (MARGIN + SEAL_W)
    x1 = x2 - SEAL_W
    y2 = (page_h - MARGIN) if top else (MARGIN + SEAL_H)
    y1 = y2 - SEAL_H
    return (int(x1), int(y1), int(x2), int(y2))


def sign_pdf(pdf_bytes: bytes, p12_bytes: bytes, password: str, opts: dict) -> bytes:
    """Apply a PAdES signature with a visible seal. opts: reason, location, corner,
    qr_url, logo_png, certify, timestamp_url."""
    with tempfile.NamedTemporaryFile(suffix=".p12", delete=False) as f:
        f.write(p12_bytes)
        p12_path = f.name
    try:
        signer = signers.SimpleSigner.load_pkcs12(
            pfx_file=p12_path,
            passphrase=password.encode() if password else None,
        )
    finally:
        os.unlink(p12_path)
    if signer is None:
        raise ValueError("Could not load the signing certificate from the P12")

    reason = opts.get("reason") or ""
    qr_url = opts.get("qr_url")
    logo_png = opts.get("logo_png")

    stamp_text = "Digitally signed by\n%(signer)s\n%(ts)s"
    if reason:
        stamp_text = f"{reason}\n{stamp_text}"
    style_kwargs = {"stamp_text": stamp_text}
    if logo_png:
        style_kwargs["background"] = PdfImage(Image.open(io.BytesIO(logo_png)))
        style_kwargs["background_opacity"] = 0.15
    if qr_url:
        stamp_style = QRStampStyle(stamp_text=f"{stamp_text}\n%(url)s", **{
            k: v for k, v in style_kwargs.items() if k != "stamp_text"
        })
    else:
        stamp_style = TextStampStyle(**style_kwargs)

    page_w, page_h = _first_page_size(pdf_bytes)
    box = _seal_box(opts.get("corner") or "bottom-right", page_w, page_h)

    certify = bool(opts.get("certify"))
    meta = signers.PdfSignatureMetadata(
        field_name=FIELD_NAME,
        reason=reason or None,
        location=opts.get("location") or None,
        subfilter=fields.SigSeedSubFilter.PADES,
        certify=certify,
        docmdp_permissions=fields.MDPPerm.NO_CHANGES if certify else None,
    )
    ts_url = opts.get("timestamp_url")
    pdf_signer = signers.PdfSigner(
        meta,
        signer=signer,
        stamp_style=stamp_style,
        timestamper=HTTPTimeStamper(ts_url) if ts_url else None,
        new_field_spec=fields.SigFieldSpec(sig_field_name=FIELD_NAME, box=box),
    )

    # strict=False: tolerate quirky producer PDFs (the signature math is unaffected).
    writer = IncrementalPdfFileWriter(io.BytesIO(pdf_bytes), strict=False)
    out = io.BytesIO()
    pdf_signer.sign_pdf(
        writer,
        output=out,
        appearance_text_params={"url": qr_url} if qr_url else None,
    )
    return out.getvalue()


def verify_pdf(pdf_bytes: bytes) -> dict:
    """Verify the first signature. Trust anchor = the embedded signer cert (self-
    signed is expected), so we report integrity + signer identity + claimed time."""
    try:
        r = PdfFileReader(io.BytesIO(pdf_bytes), strict=False)
        sigs = r.embedded_signatures
    except Exception as e:
        return {"valid": False, "intact": False, "signed": False,
                "reason": f"Not a readable PDF: {e}"}
    if not sigs:
        return {"valid": False, "intact": False, "signed": False,
                "reason": "This document is not digitally signed"}

    sig = sigs[0]
    signer_cert = sig.signer_cert
    vc = ValidationContext(
        trust_roots=[signer_cert], allow_fetching=False, revocation_mode="soft-fail"
    )
    try:
        status = validate_pdf_signature(sig, vc)
    except Exception as e:
        return {"signed": True, "valid": False, "intact": False,
                "signerSubject": signer_cert.subject.human_friendly,
                "signedAt": None, "reason": f"Signature could not be validated: {e}"}
    signed_at = sig.self_reported_timestamp
    return {
        "signed": True,
        "valid": bool(status.bottom_line),
        "intact": bool(status.intact),
        "signerSubject": signer_cert.subject.human_friendly,
        "signedAt": signed_at.isoformat() if signed_at else None,
        "reason": status.pretty_print_details(),
    }
