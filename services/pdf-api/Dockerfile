# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never \
    DOCLING_ARTIFACTS_PATH=/opt/docling/models \
    EASYOCR_MODULE_PATH=/opt/docling/easyocr

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# Pre-download docling models (layout, table). EasyOCR weights download lazily on first OCR.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv run docling-tools models download --output-dir "${DOCLING_ARTIFACTS_PATH}" \
    && mkdir -p "${EASYOCR_MODULE_PATH}/model"


FROM python:3.12-slim AS runtime

# Pinned Pandoc (markdown -> HTML for the diff /bundle; participates in the artifact
# cache key as pandocVersion — bump deliberately, mirror docx-api).
ARG PANDOC_VERSION=3.5

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 ca-certificates curl \
    && curl -fsSL -o /tmp/pandoc.deb \
        "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-1-amd64.deb" \
    && dpkg -i /tmp/pandoc.deb \
    && rm -f /tmp/pandoc.deb \
    && rm -rf /var/lib/apt/lists/* \
    && pandoc --version

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv
COPY --from=builder --chown=appuser:appuser /opt/docling /opt/docling
COPY --chown=appuser:appuser main.py bundle_meta.py test_bundle_meta.py ./

USER appuser

ENV PATH="/app/.venv/bin:$PATH" \
    DOCLING_ARTIFACTS_PATH=/opt/docling/models \
    EASYOCR_MODULE_PATH=/opt/docling/easyocr \
    PORT=8100

EXPOSE 8100

CMD ["python", "main.py"]
