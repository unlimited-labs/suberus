import type {
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";

export const statusLabels = {
	DRAFT: "Draft",
	SUBMITTED: "Submitted",
	UNDER_REVIEW: "Under Review",
	REVIEWS_COMPLETE: "Reviews Complete",
	AWAITING_DECISION: "Awaiting Decision",
	REVISE_REQUIRED: "Revision Required",
	RESUBMITTED: "Resubmitted",
	ACCEPTED: "Accepted",
	CONDITIONALLY_ACCEPTED: "Conditionally Accepted",
	REJECTED: "Rejected",
	WITHDRAWN: "Withdrawn",
} satisfies Record<SubmissionStatus, string>;

export const statusVariants = {
	DRAFT: "outline",
	SUBMITTED: "secondary",
	UNDER_REVIEW: "secondary",
	REVIEWS_COMPLETE: "secondary",
	AWAITING_DECISION: "secondary",
	REVISE_REQUIRED: "destructive",
	RESUBMITTED: "secondary",
	ACCEPTED: "default",
	CONDITIONALLY_ACCEPTED: "outline",
	REJECTED: "destructive",
	WITHDRAWN: "outline",
} satisfies Record<
	SubmissionStatus,
	"default" | "secondary" | "destructive" | "outline"
>;

export const typeLabels = {
	ABSTRACT: "Oral Presentation",
	FULL_PAPER: "Full Paper",
	POSTER: "Poster",
	EXHIBITOR: "Exhibitor",
	INVITED: "Invited Talk",
} satisfies Record<SubmissionType, string>;

export const typeFilterOptions = [
	{ label: "Oral Presentation", value: "ABSTRACT" },
	{ label: "Full Paper", value: "FULL_PAPER" },
	{ label: "Poster", value: "POSTER" },
	{ label: "Exhibitor", value: "EXHIBITOR" },
] as const;
