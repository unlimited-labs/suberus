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

## MathType equations (pre-pandoc conversion)

Pandoc converts native Office Math (OMML) but **drops MathType equations**, which Word
stores as OLE objects (`word/embeddings/oleObject*.bin`, ProgID `Equation.DSMT4`/
`Equation.3`); they survive only as an oversized fallback image. `mathtype.py` runs
**before** pandoc: it decodes each OLE's MTEF v5 binary to LaTeX (clean-room, pure
Python via `olefile` + an MTEF reader — see
[the spec](https://rtf2latex2e.sourceforge.net/MTEF5.html)) and rewrites the equation
run into a sentinel token. After pandoc, the sentinel becomes a
`<span class="math …">\(…\)</span>` span — the same shape pandoc emits for native
equations — which the Node worker's KaTeX pass renders. Conversion is **lossless-or-skip**:
anything it can't decode confidently (MTEF v3, matrices, accents, unknown glyphs) is left
as its fallback image. Recorded in `NORMALIZER_CONFIG` (`mathtype`) + `SCHEMA_VERSION`, so
enabling it re-extracts artifacts under a new cache key rather than mutating history.

## Regression baseline (golden tests)

`test_baseline.py` / `test_diff_baseline.py` run representative `.docx` fixtures
through the **real** pipeline (`_normalize` + `diff_html`) and pin the output —
so a stack change (Pandoc/LibreOffice bump, schema change, dep update) shows up
as a reviewable golden diff instead of silently altering conversions.

- **Generated fixtures** (`test_fixtures/docs/`, via `test_fixtures/generate_fixtures.py`):
  text formatting/alignment/fonts, lists (incl. paren-delimited), tables (`<th>`,
  merges, centered cells), images, native Word equations (OMML), an embedded
  real MathType OLE, headings/Title recovery, and a v1/v2 kitchen-sink for the
  redline.
- **Human-supplied fixtures** (`test_fixtures/real/` — see its README): autoshapes/
  text boxes, EMF/WMF vector images, real MathType/Word equations. Tests skip
  until the files exist.
- Goldens live in `test_fixtures/golden/` (`*.html` with figure SHAs canonicalized
  to ordinals, `*.css`, `*.figures.json` manifest, `*.redline.html`).

These need Pandoc + LibreOffice, so run them in the pinned test image:

```bash
./run-tests.sh                          # run against committed goldens
./run-tests.sh -e UPDATE_BASELINE=1     # refresh goldens after an intentional change, then review the diff
./run-tests.sh gen                      # regenerate the generated .docx fixtures
```

(`run-tests.sh` builds the `test` Docker stage — same pinned toolchain + pytest +
python-docx — and mounts this dir so golden updates write back.)

## Code quality (lint + complexity)

`fallow` is TS/JS-only, so Python uses **ruff** + **radon** (config in
`pyproject.toml`, advisory, not in `run-tests.sh`):

```bash
uvx ruff check .
uvx radon cc -s -n C .
uvx radon mi .
```

## Notes / TODO

- `PANDOC_VERSION` is an `ARG` (default 3.5) — pin deliberately; it is recorded in
  every artifact's cache key.
- Figure sizing: Pandoc emits image dimensions in `style="width..height.."` (inches),
  which the Node sanitizer's allowlist strips. `_hoist_img_dims` converts them to
  unitless-px `width`/`height` attributes (which survive sanitization) before the
  bundle leaves — do **not** re-allow `style`. Recorded in `NORMALIZER_CONFIG`
  (`imgDims`), so the cache key changes when this recipe changes.
- LibreOffice concurrency: each rasterization uses an isolated
  `-env:UserInstallation` profile (gotcha C5). The worker should still cap
  `localConcurrency` for this queue.
- Image is heavy (LibreOffice). Acceptable: keeps Pandoc + LO out of the
  `node:22-alpine` app image, and isolates the LO concurrency hazard.
