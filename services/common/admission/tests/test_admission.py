import asyncio
import logging
from dataclasses import dataclass, field

import pytest

import admission
from admission import Admission, AdmissionMiddleware


class Backend:
    """Records admission order. `/hold*` blocks until its gate is set, `/listen` until disconnect."""

    def __init__(self):
        self.order: list[str] = []
        self.bodies: dict[str, bytes] = {}
        self.gates: dict[str, asyncio.Event] = {}

    def gate(self, path: str) -> asyncio.Event:
        return self.gates.setdefault(path, asyncio.Event())

    async def __call__(self, scope, receive, send):
        path = scope["path"]
        self.order.append(path)
        if path == "/boom":
            raise RuntimeError("boom")
        body = b""
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body += message.get("body", b"")
            if not message.get("more_body"):
                break
        self.bodies[path] = body
        if path == "/listen":
            await receive()
            return
        if path.startswith("/hold"):
            await self.gate(path).wait()
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})


@dataclass
class Call:
    task: asyncio.Task
    inbox: asyncio.Queue
    sent: list = field(default_factory=list)

    @property
    def status(self) -> int:
        return self.sent[0]["status"]

    def header(self, name: bytes) -> bytes | None:
        return dict(self.sent[0]["headers"]).get(name)


def call(mw, path, priority=None, instance=None, body=b"", method="POST") -> Call:
    headers = []
    if priority:
        headers.append((b"x-suberus-priority", priority.encode()))
    if instance:
        headers.append((b"x-suberus-instance", instance.encode()))
    inbox: asyncio.Queue = asyncio.Queue()
    inbox.put_nowait({"type": "http.request", "body": body, "more_body": False})
    sent: list = []

    async def send(message):
        sent.append(message)

    scope = {"type": "http", "method": method, "path": path, "headers": headers}
    return Call(asyncio.ensure_future(mw(scope, inbox.get, send)), inbox, sent)


async def until(predicate):
    async def poll():
        while not predicate():
            await asyncio.sleep(0)

    await asyncio.wait_for(poll(), 2)


def waiting(adm: Admission) -> dict:
    return adm.stats()["waiting"]


@pytest.fixture
def make(monkeypatch):
    def _make(slots=1, **env):
        monkeypatch.setenv("ADMISSION_SLOTS", str(slots))
        for name, value in env.items():
            monkeypatch.setenv(name, str(value))
        backend = Backend()
        adm = Admission(default_slots=99)
        return adm, backend, AdmissionMiddleware(backend, adm)

    return _make


def test_default_slots_when_env_unset(monkeypatch):
    monkeypatch.delenv("ADMISSION_SLOTS", raising=False)
    assert Admission(default_slots=4).slots == 4


def test_interactive_admitted_before_batch(make):
    async def go():
        adm, be, mw = make()
        hold = call(mw, "/hold")
        await until(lambda: be.order == ["/hold"])
        b = call(mw, "/b", priority="batch")
        i = call(mw, "/i", priority="interactive")
        await until(lambda: waiting(adm) == {"interactive": 1, "batch": 1})
        be.gate("/hold").set()
        await asyncio.gather(hold.task, b.task, i.task)
        assert be.order == ["/hold", "/i", "/b"]
        assert adm.in_flight == 0

    asyncio.run(go())


def test_round_robin_across_instances_fifo_within(make):
    async def go():
        adm, be, mw = make()
        hold = call(mw, "/hold")
        await until(lambda: be.order == ["/hold"])
        calls = []
        for n, (path, inst) in enumerate(
            [("/a1", "a"), ("/a2", "a"), ("/a3", "a"), ("/b1", "b"), ("/c1", "c")], start=1
        ):
            calls.append(call(mw, path, instance=inst))
            await until(lambda n=n: waiting(adm)["batch"] == n)
        be.gate("/hold").set()
        await asyncio.gather(hold.task, *(c.task for c in calls))
        assert be.order == ["/hold", "/a1", "/b1", "/c1", "/a2", "/a3"]

    asyncio.run(go())


def test_batch_gets_503_with_retry_after_after_deadline(make, caplog):
    async def go():
        adm, be, mw = make(BATCH_MAX_WAIT=0.05)
        hold = call(mw, "/hold")
        await until(lambda: be.order == ["/hold"])
        b = call(mw, "/b", instance="kpt")
        await b.task
        assert b.status == 503
        assert b.header(b"retry-after") == b"1"
        assert waiting(adm) == {"interactive": 0, "batch": 0}
        be.gate("/hold").set()
        await hold.task
        assert be.order == ["/hold"]

    with caplog.at_level(logging.WARNING, logger="admission"):
        asyncio.run(go())
    assert "admission 503 instance=kpt class=batch" in caplog.text


def test_batch_depth_limit_rejects_immediately(make):
    async def go():
        adm, be, mw = make(BATCH_MAX_DEPTH=2, BATCH_MAX_WAIT=30)
        hold = call(mw, "/hold")
        await until(lambda: be.order == ["/hold"])
        queued = [call(mw, "/q1"), call(mw, "/q2")]
        await until(lambda: waiting(adm)["batch"] == 2)
        over = call(mw, "/over")
        await asyncio.wait_for(over.task, 1)
        assert over.status == 503
        interactive = call(mw, "/i", priority="interactive")
        await until(lambda: waiting(adm)["interactive"] == 1)
        be.gate("/hold").set()
        await asyncio.gather(hold.task, interactive.task, *(c.task for c in queued))
        assert be.order == ["/hold", "/i", "/q1", "/q2"]

    asyncio.run(go())


def test_interactive_gets_503_after_its_deadline(make):
    async def go():
        adm, be, mw = make(INTERACTIVE_MAX_WAIT=0.05, BATCH_MAX_WAIT=30)
        hold = call(mw, "/hold")
        await until(lambda: be.order == ["/hold"])
        i = call(mw, "/i", priority="interactive")
        await i.task
        assert i.status == 503
        assert i.header(b"retry-after") == b"1"
        be.gate("/hold").set()
        await hold.task

    asyncio.run(go())


def test_slot_released_when_app_raises(make):
    async def go():
        adm, be, mw = make()
        with pytest.raises(RuntimeError):
            await call(mw, "/boom").task
        assert adm.in_flight == 0
        ok = call(mw, "/ok")
        await ok.task
        assert ok.status == 200

    asyncio.run(go())


def test_slot_released_when_admitted_client_disconnects(make):
    async def go():
        adm, be, mw = make()
        listen = call(mw, "/listen")
        await until(lambda: "/listen" in be.bodies)
        assert adm.in_flight == 1
        listen.inbox.put_nowait({"type": "http.disconnect"})
        await listen.task
        assert adm.in_flight == 0

    asyncio.run(go())


def test_disconnected_waiter_leaves_queue(make):
    async def go():
        adm, be, mw = make(BATCH_MAX_WAIT=30)
        hold = call(mw, "/hold")
        await until(lambda: be.order == ["/hold"])
        w = call(mw, "/w")
        await until(lambda: waiting(adm)["batch"] == 1)
        w.inbox.put_nowait({"type": "http.disconnect"})
        await w.task
        assert w.sent == []
        assert waiting(adm)["batch"] == 0
        be.gate("/hold").set()
        await hold.task
        assert be.order == ["/hold"]
        assert adm.in_flight == 0

    asyncio.run(go())


def test_cancelled_waiter_leaves_queue(make):
    async def go():
        adm, be, mw = make(BATCH_MAX_WAIT=30)
        hold = call(mw, "/hold")
        await until(lambda: be.order == ["/hold"])
        w = call(mw, "/w")
        await until(lambda: waiting(adm)["batch"] == 1)
        w.task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await w.task
        assert waiting(adm)["batch"] == 0
        be.gate("/hold").set()
        await hold.task
        assert adm.in_flight == 0

    asyncio.run(go())


def test_body_read_while_waiting_is_replayed(make):
    async def go():
        adm, be, mw = make(BATCH_MAX_WAIT=30)
        hold = call(mw, "/hold")
        await until(lambda: be.order == ["/hold"])
        w = call(mw, "/w", body=b"payload")
        await until(lambda: w.inbox.empty())
        be.gate("/hold").set()
        await asyncio.gather(hold.task, w.task)
        assert w.status == 200
        assert be.bodies["/w"] == b"payload"

    asyncio.run(go())


def test_health_bypasses_queue_and_reports_stats(make):
    async def go():
        adm, be, mw = make(BATCH_MAX_WAIT=30)
        hold = call(mw, "/hold", instance="kpt")
        await until(lambda: be.order == ["/hold"])
        waiters = [call(mw, "/w1", instance="kpt"), call(mw, "/w2")]
        await until(lambda: waiting(adm)["batch"] == 2)
        health = call(mw, "/", method="GET")
        await asyncio.wait_for(health.task, 1)
        assert health.status == 200
        stats = adm.stats()
        assert stats["slots"] == 1
        assert stats["inFlight"] == 1
        assert stats["waiting"] == {"interactive": 0, "batch": 2}
        assert stats["waitingByInstance"] == {
            "kpt": {"interactive": 0, "batch": 1},
            "unknown": {"interactive": 0, "batch": 1},
        }
        assert stats["oldestWaitS"] >= 0
        be.gate("/hold").set()
        await asyncio.gather(hold.task, *(w.task for w in waiters))
        assert adm.stats()["oldestWaitS"] is None

    asyncio.run(go())


def test_long_wait_logged(make, monkeypatch, caplog):
    monkeypatch.setattr(admission, "SLOW_WAIT_S", 0.0)

    async def go():
        adm, be, mw = make(BATCH_MAX_WAIT=30)
        hold = call(mw, "/hold")
        await until(lambda: be.order == ["/hold"])
        w = call(mw, "/w", priority="interactive", instance="kpt")
        await until(lambda: waiting(adm)["interactive"] == 1)
        be.gate("/hold").set()
        await asyncio.gather(hold.task, w.task)

    with caplog.at_level(logging.WARNING, logger="admission"):
        asyncio.run(go())
    assert "admission slow instance=kpt class=interactive" in caplog.text
