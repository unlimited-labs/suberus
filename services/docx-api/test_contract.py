"""The /v1 response models (the OpenAPI contract snapshot) accept what the handlers return."""

import base64

import signing
from routers.diff import DiffRequest, DiffResponse, diff
from routers.health import Health, health
from routers.signing import (
    GenCertRequest,
    GenCertResponse,
    InspectCertResponse,
    VerifyResponse,
    gen_cert,
)
from test_signing import _make_pdf


def test_health_matches_model():
    Health.model_validate(health())


def test_diff_matches_model():
    DiffResponse.model_validate(diff(DiffRequest(htmlA="<p>a</p>", htmlB="<p>b</p>")))


def test_cert_and_verify_match_models():
    gen = GenCertResponse.model_validate(gen_cert(GenCertRequest(commonName="X")))
    p12 = base64.b64decode(gen.p12Base64)
    meta, pem = signing.inspect_p12(p12, gen.password)
    InspectCertResponse.model_validate({"metadata": meta, "certPem": pem})

    signed = signing.sign_pdf(_make_pdf(), p12, gen.password, {})
    VerifyResponse.model_validate(signing.verify_pdf(signed))
    unsigned = VerifyResponse.model_validate(signing.verify_pdf(_make_pdf()))
    assert "signerSubject" not in unsigned.model_dump(exclude_unset=True)
