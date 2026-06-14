import type { SubmissionEvent } from "@/features/workflow";
import type {
	ReviewDecision,
	SubmissionStatus,
} from "@/generated/prisma/enums";

// Display maps consumed cross-feature (reviews, users) live in shared so those
// features don't import the submissions slice; re-exported here for local +
// route use.
export {
	statusLabels,
	statusVariants,
	typeFilterOptions,
	typeLabels,
} from "@/shared/lib/labels/submission";

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

export const reviewDecisionColors = {
	ACCEPT: "bg-green-100 text-green-800",
	ACCEPT_WITH_MINOR_REVISIONS: "bg-blue-100 text-blue-800",
	REVISE_AND_RESUBMIT: "bg-amber-100 text-amber-800",
	REJECT: "bg-red-100 text-red-800",
} satisfies Record<ReviewDecision, string> as Record<string, string>;

/**
 * Admin "TODO" column — the next action an admin should take on a submission.
 * Discriminated union; `kind`s with counts carry the numbers for label/tooltip.
 */
export type TodoKind =
	| "ASSIGN_REVIEWER"
	| "REVIEWER_OVERDUE"
	| "MAKE_DECISION"
	| "VERIFY_CONDITIONS"
	| "PAYMENT_REMINDER"
	| "AWAITING_SUBMISSION"
	| "AWAITING_REVIEWS"
	| "AWAITING_REVISION"
	| "NONE";

export type SubmissionTodo =
	| { kind: "ASSIGN_REVIEWER"; assigned: number; required: number }
	| { kind: "AWAITING_REVIEWS"; completed: number; required: number }
	| { kind: "REVIEWER_OVERDUE"; overdueCount: number }
	| { kind: "MAKE_DECISION" }
	| { kind: "VERIFY_CONDITIONS" }
	| { kind: "PAYMENT_REMINDER" }
	| { kind: "AWAITING_SUBMISSION" }
	| { kind: "AWAITING_REVISION" }
	| { kind: "NONE" };

/** "action" → admin must act (badge); "muted" → ball is elsewhere (subtle text). */
export type TodoTone = "action" | "muted";

const TODO_ACTION_KINDS: ReadonlySet<TodoKind> = new Set<TodoKind>([
	"ASSIGN_REVIEWER",
	"REVIEWER_OVERDUE",
	"MAKE_DECISION",
	"VERIFY_CONDITIONS",
	"PAYMENT_REMINDER",
]);

export function todoTone(kind: TodoKind): TodoTone {
	return TODO_ACTION_KINDS.has(kind) ? "action" : "muted";
}

/** Badge variant for action TODOs (muted ones don't use a badge). */
export const todoBadgeVariant: Record<
	TodoKind,
	"default" | "secondary" | "destructive" | "outline"
> = {
	ASSIGN_REVIEWER: "default",
	REVIEWER_OVERDUE: "destructive",
	MAKE_DECISION: "default",
	VERIFY_CONDITIONS: "default",
	PAYMENT_REMINDER: "secondary",
	AWAITING_SUBMISSION: "outline",
	AWAITING_REVIEWS: "outline",
	AWAITING_REVISION: "outline",
	NONE: "outline",
};

/** Full cell label, interpolating counts where the kind carries them. */
export function todoLabel(todo: SubmissionTodo): string {
	switch (todo.kind) {
		case "ASSIGN_REVIEWER":
			return `Assign reviewer (${todo.assigned}/${todo.required})`;
		case "AWAITING_REVIEWS":
			return `Awaiting reviews (${todo.completed}/${todo.required})`;
		case "REVIEWER_OVERDUE":
			return todo.overdueCount > 1
				? `Review overdue (${todo.overdueCount})`
				: "Review overdue";
		case "MAKE_DECISION":
			return "Make decision";
		case "VERIFY_CONDITIONS":
			return "Verify conditions";
		case "PAYMENT_REMINDER":
			return "Remind about payment";
		case "AWAITING_SUBMISSION":
			return "Awaiting submission";
		case "AWAITING_REVISION":
			return "Awaiting revision";
		case "NONE":
			return "—";
	}
}

/** Explanatory tooltip for count-bearing TODOs; null when no extra context. */
export function todoTooltip(todo: SubmissionTodo): string | null {
	switch (todo.kind) {
		case "ASSIGN_REVIEWER":
			return `${todo.assigned} of ${todo.required} required reviewers assigned`;
		case "AWAITING_REVIEWS":
			return `${todo.completed} of ${todo.required} required reviews completed`;
		default:
			return null;
	}
}

/** Short label (no counts) used by the column filter dropdown. */
export const todoKindLabels: Record<TodoKind, string> = {
	ASSIGN_REVIEWER: "Assign reviewer",
	REVIEWER_OVERDUE: "Review overdue",
	MAKE_DECISION: "Make decision",
	VERIFY_CONDITIONS: "Verify conditions",
	PAYMENT_REMINDER: "Remind about payment",
	AWAITING_SUBMISSION: "Awaiting submission",
	AWAITING_REVIEWS: "Awaiting reviews",
	AWAITING_REVISION: "Awaiting revision",
	NONE: "No action",
};

export const todoFilterOptions = (
	[
		"REVIEWER_OVERDUE",
		"ASSIGN_REVIEWER",
		"MAKE_DECISION",
		"VERIFY_CONDITIONS",
		"PAYMENT_REMINDER",
		"AWAITING_SUBMISSION",
		"AWAITING_REVIEWS",
		"AWAITING_REVISION",
		"NONE",
	] satisfies TodoKind[]
).map((kind) => ({ label: todoKindLabels[kind], value: kind }));

/** Priority for sorting: actions first, then waiting states, then none. */
export const todoSortRank: Record<TodoKind, number> = {
	REVIEWER_OVERDUE: 0,
	ASSIGN_REVIEWER: 1,
	MAKE_DECISION: 2,
	VERIFY_CONDITIONS: 3,
	PAYMENT_REMINDER: 4,
	AWAITING_REVIEWS: 5,
	AWAITING_REVISION: 6,
	AWAITING_SUBMISSION: 7,
	NONE: 8,
};

export const statusChangeOptions: {
	value: SubmissionStatus;
	label: string;
	eventType: SubmissionEvent["type"];
}[] = [
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
