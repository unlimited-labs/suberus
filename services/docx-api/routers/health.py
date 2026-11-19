"""Health + toolchain versions (unversioned, no auth). The versions + config hash feed
the Node artifact cache key."""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

import config
from core.versions import libreoffice_version, pandoc_version, xmldiff_version

router = APIRouter()


class Health(BaseModel):
    status: str
    pandocVersion: str | None
    libreofficeVersion: str | None
    xmldiffVersion: str | None
    schemaVersion: int
    normalizerConfigHash: str
    queue: dict[str, Any]


@router.get("/", response_model=Health)
def health():
    return {
        "status": "healthy",
        "pandocVersion": pandoc_version(),
        "libreofficeVersion": libreoffice_version(),
        "xmldiffVersion": xmldiff_version(),
        "schemaVersion": config.SCHEMA_VERSION,
        "normalizerConfigHash": config.NORMALIZER_CONFIG_HASH,
        "queue": config.ADMISSION.stats(),
    }
