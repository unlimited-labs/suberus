"""Every handler that shells out to pandoc/LibreOffice must be a sync `def` so
Starlette runs it in the threadpool. Declared `async def`, the blocking
subprocess.run would sit on the single event loop and stall the whole sidecar —
including the health probe and the public signature-verification route — for the
full conversion (pandoc 120s + N x soffice 90s).

Checked per router rather than per named handler, so a new endpoint is covered
the day it is added. `routers/signing.py` is out of scope on purpose: pyHanko's
sync calls are already wrapped in `run_in_threadpool`, so its routes are
deliberately `async def`.
"""

import inspect

import pytest
from routers import diff, editor, render


@pytest.mark.parametrize("module", (diff, editor, render), ids=lambda m: m.__name__)
def test_conversion_handlers_are_not_coroutines(module):
    for route in module.router.routes:
        assert not inspect.iscoroutinefunction(route.endpoint), (
            f"{module.__name__}.{route.endpoint.__name__} must stay sync "
            "so it runs off the event loop"
        )
