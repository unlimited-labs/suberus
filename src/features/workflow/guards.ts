import type {
	ReviewDecision,
	SubmissionStatus,
} from "@/generated/prisma/enums";

/**
 * Guard functions for workflow validation
 * Used both in xstate machines and server-side validation
 */

/** Check if submission can receive reviewer assignment */
export function canAssignReviewer(currentStatus: SubmissionStatus): boolean {
	const validStatuses: SubmissionStatus[] = [
		"SUBMITTED",
		"UNDER_REVIEW",
		"RESUBMITTED",
	];
	return validStatuses.includes(currentStatus);
}

/** Whether the minimum required reviewers have been assigned */
export function hasMinReviewers(assigned: number, required: number): boolean {
	return assigned >= required;
}

/** Whether the current round has no active (non-cancelled) reviewer assignments */
export function hasNoActiveReviewers(assigned: number): boolean {
	return assigned === 0;
}

/** Whether all assigned reviews are complete and the minimum is met */
export function allReviewsComplete(
	assigned: number,
	completed: number,
	required: number,
): boolean {
	return completed >= assigned && assigned >= required;
}

/** Map reviewer decision to auto-transition event */
export function getAutoTransitionEvent(
	decision: ReviewDecision,
): "AUTO_ACCEPT" | "AUTO_CONDITIONAL" | "AUTO_REVISE" | "AUTO_REJECT" {
	switch (decision) {
		case "ACCEPT":
			return "AUTO_ACCEPT";
		case "ACCEPT_WITH_MINOR_REVISIONS":
			return "AUTO_CONDITIONAL";
		case "REVISE_AND_RESUBMIT":
			return "AUTO_REVISE";
		case "REJECT":
			return "AUTO_REJECT";
	}
}
