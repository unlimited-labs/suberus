import { beforeEach, describe, expect, it, vi } from "vitest";

const headers = { forwardedFor: "" };

vi.mock("@/env", () => ({ env: { NODE_ENV: "production", E2E: false } }));
vi.mock("@tanstack/react-start/server", () => ({
	getRequest: () => ({
		headers: {
			get: (name: string) =>
				name === "x-forwarded-for" ? headers.forwardedFor || null : null,
		},
	}),
}));

const { allowRequest, clientKey } = await import("@/shared/server/rate-limit");

describe("clientKey", () => {
	it("takes the proxy-appended peer address, not the client-supplied prefix", () => {
		headers.forwardedFor = "1.2.3.4, 203.0.113.9";
		expect(clientKey()).toBe("203.0.113.9");
	});
});

describe("allowRequest", () => {
	beforeEach(() => {
		headers.forwardedFor = `10.0.0.${Math.floor(Math.random() * 1e6)}`;
	});

	it("allows up to max and refuses past it", () => {
		const results = [1, 2, 3].map(() => allowRequest("t", 2, 60_000));
		expect(results).toEqual([true, true, false]);
	});

	it("keys buckets per client", () => {
		expect(allowRequest("t", 1, 60_000)).toBe(true);
		expect(allowRequest("t", 1, 60_000)).toBe(false);
		headers.forwardedFor = "10.0.0.999";
		expect(allowRequest("t", 1, 60_000)).toBe(true);
	});

	it("forgets hits older than the window", () => {
		vi.useFakeTimers();
		try {
			expect(allowRequest("t", 1, 1000)).toBe(true);
			expect(allowRequest("t", 1, 1000)).toBe(false);
			vi.advanceTimersByTime(1001);
			expect(allowRequest("t", 1, 1000)).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});
});
