import { assign, setup } from "xstate";
import {
	allReviewsComplete,
	hasMinReviewers,
	hasNoActiveReviewers,
} from "../guards";
import type { SubmissionContext, SubmissionEvent } from "../types";

export const submissionMachine = setup({
	types: {
		// SAFETY: xstate setup() types-only slot; the value is never read.
		context: {} as SubmissionContext,
		// SAFETY: xstate setup() types-only slot; the value is never read.
		events: {} as SubmissionEvent,
	},
	guards: {
		hasMinReviewers: ({ context }) =>
			hasMinReviewers(
				context.assignedReviewersCount,
				context.requiredReviewers,
			),
		noActiveReviewers: ({ context }) =>
			hasNoActiveReviewers(context.assignedReviewersCount),
		revertsToResubmitted: ({ context }) =>
			hasNoActiveReviewers(context.assignedReviewersCount) &&
			context.currentRound > 1,
		allReviewsComplete: ({ context }) =>
			allReviewsComplete(
				context.assignedReviewersCount,
				context.completedReviewsCount,
				context.requiredReviewers,
			),
		shouldAutoTransition: () => {
			// Auto-transition always happens when all reviews are complete
			return true;
		},
		requiresEditorDecision: ({ context }) => {
			return context.requiresEditorDecision;
		},
	},
	actions: {
		incrementRound: assign({
			currentRound: ({ context }) => context.currentRound + 1,
		}),
		resetReviewCounts: assign({
			completedReviewsCount: 0,
			assignedReviewersCount: 0,
		}),
	},
}).createMachine({
	id: "submission",
	initial: "DRAFT",
	context: {
		submissionId: "",
		submissionType: "ABSTRACT",
		currentRound: 1,
		requiresEditorDecision: false,
		requiredReviewers: 1,
		assignedReviewersCount: 0,
		completedReviewsCount: 0,
	},
	states: {
		DRAFT: {
			on: {
				SUBMIT: "SUBMITTED",
				WITHDRAW: "WITHDRAWN",
			},
		},
		SUBMITTED: {
			on: {
				ASSIGN_REVIEWER: {
					target: "UNDER_REVIEW",
					guard: "hasMinReviewers",
				},
				DESK_REJECT: "REJECTED",
				DESK_ACCEPT: "ACCEPTED",
				WITHDRAW: "WITHDRAWN",
			},
		},
		UNDER_REVIEW: {
			on: {
				ALL_REVIEWS_COMPLETE: [
					{
						target: "REVIEWS_COMPLETE",
						guard: "shouldAutoTransition",
					},
				],
				MANUAL_TRANSITION_TO_REVIEWS_COMPLETE: {
					target: "REVIEWS_COMPLETE",
					guard: "allReviewsComplete",
				},
				REVERT_NO_REVIEWERS: [
					{ target: "RESUBMITTED", guard: "revertsToResubmitted" },
					{ target: "SUBMITTED", guard: "noActiveReviewers" },
				],
				WITHDRAW: "WITHDRAWN",
			},
		},
		REVIEWS_COMPLETE: {
			on: {
				MANUAL_TRANSITION_TO_AWAITING_DECISION: {
					target: "AWAITING_DECISION",
					guard: "requiresEditorDecision",
				},
				AUTO_ACCEPT: {
					target: "ACCEPTED",
				},
				AUTO_CONDITIONAL: {
					target: "CONDITIONALLY_ACCEPTED",
				},
				AUTO_REVISE: {
					target: "REVISE_REQUIRED",
				},
				AUTO_REJECT: {
					target: "REJECTED",
				},
				// Editor decisions from REVIEWS_COMPLETE (no guard — needed when reviewers disagree)
				EDITOR_ACCEPT: {
					target: "ACCEPTED",
				},
				EDITOR_CONDITIONAL: {
					target: "CONDITIONALLY_ACCEPTED",
				},
				EDITOR_REVISE: {
					target: "REVISE_REQUIRED",
				},
				EDITOR_REJECT: {
					target: "REJECTED",
				},
				WITHDRAW: "WITHDRAWN",
			},
		},
		AWAITING_DECISION: {
			on: {
				EDITOR_ACCEPT: "ACCEPTED",
				EDITOR_CONDITIONAL: "CONDITIONALLY_ACCEPTED",
				EDITOR_REVISE: "REVISE_REQUIRED",
				EDITOR_REJECT: "REJECTED",
				WITHDRAW: "WITHDRAWN",
			},
		},
		REVISE_REQUIRED: {
			on: {
				RESUBMIT: {
					target: "RESUBMITTED",
					actions: ["incrementRound", "resetReviewCounts"],
				},
				WITHDRAW: "WITHDRAWN",
			},
		},
		RESUBMITTED: {
			on: {
				ASSIGN_REVIEWER: {
					target: "UNDER_REVIEW",
					guard: "hasMinReviewers",
				},
				DESK_REJECT: "REJECTED",
				DESK_ACCEPT: "ACCEPTED",
				WITHDRAW: "WITHDRAWN",
			},
		},
		ACCEPTED: {
			on: {
				EDITOR_OVERRIDE: "AWAITING_DECISION",
			},
		},
		CONDITIONALLY_ACCEPTED: {
			on: {
				CONFIRM_CONDITIONS_MET: "ACCEPTED",
				EDITOR_OVERRIDE: "AWAITING_DECISION",
			},
		},
		REJECTED: {
			on: {
				EDITOR_OVERRIDE: "AWAITING_DECISION",
			},
		},
		WITHDRAWN: {
			type: "final",
		},
	},
});
