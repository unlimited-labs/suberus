import type { AssignmentStatus } from "@/generated/prisma/enums";

export const assignmentStatusLabels: Record<AssignmentStatus, string> = {
	PENDING: "Pending",
	COMPLETED: "Completed",
	CANCELLED: "Cancelled",
	OVERDUE: "Overdue",
};

export const assignmentStatusFilterOptions = [
	{ label: "Pending", value: "PENDING" },
	{ label: "Completed", value: "COMPLETED" },
	{ label: "Overdue", value: "OVERDUE" },
	{ label: "Cancelled", value: "CANCELLED" },
] as const;

export const assignmentStatusVariants: Record<
	AssignmentStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	PENDING: "outline",
	COMPLETED: "default",
	CANCELLED: "outline",
	OVERDUE: "destructive",
};
