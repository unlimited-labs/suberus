"""Self-signed cert + PAdES sign/verify round-trip for the document signature
feature. No LibreOffice needed: Pillow emits a minimal one-page PDF to sign.
Runs in the docx-api test image (pyHanko + cryptography installed)."""

import io

from PIL import Image

import signing


def _make_pdf() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (612, 792), "white").save(buf, "PDF")
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
