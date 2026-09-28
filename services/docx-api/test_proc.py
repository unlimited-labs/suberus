import subprocess
import time
from pathlib import Path

import pytest

from core.proc import run


def _alive(pid: int) -> bool:
    stat = Path(f"/proc/{pid}/stat")
    return stat.exists() and stat.read_text().split()[2] != "Z"


def test_timeout_kills_grandchildren(tmp_path):
    pidfile = tmp_path / "pid"
    with pytest.raises(subprocess.TimeoutExpired):
        run(["sh", "-c", f"sleep 60 & echo $! > {pidfile}; wait"], timeout=1)
    time.sleep(0.2)
    assert not _alive(int(pidfile.read_text()))
