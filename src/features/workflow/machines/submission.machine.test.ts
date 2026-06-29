import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import type { SubmissionContext } from "../types";
import { submissionMachine } from "./submission.machine";

const ctx = (over: Partial<SubmissionContext>): SubmissionContext => ({
	submissionId: "s1",
	submissionType: "ABSTRACT",
	currentRound: 1,
	requiresEditorDecision: false,
	requiredReviewers: 1,
	assignedReviewersCount: 0,
	completedReviewsCount: 0,
	...over,
});

const revertFrom = (context: SubmissionContext): string => {
	const actor = createActor(submissionMachine, {
		snapshot: submissionMachine.resolveState({
			value: "UNDER_REVIEW",
			context,
		}),
	});
	actor.start();
	if (!actor.getSnapshot().can({ type: "REVERT_NO_REVIEWERS" })) {
		actor.stop();
		return "UNDER_REVIEW";
	}
	actor.send({ type: "REVERT_NO_REVIEWERS" });
	const value = String(actor.getSnapshot().value);
	actor.stop();
	return value;
};

describe("REVERT_NO_REVIEWERS", () => {
	it("reverts round 1 to SUBMITTED when no active reviewers", () => {
		expect(
			revertFrom(ctx({ currentRound: 1, assignedReviewersCount: 0 })),
		).toBe("SUBMITTED");
	});

	it("reverts later rounds to RESUBMITTED when no active reviewers", () => {
		expect(
			revertFrom(ctx({ currentRound: 2, assignedReviewersCount: 0 })),
		).toBe("RESUBMITTED");
	});

	it("does not revert while reviewers are still assigned", () => {
		expect(
			revertFrom(ctx({ currentRound: 1, assignedReviewersCount: 1 })),
		).toBe("UNDER_REVIEW");
	});
});

describe("desk decisions from RESUBMITTED", () => {
	const can = (event: "DESK_ACCEPT" | "DESK_REJECT"): boolean => {
		const actor = createActor(submissionMachine, {
			snapshot: submissionMachine.resolveState({
				value: "RESUBMITTED",
				context: ctx({ currentRound: 2 }),
			}),
		});
		actor.start();
		const ok = actor.getSnapshot().can({ type: event, reason: "x" });
		actor.stop();
		return ok;
	};

	it("allows desk accept and desk reject", () => {
		expect(can("DESK_ACCEPT")).toBe(true);
		expect(can("DESK_REJECT")).toBe(true);
	});
});
