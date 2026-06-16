import { describe, expect, it } from "vitest";
import type { ReviewFormData } from "@/features/reviews/validations";
import {
	buildReviewDefaults,
	computeReviewProgress,
} from "./review-form-helpers";

const criteria = [{ name: "novelty" }, { name: "clarity" }];

describe("buildReviewDefaults", () => {
	it("defaults every criterion score to 3 with no initial data", () => {
		const d = buildReviewDefaults(undefined, criteria);
		expect(d.scores).toEqual({ novelty: 3, clarity: 3 });
		expect(d.decision).toBe("ACCEPT");
		expect(d.confidenceLevel).toBe(3);
		expect(d.comments).toBe("");
		expect(d.privateNotes).toBe("");
	});

	it("keeps provided scores and fills missing ones with 3", () => {
		const d = buildReviewDefaults({ scores: { novelty: 5 } }, criteria);
		expect(d.scores).toEqual({ novelty: 5, clarity: 3 });
	});

	it("carries provided scalar fields", () => {
		const d = buildReviewDefaults(
			{
				decision: "REJECT",
				confidenceLevel: 4,
				comments: "good",
				privateNotes: "note",
			},
			criteria,
		);
		expect(d).toMatchObject({
			decision: "REJECT",
			confidenceLevel: 4,
			comments: "good",
			privateNotes: "note",
		});
	});

	it("produces an empty scores map for zero criteria", () => {
		expect(buildReviewDefaults(undefined, []).scores).toEqual({});
	});
});

const values = (over: Partial<ReviewFormData> = {}): ReviewFormData => ({
	decision: "ACCEPT",
	scores: { novelty: 3, clarity: 3 },
	confidenceLevel: 3,
	comments: "",
	privateNotes: "",
	...over,
});

describe("computeReviewProgress", () => {
	it("is complete when all sections filled", () => {
		const p = computeReviewProgress(values(), criteria, true);
		expect(p.allComplete).toBe(true);
	});

	it("flags missing scores", () => {
		const p = computeReviewProgress(
			values({ scores: { novelty: 3, clarity: 0 } }),
			criteria,
			true,
		);
		expect(p.hasScores).toBe(false);
		expect(p.allComplete).toBe(false);
	});

	it("treats zero criteria as scored", () => {
		expect(computeReviewProgress(values(), [], true).hasScores).toBe(true);
	});

	it("ignores confidence when disabled", () => {
		const p = computeReviewProgress(
			values({ confidenceLevel: 0 }),
			criteria,
			false,
		);
		expect(p.hasConfidence).toBe(true);
		expect(p.allComplete).toBe(true);
	});

	it("requires confidence > 0 when enabled", () => {
		const p = computeReviewProgress(
			values({ confidenceLevel: 0 }),
			criteria,
			true,
		);
		expect(p.hasConfidence).toBe(false);
	});
});
