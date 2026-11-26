import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/settings/server/settings", () => ({
	getSetting: vi.fn(),
}));

const { getSetting } = await import("@/features/settings/server/settings");
const { reviewerDownloadName } = await import("./blind-file");

const reviewMode = (mode: "OPEN" | "SINGLE_BLIND" | "DOUBLE_BLIND") =>
	vi.mocked(getSetting).mockResolvedValue({
		reviewMode: mode,
		contentFormat: "PLAIN",
		enableScoring: false,
		scoringCriteria: [],
		enableConfidenceLevel: false,
		enableReviewAttachment: true,
	});

beforeEach(() => vi.clearAllMocks());

describe("reviewerDownloadName", () => {
	it("replaces the author-derived name in double-blind review", async () => {
		reviewMode("DOUBLE_BLIND");

		await expect(
			reviewerDownloadName("Jan_Kowalski_et_al.docx", "FULL_PAPER", 2),
		).resolves.toBe("v2.docx");
	});

	it("keeps the original name in single-blind review", async () => {
		reviewMode("SINGLE_BLIND");

		await expect(
			reviewerDownloadName("Jan_Kowalski.pdf", "ABSTRACT", 1),
		).resolves.toBe("Jan_Kowalski.pdf");
	});
});
