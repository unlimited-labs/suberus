"""Health + toolchain versions (unversioned, no auth). The versions + config hash feed
the Node artifact cache key."""

from fastapi import APIRouter

import config
from core.versions import libreoffice_version, pandoc_version, xmldiff_version

router = APIRouter()


@router.get("/")
def health():
    return {
        "status": "healthy",
        "pandocVersion": pandoc_version(),
        "libreofficeVersion": libreoffice_version(),
        "xmldiffVersion": xmldiff_version(),
        "schemaVersion": config.SCHEMA_VERSION,
        "normalizerConfigHash": config.NORMALIZER_CONFIG_HASH,
    }
