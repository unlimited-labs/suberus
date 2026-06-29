import { describe, expect, it } from "vitest";
import {
	computeReviewProgress,
	filterReviewsByRound,
	getActionAvailability,
	getPrimaryAction,
	getReviewRounds,
	hasRevisionUpload,
	isOverdue,
	resolveDisplayedVersion,
} from "./availability";

describe("isOverdue", () => {
	const past = new Date("2000-01-01T00:00:00Z");
	const future = new Date("2999-01-01T00:00:00Z");

	it("is false when deadline is null", () => {
		expect(isOverdue(null, "PENDING")).toBe(false);
	});

	it("is false for COMPLETED or CANCELLED regardless of deadline", () => {
		expect(isOverdue(past, "COMPLETED")).toBe(false);
		expect(isOverdue(past, "CANCELLED")).toBe(false);
	});

	it("is true for a past deadline on an active assignment", () => {
		expect(isOverdue(past, "PENDING")).toBe(true);
	});

	it("is false for a future deadline", () => {
		expect(isOverdue(future, "PENDING")).toBe(false);
	});
});

describe("getActionAvailability", () => {
	const config = { requiresEditorDecision: true };

	it("allows assign + desk decisions on a SUBMITTED non-exhibitor", () => {
		const a = getActionAvailability(
			{ type: "ABSTRACT", status: "SUBMITTED" },
			config,
		);
		expect(a.canAssignReviewers).toBe(true);
		expect(a.canDeskAccept).toBe(true);
		expect(a.canDeskReject).toBe(true);
		expect(a.canMakeDecision).toBe(false);
	});

	it("excludes EXHIBITOR from assign, desk, and override", () => {
		const a = getActionAvailability(
			{ type: "EXHIBITOR", status: "SUBMITTED" },
			config,
		);
		expect(a.canAssignReviewers).toBe(false);
		expect(a.canDeskAccept).toBe(false);
		expect(a.canDeskReject).toBe(false);

		const accepted = getActionAvailability(
			{ type: "EXHIBITOR", status: "ACCEPTED" },
			config,
		);
		expect(accepted.canOverrideDecision).toBe(false);
	});

	it("allows assign on UNDER_REVIEW and RESUBMITTED", () => {
		expect(
			getActionAvailability(
				{ type: "ABSTRACT", status: "UNDER_REVIEW" },
				config,
			).canAssignReviewers,
		).toBe(true);
		expect(
			getActionAvailability({ type: "ABSTRACT", status: "RESUBMITTED" }, config)
				.canAssignReviewers,
		).toBe(true);
	});

	it("allows desk decisions on RESUBMITTED but not on UNDER_REVIEW", () => {
		const resubmitted = getActionAvailability(
			{ type: "ABSTRACT", status: "RESUBMITTED" },
			config,
		);
		expect(resubmitted.canDeskAccept).toBe(true);
		expect(resubmitted.canDeskReject).toBe(true);

		const underReview = getActionAvailability(
			{ type: "ABSTRACT", status: "UNDER_REVIEW" },
			config,
		);
		expect(underReview.canDeskAccept).toBe(false);
		expect(underReview.canDeskReject).toBe(false);
	});

	it("excludes desk decisions from a RESUBMITTED EXHIBITOR", () => {
		const a = getActionAvailability(
			{ type: "EXHIBITOR", status: "RESUBMITTED" },
			config,
		);
		expect(a.canDeskAccept).toBe(false);
		expect(a.canDeskReject).toBe(false);
	});

	it("gates transition-to-decision on REVIEWS_COMPLETE AND requiresEditorDecision", () => {
		expect(
			getActionAvailability(
				{ type: "ABSTRACT", status: "REVIEWS_COMPLETE" },
				{ requiresEditorDecision: true },
			).canTransitionToAwaitingDecision,
		).toBe(true);
		expect(
			getActionAvailability(
				{ type: "ABSTRACT", status: "REVIEWS_COMPLETE" },
				{ requiresEditorDecision: false },
			).canTransitionToAwaitingDecision,
		).toBe(false);
	});

	it("allows decision on AWAITING_DECISION and REVIEWS_COMPLETE", () => {
		expect(
			getActionAvailability(
				{ type: "ABSTRACT", status: "AWAITING_DECISION" },
				config,
			).canMakeDecision,
		).toBe(true);
		expect(
			getActionAvailability(
				{ type: "ABSTRACT", status: "REVIEWS_COMPLETE" },
				config,
			).canMakeDecision,
		).toBe(true);
	});

	it("allows confirm-conditions only when CONDITIONALLY_ACCEPTED", () => {
		expect(
			getActionAvailability(
				{ type: "ABSTRACT", status: "CONDITIONALLY_ACCEPTED" },
				config,
			).canConfirmConditions,
		).toBe(true);
		expect(
			getActionAvailability({ type: "ABSTRACT", status: "ACCEPTED" }, config)
				.canConfirmConditions,
		).toBe(false);
	});

	it("allows override on ACCEPTED, CONDITIONALLY_ACCEPTED, REJECTED", () => {
		for (const status of [
			"ACCEPTED",
			"CONDITIONALLY_ACCEPTED",
			"REJECTED",
		] as const) {
			expect(
				getActionAvailability({ type: "ABSTRACT", status }, config)
					.canOverrideDecision,
			).toBe(true);
		}
	});
});

describe("getPrimaryAction", () => {
	const base = {
		canAssignReviewers: false,
		canDeskAccept: false,
		canDeskReject: false,
		canTransitionToAwaitingDecision: false,
		canMakeDecision: false,
		canConfirmConditions: false,
		canOverrideDecision: false,
	};

	it("prefers transition over decision over conditions", () => {
		expect(
			getPrimaryAction({
				...base,
				canTransitionToAwaitingDecision: true,
				canMakeDecision: true,
				canConfirmConditions: true,
			}),
		).toBe("transition");
		expect(
			getPrimaryAction({
				...base,
				canMakeDecision: true,
				canConfirmConditions: true,
			}),
		).toBe("decision");
		expect(getPrimaryAction({ ...base, canConfirmConditions: true })).toBe(
			"conditions",
		);
	});

	it("is null when no primary action is available", () => {
		expect(getPrimaryAction(base)).toBeNull();
	});
});

describe("getReviewRounds", () => {
	it("dedupes and sorts rounds newest first", () => {
		expect(
			getReviewRounds([{ round: 1 }, { round: 3 }, { round: 1 }, { round: 2 }]),
		).toEqual([3, 2, 1]);
	});

	it("returns empty for no reviews", () => {
		expect(getReviewRounds([])).toEqual([]);
	});
});

describe("filterReviewsByRound", () => {
	const reviews = [
		{ id: "a", round: 1 },
		{ id: "b", round: 2 },
		{ id: "c", round: 2 },
	];

	it("returns all reviews for 'all'", () => {
		expect(filterReviewsByRound(reviews, "all", 2)).toHaveLength(3);
	});

	it("returns current-round reviews for 'current'", () => {
		expect(
			filterReviewsByRound(reviews, "current", 2).map((r) => r.id),
		).toEqual(["b", "c"]);
	});

	it("returns a specific round for a numeric string", () => {
		expect(filterReviewsByRound(reviews, "1", 2).map((r) => r.id)).toEqual([
			"a",
		]);
	});
});

describe("computeReviewProgress", () => {
	it("returns 0 progress with no assignments", () => {
		expect(computeReviewProgress([], 1).progress).toBe(0);
	});

	it("excludes CANCELLED and counts COMPLETED for the current round", () => {
		const result = computeReviewProgress(
			[
				{ round: 1, status: "COMPLETED" },
				{ round: 1, status: "PENDING" },
				{ round: 1, status: "CANCELLED" },
				{ round: 2, status: "COMPLETED" },
			],
			1,
		);
		expect(result.currentRoundAssignments).toHaveLength(2);
		expect(result.completedAssignments).toHaveLength(1);
		expect(result.progress).toBe(50);
	});
});

describe("resolveDisplayedVersion", () => {
	const submission = {
		currentVersionNumber: 2,
		content: "current content",
		file: null,
	};
	const versions = [
		{ version: 1, content: "v1 content", file: null },
		{ version: 2, content: "v2 content", file: null },
	];

	it("falls back to the current version when none is selected", () => {
		const r = resolveDisplayedVersion(versions, null, submission);
		expect(r.effectiveVersion).toBe(2);
		expect(r.content).toBe("v2 content");
	});

	it("resolves the explicitly selected older version", () => {
		const r = resolveDisplayedVersion(versions, 1, submission);
		expect(r.effectiveVersion).toBe(1);
		expect(r.content).toBe("v1 content");
	});

	it("falls back to submission content when the version is missing", () => {
		const r = resolveDisplayedVersion([], 5, submission);
		expect(r.content).toBe("current content");
	});
});

describe("hasRevisionUpload", () => {
	it("detects a revision upload event", () => {
		expect(
			hasRevisionUpload([
				{ activityType: "SUBMISSION_STATUS_CHANGED" },
				{ activityType: "SUBMISSION_REVISION_UPLOADED" },
			]),
		).toBe(true);
	});

	it("is false without one", () => {
		expect(
			hasRevisionUpload([{ activityType: "SUBMISSION_STATUS_CHANGED" }]),
		).toBe(false);
	});
});
