import type {
	ReviewDecision,
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";
import type { SubmissionEvent } from "@/lib/workflow";

export const statusLabels: Record<SubmissionStatus, string> = {
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
};

export const statusFilterOptions = [
	{ label: "Draft", value: "DRAFT" },
	{ label: "Submitted", value: "SUBMITTED" },
	{ label: "Under Review", value: "UNDER_REVIEW" },
	{ label: "Reviews Complete", value: "REVIEWS_COMPLETE" },
	{ label: "Awaiting Decision", value: "AWAITING_DECISION" },
	{ label: "Revision Required", value: "REVISE_REQUIRED" },
	{ label: "Resubmitted", value: "RESUBMITTED" },
	{ label: "Accepted", value: "ACCEPTED" },
	{ label: "Conditionally Accepted", value: "CONDITIONALLY_ACCEPTED" },
	{ label: "Rejected", value: "REJECTED" },
	{ label: "Withdrawn", value: "WITHDRAWN" },
] as const;

export const statusVariants: Record<
	SubmissionStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
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
};

export const typeLabels: Record<SubmissionType, string> = {
	ABSTRACT: "Oral Presentation",
	FULL_PAPER: "Full Paper",
	POSTER: "Poster",
};

export const typeFilterOptions = [
	{ label: "Oral Presentation", value: "ABSTRACT" },
	{ label: "Full Paper", value: "FULL_PAPER" },
	{ label: "Poster", value: "POSTER" },
] as const;

export const reviewDecisionColors = {
	ACCEPT: "bg-green-100 text-green-800",
	ACCEPT_WITH_MINOR_REVISIONS: "bg-blue-100 text-blue-800",
	REVISE_AND_RESUBMIT: "bg-amber-100 text-amber-800",
	REJECT: "bg-red-100 text-red-800",
} satisfies Record<ReviewDecision, string> as Record<string, string>;

export const statusChangeOptions: {
	value: SubmissionStatus;
	label: string;
	eventType: SubmissionEvent["type"];
}[] = [
	{
		value: "UNDER_REVIEW",
		label: "Under Review",
		eventType: "ASSIGN_REVIEWER",
	},
	{ value: "ACCEPTED", label: "Accepted", eventType: "EDITOR_ACCEPT" },
	{
		value: "CONDITIONALLY_ACCEPTED",
		label: "Conditionally Accepted",
		eventType: "EDITOR_CONDITIONAL",
	},
	{
		value: "REVISE_REQUIRED",
		label: "Revision Required",
		eventType: "EDITOR_REVISE",
	},
	{ value: "REJECTED", label: "Rejected", eventType: "EDITOR_REJECT" },
];
