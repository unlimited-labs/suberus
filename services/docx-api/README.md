# docx-api

DOCX → normalized-HTML + rasterized-figure **bundle** for the submission
version-diff pipeline (Track B). Sibling of `docling-api` (which handles PDF).

The Node `submission-diff` worker calls `POST /normalize` per submission version,
then content-addresses the figures into Garage, sanitizes the HTML with
DOMPurify-on-jsdom, and persists a `SubmissionVersionArtifact`. **This service does
not sanitize** — sanitization must run in the Node worker (Phase 0 finding).

## Endpoints

- `GET /` — health + `{ pandocVersion, libreofficeVersion, schemaVersion, normalizerConfigHash }`.
- `POST /normalize` (multipart `file=<docx>`) → `application/zip`:
  - `document.html` — Pandoc HTML fragment; every `<img src>` rewritten to `figures/<sha256>.png`.
  - `figures/<sha256>.png` — content-addressed, rasterized (EMF/WMF/SVG via LibreOffice; other rasters via Pillow; PNG passthrough).
  - `meta.json` — `{ pandocVersion, libreofficeVersion, normalizerConfigHash, schemaVersion, figures, warnings }` for the artifact cache key.

## Build & run

```bash
docker build -t suberus-docx-api services/docx-api          # ~pandoc + libreoffice, large image
docker run --rm -p 8101:8101 suberus-docx-api
# or via compose:
docker compose up -d docx-api
```

## Verify (smoke)

```bash
curl -s localhost:8101/ | jq                                 # versions
curl -s -F file=@mf2024-demo/42cce4bbc14611a63ab87cb650b3b3f5.docx \
     localhost:8101/normalize -o /tmp/bundle.zip
unzip -l /tmp/bundle.zip                                      # document.html + figures/*.png + meta.json
```

Determinism: same DOCX + same pinned toolchain → same `document.html` and figure
shas. A `PANDOC_VERSION` bump changes `meta.pandocVersion` → the worker re-extracts
rather than mutating historical artifacts (immutable-forever).

## Notes / TODO

- `PANDOC_VERSION` is an `ARG` (default 3.5) — pin deliberately; it is recorded in
  every artifact's cache key.
- Figure sizing: Pandoc emits image dimensions in `style="width..height.."`, which
  the Node sanitizer's allowlist strips. B2 render must restore size via width/height
  attrs or the rasterized PNG's natural size (do **not** re-allow `style`).
- LibreOffice concurrency: each rasterization uses an isolated
  `-env:UserInstallation` profile (gotcha C5). The worker should still cap
  `localConcurrency` for this queue.
- Image is heavy (LibreOffice). Acceptable: keeps Pandoc + LO out of the
  `node:22-alpine` app image, and isolates the LO concurrency hazard.
