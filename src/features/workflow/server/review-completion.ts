import type {
	AssignmentStatus,
	EmailEventType,
	ReviewDecision,
} from "@/generated/prisma/enums";

export type ReviewCounts = { assigned: number; completed: number };

export function countCompletedReviews(
	assignments: ReadonlyArray<{ status: AssignmentStatus }>,
): ReviewCounts {
	return {
		assigned: assignments.length,
		completed: assignments.filter((a) => a.status === "COMPLETED").length,
	};
}

export function isReviewRoundComplete(
	counts: ReviewCounts,
	requiredReviewers: number,
): boolean {
	return (
		counts.completed >= counts.assigned && counts.assigned >= requiredReviewers
	);
}

export function reviewersDisagree(decisions: ReviewDecision[]): boolean {
	return decisions.length > 1 && !decisions.every((d) => d === decisions[0]);
}

export const DECISION_EMAIL_EVENT = {
	ACCEPT: "DECISION_ACCEPTED",
	ACCEPT_WITH_MINOR_REVISIONS: "DECISION_CONDITIONALLY_ACCEPTED",
	REVISE_AND_RESUBMIT: "DECISION_REVISE_REQUIRED",
	REJECT: "DECISION_REJECTED",
} satisfies Record<ReviewDecision, EmailEventType>;

export const DECISION_LETTER_TEXT = {
	ACCEPT:
		"Based on the reviewer's recommendation, your submission has been accepted.",
	ACCEPT_WITH_MINOR_REVISIONS:
		"Based on the reviewer's recommendation, your submission has been conditionally accepted. Please address the minor revisions outlined in the review.",
	REVISE_AND_RESUBMIT:
		"Based on the reviewer's recommendation, your submission requires revisions. Please review the feedback and resubmit.",
	REJECT: "After careful review, your submission has not been accepted.",
} satisfies Record<ReviewDecision, string>;
