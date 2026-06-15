import { describe, expect, it } from "vitest";
import type {
	AssignmentStatus,
	ReviewDecision,
} from "@/generated/prisma/enums";
import {
	countCompletedReviews,
	DECISION_EMAIL_EVENT,
	DECISION_LETTER_TEXT,
	isReviewRoundComplete,
	reviewersDisagree,
} from "./review-completion";

const a = (status: AssignmentStatus) => ({ status });

describe("countCompletedReviews", () => {
	it("counts assigned and completed", () => {
		expect(
			countCompletedReviews([a("COMPLETED"), a("PENDING"), a("COMPLETED")]),
		).toEqual({ assigned: 3, completed: 2 });
	});

	it("handles empty list", () => {
		expect(countCompletedReviews([])).toEqual({ assigned: 0, completed: 0 });
	});

	it("only COMPLETED counts toward completed", () => {
		expect(
			countCompletedReviews([a("PENDING"), a("OVERDUE"), a("CANCELLED")]),
		).toEqual({ assigned: 3, completed: 0 });
	});
});

describe("isReviewRoundComplete", () => {
	it("is complete when all done and quorum met", () => {
		expect(isReviewRoundComplete({ assigned: 2, completed: 2 }, 2)).toBe(true);
	});

	it("is incomplete when a review is outstanding", () => {
		expect(isReviewRoundComplete({ assigned: 2, completed: 1 }, 2)).toBe(false);
	});

	it("is incomplete when quorum not met even if all assigned are done", () => {
		expect(isReviewRoundComplete({ assigned: 1, completed: 1 }, 2)).toBe(false);
	});

	it("is complete when assigned exceeds required quorum", () => {
		expect(isReviewRoundComplete({ assigned: 3, completed: 3 }, 2)).toBe(true);
	});

	it("vacuously complete when nothing required and nothing assigned", () => {
		expect(isReviewRoundComplete({ assigned: 0, completed: 0 }, 0)).toBe(true);
	});
});

describe("reviewersDisagree", () => {
	const d = (...xs: ReviewDecision[]) => xs;

	it("no disagreement with zero decisions", () => {
		expect(reviewersDisagree(d())).toBe(false);
	});

	it("no disagreement with a single decision", () => {
		expect(reviewersDisagree(d("ACCEPT"))).toBe(false);
	});

	it("no disagreement when unanimous", () => {
		expect(reviewersDisagree(d("REJECT", "REJECT"))).toBe(false);
	});

	it("disagreement when decisions differ", () => {
		expect(reviewersDisagree(d("ACCEPT", "REJECT"))).toBe(true);
	});

	it("disagreement when one of many differs", () => {
		expect(
			reviewersDisagree(d("ACCEPT", "ACCEPT", "REVISE_AND_RESUBMIT")),
		).toBe(true);
	});
});

describe("decision maps", () => {
	const decisions: ReviewDecision[] = [
		"ACCEPT",
		"ACCEPT_WITH_MINOR_REVISIONS",
		"REVISE_AND_RESUBMIT",
		"REJECT",
	];

	it("has an email event for every decision", () => {
		for (const decision of decisions) {
			expect(DECISION_EMAIL_EVENT[decision]).toBeTruthy();
		}
	});

	it("maps decisions to the expected email events", () => {
		expect(DECISION_EMAIL_EVENT).toEqual({
			ACCEPT: "DECISION_ACCEPTED",
			ACCEPT_WITH_MINOR_REVISIONS: "DECISION_CONDITIONALLY_ACCEPTED",
			REVISE_AND_RESUBMIT: "DECISION_REVISE_REQUIRED",
			REJECT: "DECISION_REJECTED",
		});
	});

	it("has non-empty letter text for every decision", () => {
		for (const decision of decisions) {
			expect(DECISION_LETTER_TEXT[decision].length).toBeGreaterThan(0);
		}
	});
});
