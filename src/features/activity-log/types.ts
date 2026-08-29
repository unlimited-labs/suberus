import type {
	ActivityType,
	SubmissionStatus,
	UserRole,
} from "@/generated/prisma/enums";

type NoDetail = Record<never, never>;

type AssertExhaustive<T extends Record<ActivityType, NoDetail>> = T;

type StatusChange = {
	fromStatus: SubmissionStatus | null;
	toStatus: SubmissionStatus;
	round: number | null;
	event: string;
	reason?: string;
};

type McpClientAudit = {
	clientId: string;
	clientName: string | null;
	redirectUris: string[];
};

type DetailShapes = AssertExhaustive<{
	USER_REGISTERED: { email: string };
	USER_EMAIL_VERIFIED: NoDetail;
	USER_PROFILE_UPDATED: { fields: string[] };
	USER_PASSWORD_CHANGED: NoDetail;
	USER_ROLE_CHANGED: { fromRole: UserRole; toRole: UserRole };
	USER_TOGGLED_ACTIVE: { isActive: boolean };
	USER_TOGGLED_LATE_SUBMISSION: { allowLateSubmission: boolean };
	USER_DELETED: { email: string };
	SUBMISSION_CREATED: {
		title: string;
		submissionType: string;
		isDraft: boolean;
	};
	SUBMISSION_DRAFT_SUBMITTED: NoDetail;
	SUBMISSION_STATUS_CHANGED: StatusChange;
	SUBMISSION_WITHDRAWN: { reason?: string };
	SUBMISSION_RESUBMITTED: StatusChange;
	SUBMISSION_REVISION_UPLOADED: { version: number };
	SUBMISSION_TRACK_CHANGED: { trackId: string | null };
	SUBMISSION_SUBMITTER_CHANGED: {
		fromUserId: string;
		fromName: string;
		toUserId: string;
		toName: string;
	};
	SUBMISSION_EDITED: NoDetail;
	SUBMISSION_DELETED: { title: string; sequentialNumber: number };
	REVIEW_ASSIGNED: { assignmentId: string; deadline?: string };
	REVIEW_SUBMITTED: { decision: string };
	REVIEW_CANCELLED: { assignmentId: string };
	REVIEW_OVERDUE: { assignmentId: string };
	DECISION_SUBMITTED: { decision: string; reasoning?: string };
	DECISION_DESK_REJECT: { reason: string };
	DECISION_DESK_ACCEPT: { reason: string };
	DECISION_OVERRIDE: { reasoning: string };
	INVITATION_CREATED: { email: string; role: UserRole };
	INVITATION_USED: { email: string };
	INVITATION_CANCELLED: NoDetail;
	FEE_MARKED_PAID: { feeType: string; amount: number; currency: string };
	FEE_MARKED_UNPAID: NoDetail;
	EXHIBITOR_APPLIED: { companyName: string; hasPresentation: boolean };
	EXHIBITOR_APPROVED: { reason: string };
	EXHIBITOR_REJECTED: { reason: string };
	EXHIBITOR_WITHDRAWN: NoDetail;
	DOCUMENT_GENERATED: { documentName: string; templateName: string | null };
	DOCUMENT_DELETED: { documentName: string };
	MCP_CLIENT_REGISTERED: McpClientAudit;
	MCP_CLIENT_UPDATED: McpClientAudit & { changedFields: string[] };
	SETTINGS_CONFERENCE_UPDATED: { changedFields: string[] };
}>;

export type ActivityDetail = {
	[K in ActivityType]: { type: K } & DetailShapes[K];
}[ActivityType];

export function activityDetail<T extends ActivityType>(
	type: T,
	...args: keyof DetailShapes[T] extends never ? [] : [DetailShapes[T]]
): Extract<ActivityDetail, { type: T }> {
	// SAFETY: the parameter types already tie `type` to its detail members.
	return { type, ...args[0] } as Extract<ActivityDetail, { type: T }>;
}
