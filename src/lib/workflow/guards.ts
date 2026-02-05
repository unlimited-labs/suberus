import type {
	ReviewDecision,
	SubmissionStatus,
} from "@/generated/prisma/enums";
import type { SubmissionTypeConfig } from "@/lib/settings/types";

/**
 * Guard functions for workflow validation
 * Used both in xstate machines and server-side validation
 */

/** Check if max reviewers limit reached */
function canAssignMoreReviewers(
	assignedCount: number,
	config: SubmissionTypeConfig,
): boolean {
	return assignedCount < config.maxReviewers;
}

/** Check if submission can receive reviewer assignment */
export function canAssignReviewer(
	currentStatus: SubmissionStatus,
	assignedCount: number,
	config: SubmissionTypeConfig,
): boolean {
	const validStatuses: SubmissionStatus[] = [
		"SUBMITTED",
		"UNDER_REVIEW",
		"RESUBMITTED",
	];
	return (
		validStatuses.includes(currentStatus) &&
		canAssignMoreReviewers(assignedCount, config)
	);
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
