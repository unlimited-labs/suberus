import type {
	ReviewDecision,
	SubmissionStatus,
} from "@/generated/prisma/enums";

export function canAssignReviewer(currentStatus: SubmissionStatus): boolean {
	const validStatuses: SubmissionStatus[] = [
		"SUBMITTED",
		"UNDER_REVIEW",
		"RESUBMITTED",
	];
	return validStatuses.includes(currentStatus);
}

export function hasMinReviewers(assigned: number, required: number): boolean {
	return assigned >= required;
}

export function hasNoActiveReviewers(assigned: number): boolean {
	return assigned === 0;
}

export function allReviewsComplete(
	assigned: number,
	completed: number,
	required: number,
): boolean {
	return completed >= assigned && assigned >= required;
}

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
