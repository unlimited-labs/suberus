import type {
	AssignmentStatus,
	EmailEventType,
	ReviewDecision,
} from "@/generated/prisma/enums";

/**
 * Pure decision logic for review-round completion, extracted from
 * `checkAndTriggerReviewCompletion` so it can be unit-tested in isolation.
 */

export type ReviewCounts = { assigned: number; completed: number };

/** Count current-round assignments and how many are COMPLETED. */
export function countCompletedReviews(
	assignments: ReadonlyArray<{ status: AssignmentStatus }>,
): ReviewCounts {
	return {
		assigned: assignments.length,
		completed: assignments.filter((a) => a.status === "COMPLETED").length,
	};
}

/** Round is complete once every assignment is COMPLETED and the required quorum is met. */
export function isReviewRoundComplete(
	counts: ReviewCounts,
	requiredReviewers: number,
): boolean {
	return (
		counts.completed >= counts.assigned && counts.assigned >= requiredReviewers
	);
}

/** Reviewers disagree when there is more than one decision and they are not all equal. */
export function reviewersDisagree(decisions: ReviewDecision[]): boolean {
	return decisions.length > 1 && !decisions.every((d) => d === decisions[0]);
}

/** Maps an auto-applied reviewer decision to the author-facing email event. */
export const DECISION_EMAIL_EVENT = {
	ACCEPT: "DECISION_ACCEPTED",
	ACCEPT_WITH_MINOR_REVISIONS: "DECISION_CONDITIONALLY_ACCEPTED",
	REVISE_AND_RESUBMIT: "DECISION_REVISE_REQUIRED",
	REJECT: "DECISION_REJECTED",
} satisfies Record<ReviewDecision, EmailEventType>;

/** Default letter text sent to the author when a decision is auto-applied. */
export const DECISION_LETTER_TEXT = {
	ACCEPT:
		"Based on the reviewer's recommendation, your submission has been accepted.",
	ACCEPT_WITH_MINOR_REVISIONS:
		"Based on the reviewer's recommendation, your submission has been conditionally accepted. Please address the minor revisions outlined in the review.",
	REVISE_AND_RESUBMIT:
		"Based on the reviewer's recommendation, your submission requires revisions. Please review the feedback and resubmit.",
	REJECT: "After careful review, your submission has not been accepted.",
} satisfies Record<ReviewDecision, string>;
