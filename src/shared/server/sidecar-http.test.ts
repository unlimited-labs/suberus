import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
	env: { APP_BASE_URL: "https://amf2026.suberus.test/x" },
}));
vi.mock("@/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

const { requestOrThrow, SharedServiceBusyError } =
	await import("./sidecar-http");

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
	vi.unstubAllGlobals();
	fetchMock.mockReset();
});

describe("requestOrThrow", () => {
	it("sends the Instance host and priority next to the caller's headers", async () => {
		fetchMock.mockResolvedValue(new Response("ok"));
		await requestOrThrow(
			"http://docx/v1/diff",
			{ method: "POST", headers: { Authorization: "Bearer t" } },
			"docx-api diff",
			1000,
			"batch",
		);
		const headers: Headers = fetchMock.mock.calls[0][1].headers;
		expect(headers.get("x-suberus-instance")).toBe("amf2026.suberus.test");
		expect(headers.get("x-suberus-priority")).toBe("batch");
		expect(headers.get("authorization")).toBe("Bearer t");
	});

	it("turns a 503 into a user-safe busy error", async () => {
		fetchMock.mockResolvedValue(
			new Response("queue full", {
				status: 503,
				headers: { "Retry-After": "7" },
			}),
		);
		await expect(
			requestOrThrow(
				"http://docx/v1/idml",
				{},
				"docx-api idml",
				1000,
				"interactive",
			),
		).rejects.toBeInstanceOf(SharedServiceBusyError);
	});
});
