import type {
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";

export const STATUS_GRADIENTS = {
	DRAFT: "from-slate-400 to-slate-500",
	SUBMITTED: "from-blue-400 to-blue-600",
	UNDER_REVIEW: "from-orange-400 to-orange-600",
	REVIEWS_COMPLETE: "from-purple-400 to-purple-600",
	AWAITING_DECISION: "from-purple-400 to-purple-600",
	REVISE_REQUIRED: "from-yellow-400 to-yellow-600",
	RESUBMITTED: "from-blue-400 to-blue-600",
	ACCEPTED: "from-green-400 to-green-600",
	CONDITIONALLY_ACCEPTED: "from-emerald-400 to-emerald-600",
	REJECTED: "from-red-400 to-red-600",
	WITHDRAWN: "from-gray-400 to-gray-500",
} satisfies Record<SubmissionStatus, string>;

export const STATUS_LABELS = {
	DRAFT: "Draft",
	SUBMITTED: "Submitted",
	UNDER_REVIEW: "Under Review",
	REVIEWS_COMPLETE: "Reviews Complete",
	AWAITING_DECISION: "Awaiting Decision",
	REVISE_REQUIRED: "Revisions Required",
	RESUBMITTED: "Resubmitted",
	ACCEPTED: "Accepted",
	CONDITIONALLY_ACCEPTED: "Conditionally Accepted",
	REJECTED: "Rejected",
	WITHDRAWN: "Withdrawn",
} satisfies Record<SubmissionStatus, string>;

export const TYPE_LABELS = {
	ABSTRACT: "Abstract",
	FULL_PAPER: "Full Paper",
	POSTER: "Poster",
	EXHIBITOR: "Exhibitor",
} satisfies Record<SubmissionType, string>;
