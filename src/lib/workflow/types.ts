import type { ReviewDecision, SubmissionType } from "@/generated/prisma/enums";

/** Events for submission state machine */
export type SubmissionEvent =
	| { type: "SUBMIT" }
	| { type: "ASSIGN_REVIEWER" }
	| { type: "WITHDRAW" }
	| { type: "DESK_REJECT"; reason: string }
	| { type: "ALL_REVIEWS_COMPLETE" }
	| { type: "MANUAL_TRANSITION_TO_REVIEWS_COMPLETE" }
	| { type: "MANUAL_TRANSITION_TO_AWAITING_DECISION" }
	| { type: "AUTO_ACCEPT" }
	| { type: "AUTO_CONDITIONAL" }
	| { type: "AUTO_REVISE" }
	| { type: "AUTO_REJECT" }
	| { type: "EDITOR_ACCEPT" }
	| { type: "EDITOR_CONDITIONAL" }
	| { type: "EDITOR_REVISE" }
	| { type: "EDITOR_REJECT" }
	| { type: "EDITOR_OVERRIDE" }
	| { type: "CONFIRM_CONDITIONS_MET" }
	| { type: "RESUBMIT" };

/** Context for submission state machine */
export interface SubmissionContext {
	submissionId: string;
	submissionType: SubmissionType;
	currentRound: number;
	requiresEditorDecision: boolean;
	autoTransitionAfterReviews: boolean;
	minReviewers: number;
	maxReviewers: number;
	assignedReviewersCount: number;
	completedReviewsCount: number;
	lastReviewDecision?: ReviewDecision;
}

/** Events for assignment state machine */
export type AssignmentEvent =
	| { type: "START_REVIEW" }
	| { type: "COMPLETE"; decision: ReviewDecision }
	| { type: "CANCEL" }
	| { type: "MARK_OVERDUE" };

/** Context for assignment state machine */
export interface AssignmentContext {
	assignmentId: string;
	submissionId: string;
	reviewerId: string;
	round: number;
	deadline?: Date;
}

/** Result of workflow transition */
export interface TransitionResult {
	success: boolean;
	fromState: string;
	toState: string;
	event: string;
	error?: string;
}
