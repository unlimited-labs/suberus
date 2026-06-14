import type { ExhibitorStatus } from "@/generated/prisma/enums";

export const exhibitorStatusLabels: Record<ExhibitorStatus, string> = {
	PENDING: "Pending",
	APPROVED: "Approved",
	REJECTED: "Not accepted",
	WITHDRAWN: "Withdrawn",
};

export const exhibitorStatusVariants: Record<
	ExhibitorStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	PENDING: "secondary",
	APPROVED: "default",
	REJECTED: "destructive",
	WITHDRAWN: "outline",
};

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
): {
	key: ExhibitorDisplayStatus;
	label: string;
	variant: "default" | "secondary" | "destructive" | "outline";
} {
	if (status === "PENDING") {
		return appliedAt
			? {
					key: "AWAITING_DECISION",
					label: "Awaiting decision",
					variant: "secondary",
				}
			: {
					key: "NOT_SUBMITTED",
					label: "Application not submitted",
					variant: "outline",
				};
	}
	return {
		key: status as Exclude<
			ExhibitorDisplayStatus,
			"NOT_SUBMITTED" | "AWAITING_DECISION"
		>,
		label: exhibitorStatusLabels[status],
		variant: exhibitorStatusVariants[status],
	};
}
