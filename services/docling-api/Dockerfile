FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

RUN adduser --disabled-password --no-create-home --gecos "" appuser
USER appuser

ENV PORT=8100
EXPOSE ${PORT}

CMD ["python", "main.py"]
