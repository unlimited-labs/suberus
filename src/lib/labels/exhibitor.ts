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

/** Display badge for an exhibitor; PENDING splits by application completeness */
export function exhibitorStatusBadge(
	status: ExhibitorStatus,
	appliedAt: Date | string | null,
): {
	label: string;
	variant: "default" | "secondary" | "destructive" | "outline";
} {
	if (status === "PENDING") {
		return appliedAt
			? { label: "Awaiting decision", variant: "secondary" }
			: { label: "Application not submitted", variant: "outline" };
	}
	return {
		label: exhibitorStatusLabels[status],
		variant: exhibitorStatusVariants[status],
	};
}
