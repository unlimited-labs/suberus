import { describe, expect, it } from "vitest";
import type { UserSubmissionReview } from "@/features/submissions/api/submissions";
import {
	computeReviewSummary,
	computeReviewsAggregate,
	getScoreColor,
	scoreGridClassName,
} from "./reviews-card-helpers";

// `createdAt` is typed Date but arrives as a string over the wire, which
// computeReviewSummary normalizes — so the factory allows either.
type ReviewOverrides = Partial<Omit<UserSubmissionReview, "createdAt">> & {
	createdAt?: Date | string;
};

const review = (over: ReviewOverrides = {}): UserSubmissionReview =>
	({
		id: "r1",
		submissionId: "s1",
		round: 1,
		reviewerName: "Rev",
		scores: null,
		comments: null,
		attachment: null,
		createdAt: new Date("2026-01-01"),
		...over,
	}) as UserSubmissionReview;

describe("getScoreColor", () => {
	it("bands scores green/blue/amber/red", () => {
		expect(getScoreColor(5).bar).toBe("bg-emerald-500");
		expect(getScoreColor(4).bar).toBe("bg-sky-500");
		expect(getScoreColor(3).bar).toBe("bg-amber-500");
		expect(getScoreColor(1).bar).toBe("bg-red-500");
	});
});

describe("scoreGridClassName", () => {
	it("scales columns with the criterion count", () => {
		expect(scoreGridClassName(4)).toBe("md:grid-cols-4");
		expect(scoreGridClassName(2)).toBe("md:grid-cols-2");
		expect(scoreGridClassName(1)).toBe("");
	});
});

describe("computeReviewSummary", () => {
	it("derives entries, average and flags from a scored review", () => {
		const s = computeReviewSummary(
			review({
				scores: { novelty: 4, clarity: 2 },
				comments: "good",
				attachment: {
					id: "f",
					fileName: "a.pdf",
					originalName: "a.pdf",
					size: 1,
				},
			}),
		);
		expect(s.scoreEntries).toEqual([
			["novelty", 4],
			["clarity", 2],
		]);
		expect(s.reviewAvg).toBe(3);
		expect(s.hasComments).toBe(true);
		expect(s.hasAttachment).toBe(true);
	});

	it("handles a review with no scores", () => {
		const s = computeReviewSummary(review({}));
		expect(s.scoreEntries).toEqual([]);
		expect(s.reviewAvg).toBe(0);
		expect(s.hasComments).toBe(false);
		expect(s.hasAttachment).toBe(false);
	});

	it("parses a string createdAt into a Date", () => {
		const s = computeReviewSummary(review({ createdAt: "2026-03-04" }));
		expect(s.createdAt).toEqual(new Date("2026-03-04"));
	});
});

describe("computeReviewsAggregate", () => {
	it("averages scores across all reviews", () => {
		const agg = computeReviewsAggregate([
			review({ scores: { a: 4, b: 2 } }),
			review({ scores: { a: 3 } }),
		]);
		expect(agg.hasScores).toBe(true);
		expect(agg.avgScore).toBe(3);
	});

	it("reports no scores when none are present", () => {
		const agg = computeReviewsAggregate([review({}), review({})]);
		expect(agg.hasScores).toBe(false);
		expect(agg.avgScore).toBe(0);
	});
});
