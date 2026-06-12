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
