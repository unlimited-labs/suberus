import type { ExhibitorStatus } from "@/generated/prisma/enums";

export const exhibitorStatusLabels = {
	PENDING: "Pending",
	APPROVED: "Approved",
	REJECTED: "Not accepted",
	WITHDRAWN: "Withdrawn",
} satisfies Record<ExhibitorStatus, string>;

export const exhibitorStatusVariants = {
	PENDING: "secondary",
	APPROVED: "default",
	REJECTED: "destructive",
	WITHDRAWN: "outline",
} satisfies Record<
	ExhibitorStatus,
	"default" | "secondary" | "destructive" | "outline"
>;

export type ExhibitorDisplayStatus =
	| "NOT_SUBMITTED"
	| "AWAITING_DECISION"
	| "APPROVED"
	| "REJECTED"
	| "WITHDRAWN";

/** Display badge for an exhibitor; PENDING splits by application completeness */
export function exhibitorStatusBadge(
	status: ExhibitorStatus,
	appliedAt: Date | string | null,
) {
	if (status === "PENDING") {
		return appliedAt
			? ({
					key: "AWAITING_DECISION",
					label: "Awaiting decision",
					variant: "secondary",
				} as const)
			: ({
					key: "NOT_SUBMITTED",
					label: "Application not submitted",
					variant: "outline",
				} as const);
	}
	return {
		// SAFETY: the PENDING branch above already returned, leaving the mapped members.
		key: status as Exclude<
			ExhibitorDisplayStatus,
			"NOT_SUBMITTED" | "AWAITING_DECISION"
		>,
		label: exhibitorStatusLabels[status],
		variant: exhibitorStatusVariants[status],
	};
}
