"""Every handler that shells out to pandoc/LibreOffice must be a sync `def` so
Starlette runs it in the threadpool. Declared `async def`, the blocking
subprocess.run would sit on the single event loop and stall the whole sidecar —
including the health probe and the public signature-verification route — for the
full conversion (pandoc 120s + N x soffice 90s).
"""

import inspect

from routers import diff, editor, render


def test_conversion_handlers_are_not_coroutines():
    for handler in (diff.normalize_endpoint, render.render_pdf, editor.ast):
        assert not inspect.iscoroutinefunction(handler), (
            f"{handler.__name__} must stay sync so it runs off the event loop"
        )
