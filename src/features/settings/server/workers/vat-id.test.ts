import type { Job } from "pg-boss";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VatIdRetryJobData } from "../vat-id-check";

const checkVatId = vi.fn();
vi.mock("../vat-id-check", () => ({
	checkVatId,
	purgeOrphanVatIdChecks: vi.fn(),
	VAT_ID_RETRY_QUEUE: "vat-id-retry",
}));
vi.mock("@/logger.ts", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { handleVatIdRetry } = await import("./vat-id");

const since = Date.parse("2026-11-08T00:00:00Z");
const job = {
	data: { vatId: "DE136695976", since: new Date(since).toISOString() },
};
// SAFETY: handleVatIdRetry reads only `data` from each job.
const jobs = [job] as unknown as Job<VatIdRetryJobData>[];

beforeEach(() => vi.clearAllMocks());

describe("handleVatIdRetry", () => {
	it("re-checks bypassing the cache and fails the job while the registry is down", async () => {
		checkVatId.mockResolvedValue({ status: "UNAVAILABLE" });

		await expect(handleVatIdRetry(jobs, since + 60_000)).rejects.toThrow();
		expect(checkVatId).toHaveBeenCalledWith("DE136695976", { fromRetry: true });
	});

	it("completes once the registry answers", async () => {
		checkVatId.mockResolvedValue({ status: "VERIFIED" });
		await expect(
			handleVatIdRetry(jobs, since + 60_000),
		).resolves.toBeUndefined();
	});

	it("gives up after 72 hours", async () => {
		checkVatId.mockResolvedValue({ status: "UNAVAILABLE" });
		await expect(
			handleVatIdRetry(jobs, since + 72 * 60 * 60 * 1000),
		).resolves.toBeUndefined();
	});
});
