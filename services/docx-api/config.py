"""Env-driven limits/timeouts + the normalize recipe fingerprint.

NORMALIZER_CONFIG_HASH is a production artifact cache key — its keys/values MUST stay
byte-stable (a change silently re-normalizes and invalidates historical diffs). Only the
`libreofficeVersion` value is environment-dependent (probed at import).
"""

import hashlib
import json
import os

from core.versions import libreoffice_version

# Hard ceiling on an accepted upload (anti-DoS: zip-bomb / pathological DOCX). Not
# the per-type business limit (the app enforces that at upload) — just a bound on
# what this sidecar hands to pandoc/LibreOffice.
MAX_NORMALIZE_BYTES = int(os.getenv("DOCX_API_MAX_MB", "50")) * 1024 * 1024
# Per-subprocess wall-clock caps so a crafted file can't hang a worker forever.
PANDOC_TIMEOUT_S = int(os.getenv("DOCX_API_PANDOC_TIMEOUT_S", "120"))
SOFFICE_TIMEOUT_S = int(os.getenv("DOCX_API_SOFFICE_TIMEOUT_S", "90"))

# Shared-secret gate on /v1/*. The sidecar handles the org signing key + P12
# password, so it must not be an open oracle for anyone who can reach the port.
# When unset (local dev / E2E) auth is disabled; set it in any shared/prod env and
# the Node clients send a matching bearer token.
DOCX_API_TOKEN = os.getenv("DOCX_API_TOKEN")

# A DOCX is a zip; a small upload can inflate to gigabytes inside pandoc/LibreOffice
# (decompression bomb). The input-byte cap above does not bound the *uncompressed*
# size — these do. The container also runs under a mem_limit as the hard backstop.
MAX_UNCOMPRESSED_BYTES = (
    int(os.getenv("DOCX_API_MAX_UNCOMPRESSED_MB", "500")) * 1024 * 1024
)
MAX_INFLATION_RATIO = int(os.getenv("DOCX_API_MAX_INFLATION_RATIO", "200"))

# Bundle schema version — bump when the bundle layout or normalize recipe changes
# (participates in the artifact cache key so historical diffs aren't silently mutated).
SCHEMA_VERSION = 1

# Pinned pandoc recipe. `--sandbox` blocks pandoc IO; `--wrap=none` keeps diff-friendly
# lines; `--mathjax` keeps native math as raw TeX (`\(…\)`/`\[…\]`) in the math span so
# the Node KaTeX pass renders it; raw HTML is dropped so author-supplied markup can't
# smuggle script through.
PANDOC_ARGS = ["-f", "docx+styles", "-t", "html", "--sandbox", "--wrap=none", "--mathjax"]

# libreofficeVersion folds into the hash so an LO upgrade that changes figure
# rasterization invalidates the cache (gotcha C4 — else figures silently mutate
# while the artifact key stays stable).
NORMALIZER_CONFIG = {
    "pandocArgs": PANDOC_ARGS,
    "figures": "all->png",
    "imgDims": "style->attr@px",
    "mathtype": "ole-mtef-v5->latex-span",
    "blockStyles": "align+tblwidth->class",
    "styleCss": "styles.xml+document.xml->classed-css",
    "schemaVersion": SCHEMA_VERSION,
    "libreofficeVersion": libreoffice_version(),
}
NORMALIZER_CONFIG_HASH = hashlib.sha256(
    json.dumps(NORMALIZER_CONFIG, sort_keys=True).encode()
).hexdigest()
