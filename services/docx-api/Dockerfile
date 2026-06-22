# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS runtime

# Pinned Pandoc (participates in the artifact cache key — bump deliberately).
ARG PANDOC_VERSION=3.5

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl \
        libreoffice-core libreoffice-writer libreoffice-draw \
        fonts-dejavu-core fonts-liberation \
    && curl -fsSL -o /tmp/pandoc.deb \
        "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-1-amd64.deb" \
    && dpkg -i /tmp/pandoc.deb \
    && rm -f /tmp/pandoc.deb \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
        "fastapi==0.115.*" \
        "uvicorn[standard]==0.32.*" \
        "python-multipart==0.0.*" \
        "Pillow==11.*" \
        "xmldiff==3.0.*" \
        "lxml>=5,<7" \
        "olefile==0.47.*"

RUN adduser --disabled-password --gecos "" appuser
WORKDIR /app
COPY --chown=appuser:appuser main.py diffhtml.py mathtype.py stylecss.py ./
USER appuser

ENV PORT=8101
EXPOSE 8101

CMD ["python", "main.py"]
