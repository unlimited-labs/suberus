// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJobSSE } from "./use-job-sse";

class MockEventSource {
	url: string;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;
	onopen: (() => void) | null = null;
	closed = false;
	private listeners = new Map<string, EventListener[]>();

	constructor(url: string) {
		this.url = url;
		queueMicrotask(() => this.onopen?.());
	}

	addEventListener(type: string, listener: EventListener) {
		const list = this.listeners.get(type) ?? [];
		list.push(listener);
		this.listeners.set(type, list);
	}

	removeEventListener(_type: string, _listener: EventListener) {}

	close() {
		this.closed = true;
	}

	simulateMessage(data: Record<string, unknown>) {
		this.onmessage?.(
			new MessageEvent("message", { data: JSON.stringify(data) }),
		);
	}
}

let mockES: MockEventSource | null = null;

beforeEach(() => {
	mockES = null;
	vi.stubGlobal(
		"EventSource",
		vi.fn(function (this: MockEventSource, url: string) {
			const instance = new MockEventSource(url);
			mockES = instance;
			return instance;
		}),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useJobSSE", () => {
	it("returns null status when jobId is null", () => {
		const { result } = renderHook(() => useJobSSE(null));
		expect(result.current.status).toBeNull();
		expect(result.current.connected).toBe(false);
	});

	it("opens EventSource when jobId is set", async () => {
		renderHook(() => useJobSSE("test-123"));
		await vi.waitFor(() => expect(mockES).not.toBeNull());
		expect(mockES!.url).toBe("/api/jobs/sse/test-123");
	});

	it("updates state on SSE message", async () => {
		const { result } = renderHook(() => useJobSSE("test-123"));
		await vi.waitFor(() => expect(mockES).not.toBeNull());

		act(() => {
			mockES!.simulateMessage({
				status: "running",
				stage: "embedding",
				current: 3,
				total: 10,
				error: null,
			});
		});

		expect(result.current.status).toBe("running");
		expect(result.current.stage).toBe("embedding");
		expect(result.current.current).toBe(3);
		expect(result.current.total).toBe(10);
	});

	it("closes EventSource on done status", async () => {
		const { result } = renderHook(() => useJobSSE("test-123"));
		await vi.waitFor(() => expect(mockES).not.toBeNull());

		act(() => {
			mockES!.simulateMessage({
				status: "done",
				stage: "done",
				current: 1,
				total: 1,
				error: null,
			});
		});

		expect(result.current.status).toBe("done");
		expect(result.current.connected).toBe(false);
		expect(mockES!.closed).toBe(true);
	});

	it("closes EventSource on error status", async () => {
		const { result } = renderHook(() => useJobSSE("test-123"));
		await vi.waitFor(() => expect(mockES).not.toBeNull());

		act(() => {
			mockES!.simulateMessage({
				status: "error",
				stage: "ai",
				current: 0,
				total: 1,
				error: "LLM timeout",
			});
		});

		expect(result.current.status).toBe("error");
		expect(result.current.error).toBe("LLM timeout");
		expect(mockES!.closed).toBe(true);
	});

	it("resets state when jobId changes", async () => {
		const { result, rerender } = renderHook(
			({ id }: { id: string | null }) => useJobSSE(id),
			{ initialProps: { id: "job-1" } },
		);
		await vi.waitFor(() => expect(mockES).not.toBeNull());

		act(() => {
			mockES!.simulateMessage({
				status: "running",
				stage: "clustering",
				current: 5,
				total: 10,
				error: null,
			});
		});
		expect(result.current.status).toBe("running");

		const oldES = mockES;
		rerender({ id: "job-2" });

		expect(oldES!.closed).toBe(true);
		await vi.waitFor(() => expect(mockES).not.toBe(oldES));
	});

	it("closes EventSource on unmount", async () => {
		const { unmount } = renderHook(() => useJobSSE("test-123"));
		await vi.waitFor(() => expect(mockES).not.toBeNull());

		unmount();
		expect(mockES!.closed).toBe(true);
	});
});
