# syntax=docker/dockerfile:1.7
FROM python:3.14-slim AS base

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app


# Only the torch and model-tool pins leave this stage, so the heavy layers below are keyed
# on those versions instead of on every uv.lock change.
FROM base AS reqs
RUN --mount=from=ghcr.io/astral-sh/uv:latest,source=/uv,target=/usr/local/bin/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv export --frozen --no-dev --no-emit-project --no-hashes --no-header --no-annotate > /all.txt \
    && grep -E '^(torch|torchvision)==' /all.txt > /torch.txt \
    && grep -E '^(docling|easyocr)==' /all.txt > /models.txt


FROM base AS models
COPY --from=reqs /torch.txt /models.txt /tmp/
RUN --mount=from=ghcr.io/astral-sh/uv:latest,source=/uv,target=/usr/local/bin/uv \
    --mount=type=cache,target=/root/.cache/uv \
    echo "opencv-python ; sys_platform == 'never'" > /tmp/overrides.txt \
    && uv venv /tmp/venv \
    && uv pip install --python /tmp/venv/bin/python --override /tmp/overrides.txt \
        --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple \
        --index-strategy unsafe-best-match -r /tmp/torch.txt -r /tmp/models.txt \
    && /tmp/venv/bin/docling-tools models download layout tableformer code_formula easyocr \
        --output-dir /opt/docling/models \
    && rm -rf /opt/docling/models/docling-project--docling-layout-heron-onnx


FROM base AS runtime

# Pinned Pandoc (markdown -> HTML for the diff /bundle; participates in the artifact
# cache key as pandocVersion — bump deliberately, mirror docx-api).
ARG PANDOC_VERSION=3.5
ADD https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-1-amd64.deb /tmp/pandoc.deb

RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 /tmp/pandoc.deb \
    && rm -rf /var/lib/apt/lists/* /tmp/pandoc.deb \
    && pandoc --version

RUN adduser --disabled-password --gecos "" appuser

COPY --from=reqs /torch.txt /tmp/torch.txt
RUN --mount=from=ghcr.io/astral-sh/uv:latest,source=/uv,target=/usr/local/bin/uv \
    --mount=type=cache,target=/root/.cache/uv \
    uv venv /app/.venv \
    && uv pip install --python /app/.venv/bin/python --no-deps \
        --index-url https://download.pytorch.org/whl/cpu -r /tmp/torch.txt

COPY --from=models /opt/docling/models /opt/docling/models

RUN --mount=from=ghcr.io/astral-sh/uv:latest,source=/uv,target=/usr/local/bin/uv \
    --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync --frozen --no-dev --no-install-project

COPY main.py bundle_meta.py ./

USER appuser

ENV PATH="/app/.venv/bin:$PATH" \
    DOCLING_ARTIFACTS_PATH=/opt/docling/models \
    PORT=8100

EXPOSE 8100

CMD ["python", "main.py"]
