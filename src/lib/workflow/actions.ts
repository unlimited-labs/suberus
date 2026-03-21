import type {
	ReviewDecision,
	SubmissionStatus,
} from "@/generated/prisma/enums";

/**
 * Action metadata generators for audit trail
 * These functions create metadata objects for ActivityLog
 */

export interface StatusChangeMetadata {
	event: string;
	reason?: string;
	reviewDecision?: ReviewDecision;
	editorDecision?: string;
	round?: number;
	assignmentId?: string;
	reviewerId?: string;
	[key: string]: unknown;
}

/** Generate metadata for submission transition */
export function createSubmissionTransitionMetadata(
	event: string,
	options?: {
		reason?: string;
		reviewDecision?: ReviewDecision;
		editorDecision?: string;
		round?: number;
		assignmentId?: string;
		reviewerId?: string;
	},
): StatusChangeMetadata {
	return {
		event,
		...options,
	};
}

/** Map status transition to human-readable description */
export function getTransitionDescription(
	fromStatus: SubmissionStatus | null,
	toStatus: SubmissionStatus,
	event: string,
): string {
	const descriptions: Record<string, string> = {
		SUBMIT: "Submission submitted for review",
		ASSIGN_REVIEWER: "Reviewer assigned, submission under review",
		DESK_REJECT: "Submission rejected without review (desk rejection)",
		WITHDRAW: "Submission withdrawn by author",
		ALL_REVIEWS_COMPLETE: "All reviews completed",
		MANUAL_TRANSITION_TO_REVIEWS_COMPLETE:
			"Editor transitioned to reviews complete",
		MANUAL_TRANSITION_TO_AWAITING_DECISION:
			"Editor transitioned to awaiting decision",
		AUTO_ACCEPT: "Automatically accepted based on reviewer decision",
		AUTO_CONDITIONAL:
			"Automatically conditionally accepted based on reviewer decision",
		AUTO_REVISE: "Revisions required based on reviewer decision",
		AUTO_REJECT: "Automatically rejected based on reviewer decision",
		EDITOR_ACCEPT: "Accepted by editor decision",
		EDITOR_CONDITIONAL: "Conditionally accepted by editor decision",
		EDITOR_REVISE: "Revisions required by editor decision",
		EDITOR_REJECT: "Rejected by editor decision",
		EDITOR_OVERRIDE: "Editor overriding previous decision",
		CONFIRM_CONDITIONS_MET:
			"Editor confirmed conditions met — promoted to accepted",
		RESUBMIT: "Author resubmitted revised version",
	};

	return (
		descriptions[event] || `Status changed from ${fromStatus} to ${toStatus}`
	);
}
