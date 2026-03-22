import type { SubmissionStatus, UserRole } from "@/generated/prisma/enums";

// Discriminated union for detail field per ActivityType
export type ActivityDetail =
	| { type: "USER_REGISTERED"; email: string }
	| { type: "USER_EMAIL_VERIFIED" }
	| { type: "USER_PROFILE_UPDATED"; fields: string[] }
	| { type: "USER_PASSWORD_CHANGED" }
	| { type: "USER_ROLE_CHANGED"; fromRole: UserRole; toRole: UserRole }
	| { type: "USER_TOGGLED_ACTIVE"; isActive: boolean }
	| { type: "USER_DELETED"; email: string }
	| {
			type: "SUBMISSION_CREATED";
			title: string;
			submissionType: string;
			isDraft: boolean;
	  }
	| { type: "SUBMISSION_DRAFT_SUBMITTED" }
	| {
			type: "SUBMISSION_STATUS_CHANGED";
			fromStatus: SubmissionStatus | null;
			toStatus: SubmissionStatus;
			round: number | null;
			event: string;
			reason?: string;
	  }
	| { type: "SUBMISSION_WITHDRAWN"; reason?: string }
	| { type: "SUBMISSION_RESUBMITTED"; round: number }
	| { type: "SUBMISSION_TRACK_CHANGED"; trackId: string | null }
	| { type: "SUBMISSION_DELETED"; title: string; sequentialNumber: number }
	| { type: "REVIEW_ASSIGNED"; assignmentId: string; deadline?: string }
	| { type: "REVIEW_SUBMITTED"; decision: string }
	| { type: "REVIEW_CANCELLED"; assignmentId: string }
	| { type: "REVIEW_OVERDUE"; assignmentId: string }
	| {
			type: "DECISION_SUBMITTED";
			decision: string;
			reasoning?: string;
	  }
	| { type: "DECISION_DESK_REJECT"; reason: string }
	| { type: "DECISION_OVERRIDE"; reasoning: string }
	| { type: "INVITATION_CREATED"; email: string; role: UserRole }
	| { type: "INVITATION_USED"; email: string }
	| { type: "INVITATION_CANCELLED" }
	| {
			type: "FEE_MARKED_PAID";
			feeType: string;
			amount: number;
			currency: string;
	  }
	| { type: "FEE_MARKED_UNPAID" };

/** Helper to create a typed activity detail object */
export function activityDetail<T extends ActivityDetail["type"]>(
	type: T,
	...args: Omit<Extract<ActivityDetail, { type: T }>, "type"> extends Record<
		string,
		never
	>
		? []
		: [Omit<Extract<ActivityDetail, { type: T }>, "type">]
): object {
	if (args.length === 0) {
		return { type } as object;
	}
	return { type, ...args[0] } as object;
}
