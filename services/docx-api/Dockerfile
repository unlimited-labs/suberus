# syntax=docker/dockerfile:1.7
# Pinned Pandoc (participates in the artifact cache key — bump deliberately).
FROM scratch AS pandoc
ARG PANDOC_VERSION=3.5
ADD https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-1-amd64.deb /pandoc.deb

FROM python:3.14-slim AS system

# tini reaps the gpg helpers LibreOffice daemonizes on every conversion.
RUN --mount=type=bind,from=pandoc,source=/pandoc.deb,target=/tmp/pandoc.deb \
    apt-get update && apt-get install -y --no-install-recommends \
        libreoffice-core libreoffice-writer libreoffice-draw \
        fonts-dejavu-core fonts-liberation \
        tini /tmp/pandoc.deb \
    && rm -rf /var/lib/apt/lists/*

RUN adduser --disabled-password --gecos "" appuser

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

WORKDIR /app

ENTRYPOINT ["tini", "--"]

# --------------------------------------------------------------------------- #
# Test image: same pinned toolchain (Pandoc + LibreOffice) + test/gen deps.    #
# Runs as root so golden updates write back through a mounted volume.          #
#   docker build --target test -t suberus-docx-api-test .                      #
#   docker run --rm -v "$PWD:/app" -w /app suberus-docx-api-test pytest -q     #
# --------------------------------------------------------------------------- #
FROM system AS test
RUN --mount=from=ghcr.io/astral-sh/uv:latest,source=/uv,target=/usr/local/bin/uv \
    --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync --frozen --no-install-project --extra test
CMD ["pytest", "-q"]

FROM system AS runtime
RUN --mount=from=ghcr.io/astral-sh/uv:latest,source=/uv,target=/usr/local/bin/uv \
    --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync --frozen --no-install-project
COPY main.py config.py omml.py diffhtml.py mathtype.py stylecss.py htmlesc.py ooxml.py signing.py ./
COPY core/ ./core/
COPY routers/ ./routers/
USER appuser

ENV PORT=8101
EXPOSE 8101

CMD ["python", "main.py"]
