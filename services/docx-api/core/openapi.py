def binary(media_type: str) -> dict:
    """OpenAPI `responses=` entry for a raw-bytes 200, so the contract snapshot records it."""
    return {200: {"content": {media_type: {"schema": {"type": "string", "format": "binary"}}}}}
