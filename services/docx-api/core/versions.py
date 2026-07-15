"""Toolchain version probes. `libreoffice_version` folds into NORMALIZER_CONFIG_HASH,
so an LO upgrade that changes figure rasterization invalidates the artifact cache."""

from functools import lru_cache
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as _pkg_version

from core.proc import run


@lru_cache(maxsize=1)
def pandoc_version() -> str | None:
    try:
        out = run(["pandoc", "--version"], timeout=10).stdout.decode(errors="replace")
        return out.splitlines()[0].split()[1] if out else None
    except Exception:
        return None


@lru_cache(maxsize=1)
def libreoffice_version() -> str | None:
    try:
        out = run(["soffice", "--version"], timeout=30).stdout.decode(errors="replace")
        return out.splitlines()[0].strip() if out else None
    except Exception:
        return None


def xmldiff_version() -> str | None:
    try:
        return _pkg_version("xmldiff")
    except PackageNotFoundError:
        return None
