FROM python:3.12-slim AS base

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project --no-dev

COPY main.py ./

RUN adduser --disabled-password --no-create-home --gecos "" appuser
USER appuser

ENV PORT=8110 \
    PATH="/app/.venv/bin:$PATH"
EXPOSE ${PORT}

CMD ["python", "main.py"]
