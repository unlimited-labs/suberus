"""Self-signed cert + PAdES sign/verify round-trip for the document signature
feature. No LibreOffice needed: Pillow emits a minimal one-page PDF to sign.
Runs in the docx-api test image (pyHanko + cryptography installed)."""

import io

from PIL import Image

import signing
from main import _logo_to_png

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _make_pdf() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (612, 792), "white").save(buf, "PDF")
    return buf.getvalue()


def _make_png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGBA", (64, 64), (10, 20, 30, 255)).save(buf, "PNG")
    return buf.getvalue()


def test_gen_cert_produces_loadable_p12():
    p12, password, meta, pem = signing.gen_self_signed_p12("ICCMS 2026", "Org", 365)
    assert pem.startswith("-----BEGIN CERTIFICATE-----")
    assert meta["commonName"] == "ICCMS 2026"
    assert len(meta["fingerprintSha256"]) == 64
    meta2, pem2 = signing.inspect_p12(p12, password)
    assert meta2["fingerprintSha256"] == meta["fingerprintSha256"]
    assert pem2 == pem


def test_inspect_p12_bad_password_raises():
    p12, _password, _meta, _pem = signing.gen_self_signed_p12("X", "Y", 30)
    try:
        signing.inspect_p12(p12, "wrong-password")
    except ValueError:
        return
    raise AssertionError("expected ValueError on wrong password")


def test_sign_then_verify_roundtrip():
    p12, password, _meta, _pem = signing.gen_self_signed_p12("ICCMS 2026", "Org", 365)
    signed = signing.sign_pdf(
        _make_pdf(), p12, password,
        {"reason": "Issued by ICCMS 2026", "corner": "bottom-right",
         "qr_url": "https://example.org/verify-document"},
    )
    assert signed[:5] == b"%PDF-"
    assert b"/ByteRange" in signed  # a PAdES signature was embedded

    res = signing.verify_pdf(signed)
    assert res["signed"] and res["intact"] and res["valid"]
    assert "ICCMS 2026" in res["signerSubject"]


def test_tamper_breaks_integrity():
    p12, password, _meta, _pem = signing.gen_self_signed_p12("ICCMS 2026", "Org", 365)
    signed = signing.sign_pdf(_make_pdf(), p12, password, {"reason": "x"})
    bad = bytearray(signed)
    bad[len(bad) // 3] ^= 0xFF  # flip a covered content byte
    res = signing.verify_pdf(bytes(bad))
    assert not res["intact"]


def test_unsigned_pdf_reports_not_signed():
    res = signing.verify_pdf(_make_pdf())
    assert res["signed"] is False


def test_logo_to_png_normalizes_raster():
    out = _logo_to_png(_make_png())
    assert out[:8] == PNG_MAGIC
    with Image.open(io.BytesIO(out)) as im:
        assert im.size == (64, 64)


def test_logo_to_png_rasterizes_svg():
    svg = (
        b'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">'
        b'<rect width="64" height="64" fill="#102030"/></svg>'
    )
    out = _logo_to_png(svg)
    assert out[:8] == PNG_MAGIC
    Image.open(io.BytesIO(out)).close()  # decodes


def test_sign_with_logo_roundtrip():
    p12, password, _meta, _pem = signing.gen_self_signed_p12("ICCMS 2026", "Org", 365)
    signed = signing.sign_pdf(
        _make_pdf(), p12, password,
        {"reason": "Issued by ICCMS 2026", "logo_png": _make_png()},
    )
    assert signed[:5] == b"%PDF-"
    res = signing.verify_pdf(signed)
    assert res["signed"] and res["intact"] and res["valid"]
