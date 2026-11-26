import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LLM_URL = "http://10.0.0.9:8080/v1";

vi.mock("@/env", () => ({
	env: { LLM_API_URL: LLM_URL, LLM_MODEL: "m" },
}));
vi.mock("@/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const { logger } = await import("@/logger");
const { generateWithLlm } = await import("./llm");

const call = () => generateWithLlm({ system: "s", user: "u" });

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("generateWithLlm failures", () => {
	it("keeps the upstream URL and body out of the error, but logs them", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response("secret upstream trace", { status: 500 }),
				),
		);

		const error = await call().catch((e: unknown) => e);

		expect(error).toBeInstanceOf(Error);
		expect(String(error)).toContain("500");
		expect(String(error)).not.toMatch(/10\.0\.0\.9|secret upstream trace/);
		expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).toMatch(
			/10\.0\.0\.9.*secret upstream trace/,
		);
	});

	it("keeps the upstream address out of a connection error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(
				new TypeError("fetch failed", {
					cause: new Error("connect ECONNREFUSED 10.0.0.9:8080"),
				}),
			),
		);

		const error = await call().catch((e: unknown) => e);

		expect(String(error)).not.toContain("10.0.0.9");
		expect(error).not.toHaveProperty("cause");
		expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).toContain(
			"ECONNREFUSED 10.0.0.9:8080",
		);
	});
});
