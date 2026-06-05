import { test, expect } from "../helpers/base-fixtures";

// CSRF middleware (src/start.ts) protects every server function: requests that
// cannot be proven same-origin via Sec-Fetch-Site / Origin / Referer are rejected
// with 403 before the function runs. The middleware fires for any /_serverFn/*
// path ahead of function-id resolution, so an arbitrary id exercises it: a passing
// CSRF check falls through to a non-403 (the dummy id yields 500).
const SERVER_FN = "/_serverFn/probe";

test.describe("Server function CSRF protection", () => {
	test("rejects calls with a cross-site Origin", async ({ request }) => {
		const res = await request.post(SERVER_FN, {
			headers: { "Sec-Fetch-Site": "cross-site", Origin: "https://evil.example.com" },
			data: {},
		});
		expect(res.status()).toBe(403);
	});

	test("rejects calls missing origin metadata", async ({ request }) => {
		const res = await request.post(SERVER_FN, { data: {} });
		expect(res.status()).toBe(403);
	});

	test("allows same-origin calls (CSRF passes)", async ({ request }) => {
		const res = await request.post(SERVER_FN, {
			headers: { "Sec-Fetch-Site": "same-origin" },
			data: {},
		});
		expect(res.status()).not.toBe(403);
	});
});
