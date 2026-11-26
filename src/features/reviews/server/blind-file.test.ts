import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/settings/server/settings", () => ({
	getSetting: vi.fn(),
}));

const { getSetting } = await import("@/features/settings/server/settings");
const { blindDownloadName } = await import("./blind-file");

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

const asReviewer = (version: number) =>
	({ hide: "author", submissionType: "FULL_PAPER", version }) as const;
const asAuthor = { hide: "reviewer", submissionType: "ABSTRACT" } as const;

describe("blindDownloadName for a reviewer", () => {
	it("replaces the author-derived name in double-blind review", async () => {
		reviewMode("DOUBLE_BLIND");

		await expect(
			blindDownloadName("Jan_Kowalski_et_al.docx", asReviewer(2)),
		).resolves.toBe("v2.docx");
	});

	it("keeps the original name in single-blind review", async () => {
		reviewMode("SINGLE_BLIND");

		await expect(
			blindDownloadName("Jan_Kowalski.pdf", asReviewer(1)),
		).resolves.toBe("Jan_Kowalski.pdf");
	});
});

describe("blindDownloadName for an author reading a review attachment", () => {
	it("hides the reviewer's file name in single-blind review", async () => {
		reviewMode("SINGLE_BLIND");

		await expect(
			blindDownloadName("review_Smith.docx", asAuthor),
		).resolves.toBe("review.docx");
	});

	it("keeps the reviewer's file name in open review", async () => {
		reviewMode("OPEN");

		await expect(
			blindDownloadName("review_Smith.docx", asAuthor),
		).resolves.toBe("review_Smith.docx");
	});
});

describe("reviewAttachmentName", () => {
	it("drops an extension that is not a supported file type", async () => {
		const { reviewAttachmentName } = await import("./blind-file");

		expect(reviewAttachmentName("Uwagi_dr.Nowak")).toBe("review");
		expect(reviewAttachmentName("Review_Smith.PDF")).toBe("review.pdf");
	});
});
