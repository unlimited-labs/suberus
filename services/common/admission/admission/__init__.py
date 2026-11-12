import asyncio
import logging
import math
import os
import threading
import time
from collections import OrderedDict, deque
from dataclasses import dataclass, field

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

INTERACTIVE = "interactive"
BATCH = "batch"
SLOW_WAIT_S = 5.0
# shortcut: a waiter's disconnect is seen only while its buffered body stays under this;
# past it the rest is left to TCP back-pressure and the dead client surfaces once admitted.
PEEK_LIMIT_BYTES = 1024 * 1024

log = logging.getLogger("admission")


@dataclass(eq=False)
class _Waiter:
    cls: str
    key: str
    since: float = field(default_factory=time.monotonic)
    granted: asyncio.Future = field(
        default_factory=lambda: asyncio.get_running_loop().create_future()
    )


class Admission:
    """Slot pool: interactive before batch, round-robin over Instance keys within a class."""

    def __init__(self, default_slots: int):
        self.slots = int(os.getenv("ADMISSION_SLOTS", default_slots))
        self.max_wait = {
            INTERACTIVE: float(os.getenv("INTERACTIVE_MAX_WAIT", "20")),
            BATCH: float(os.getenv("BATCH_MAX_WAIT", "10")),
        }
        self.batch_max_depth = int(os.getenv("BATCH_MAX_DEPTH", "50"))
        self.in_flight = 0
        self._queues: dict[str, OrderedDict[str, deque[_Waiter]]] = {
            INTERACTIVE: OrderedDict(),
            BATCH: OrderedDict(),
        }
        # Health handlers are sync `def`, so stats() runs on a threadpool thread.
        self._lock = threading.Lock()

    def _depth(self, cls: str) -> int:
        return sum(map(len, self._queues[cls].values()))

    def enqueue(self, cls: str, key: str) -> _Waiter | None:
        with self._lock:
            if cls == BATCH and self._depth(BATCH) >= self.batch_max_depth:
                return None
            waiter = _Waiter(cls, key)
            self._queues[cls].setdefault(key, deque()).append(waiter)
            self._dispatch()
            return waiter

    def leave(self, waiter: _Waiter) -> None:
        with self._lock:
            if waiter.granted.done():
                self._release()
                return
            queue = self._queues[waiter.cls][waiter.key]
            queue.remove(waiter)
            if not queue:
                del self._queues[waiter.cls][waiter.key]

    def release(self) -> None:
        with self._lock:
            self._release()

    def _release(self) -> None:
        self.in_flight -= 1
        self._dispatch()

    def _dispatch(self) -> None:
        while self.in_flight < self.slots:
            keys = self._queues[INTERACTIVE] or self._queues[BATCH]
            if not keys:
                return
            key, queue = next(iter(keys.items()))
            waiter = queue.popleft()
            if queue:
                keys.move_to_end(key)
            else:
                del keys[key]
            self.in_flight += 1
            waiter.granted.set_result(None)

    def stats(self) -> dict:
        with self._lock:
            now = time.monotonic()
            by_instance: dict[str, dict[str, int]] = {}
            heads = []
            for cls, keys in self._queues.items():
                for key, queue in keys.items():
                    by_instance.setdefault(key, {INTERACTIVE: 0, BATCH: 0})[cls] = len(queue)
                    heads.append(queue[0].since)
            return {
                "slots": self.slots,
                "inFlight": self.in_flight,
                "waiting": {cls: self._depth(cls) for cls in self._queues},
                "waitingByInstance": by_instance,
                "oldestWaitS": round(now - min(heads), 3) if heads else None,
            }


class _Peek:
    """Reads the request while it waits, so a disconnect drops it from the queue; replays it after."""

    def __init__(self, receive: Receive):
        self.receive = receive
        self.buffered: deque[Message] = deque()
        self.size = 0
        self.reader: asyncio.Task | None = None
        self.disconnected = False

    def pending(self) -> set[asyncio.Task]:
        if self.reader is None and self.size <= PEEK_LIMIT_BYTES:
            self.reader = asyncio.ensure_future(self.receive())
        return set() if self.reader is None else {self.reader}

    def take(self) -> None:
        if self.reader is None or not self.reader.done():
            return
        message = self.reader.result()
        self.reader = None
        if message["type"] == "http.disconnect":
            self.disconnected = True
            return
        self.buffered.append(message)
        self.size += len(message.get("body", b""))

    async def replay(self) -> Message:
        if self.buffered:
            return self.buffered.popleft()
        if self.reader is not None:
            task, self.reader = self.reader, None
            return await task
        return await self.receive()

    def close(self) -> None:
        if self.reader is not None:
            self.reader.cancel()


class AdmissionMiddleware:
    """Pure ASGI so a request queues before anything reads its body. `GET /` is never queued."""

    def __init__(self, app: ASGIApp, admission: Admission):
        self.app = app
        self.admission = admission

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["path"] == "/":
            await self.app(scope, receive, send)
            return
        headers = dict(scope["headers"])
        priority = headers.get(b"x-suberus-priority", b"").strip().lower()
        cls = INTERACTIVE if priority == b"interactive" else BATCH
        key = headers.get(b"x-suberus-instance", b"").decode("latin-1").strip() or "unknown"
        adm = self.admission

        waiter = adm.enqueue(cls, key)
        if waiter is None:
            await self._reject(scope, receive, send, cls, key, 0.0)
            return

        deadline = waiter.since + adm.max_wait[cls]
        peek = _Peek(receive)
        try:
            while not waiter.granted.done() and not peek.disconnected:
                timeout = deadline - time.monotonic()
                if timeout <= 0:
                    break
                await asyncio.wait(
                    {waiter.granted, *peek.pending()},
                    timeout=timeout,
                    return_when=asyncio.FIRST_COMPLETED,
                )
                if not waiter.granted.done():
                    peek.take()
        except BaseException:
            adm.leave(waiter)
            peek.close()
            raise

        waited = time.monotonic() - waiter.since
        if not waiter.granted.done():
            adm.leave(waiter)
            peek.close()
            if not peek.disconnected:
                await self._reject(scope, receive, send, cls, key, waited)
            return
        if waited > SLOW_WAIT_S:
            log.warning("admission slow instance=%s class=%s waited=%.1fs", key, cls, waited)

        try:
            await self.app(scope, peek.replay, send)
        finally:
            adm.release()
            peek.close()

    async def _reject(
        self, scope: Scope, receive: Receive, send: Send, cls: str, key: str, waited: float
    ) -> None:
        log.warning("admission 503 instance=%s class=%s waited=%.1fs", key, cls, waited)
        retry_after = str(max(1, math.ceil(self.admission.max_wait[cls])))
        response = JSONResponse(
            {"detail": "Service busy, retry later"},
            status_code=503,
            headers={"Retry-After": retry_after},
        )
        await response(scope, receive, send)
