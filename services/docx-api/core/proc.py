"""Thin subprocess runner shared by every shell-out (pandoc / LibreOffice)."""

import os
import signal
import subprocess


def run(cmd: list[str], *, timeout: float | None = None) -> subprocess.CompletedProcess:
    # Own process group: LibreOffice's oosplash forks soffice.bin, which a plain
    # timeout kill would orphan.
    with subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True
    ) as proc:
        try:
            stdout, stderr = proc.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.communicate()
            raise
    return subprocess.CompletedProcess(cmd, proc.returncode, stdout, stderr)
