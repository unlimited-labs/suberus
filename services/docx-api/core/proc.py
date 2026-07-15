"""Thin subprocess runner shared by every shell-out (pandoc / LibreOffice)."""

import subprocess


def run(
    cmd: list[str], *, timeout: float | None = None, **kw
) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, timeout=timeout, **kw)
