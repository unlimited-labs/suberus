"""DOCX sidecar — thin app assembly over a service layer (`core/`) and concern-split
routers (`routers/`).

Layout:
  config.py   — env limits/timeouts + the normalize-recipe fingerprint (cache key)
  core/       — shared service layer (no HTTP): proc, security, pandoc, libreoffice,
                raster, htmlpost, versions, normalize
  routers/    — one API per need:
                  health   GET /            (versions + config hash, unversioned/no-auth)
                  editor   /v1/ast /v1/omml (DOCX→structured for the docx→Typst editor)
                  diff     /v1/normalize /v1/diff       (submission version-diff)
                  render   /v1/render-pdf               (document generation)
                  signing  /v1/gen-cert …/verify-pdf    (PAdES via pyHanko)
  domain      — omml, mathtype, stylecss, diffhtml, ooxml, htmlesc, signing

Functional endpoints stay under /v1 (behind a shared-secret token) so a future contract
change can ship /v2 while older app deploys keep calling /v1.
"""

import os

from fastapi import FastAPI

from routers import diff, editor, health, render, signing

app = FastAPI()
app.include_router(health.router)
app.include_router(editor.router)
app.include_router(diff.router)
app.include_router(render.router)
app.include_router(signing.router)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8101"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
