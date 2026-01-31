import type { AssignmentStatus } from "@/generated/prisma/enums";

export const assignmentStatusLabels: Record<AssignmentStatus, string> = {
	PENDING: "Pending",
	IN_PROGRESS: "In Progress",
	COMPLETED: "Completed",
	CANCELLED: "Cancelled",
	OVERDUE: "Overdue",
};

export const assignmentStatusFilterOptions = [
	{ label: "Pending", value: "PENDING" },
	{ label: "In Progress", value: "IN_PROGRESS" },
	{ label: "Completed", value: "COMPLETED" },
	{ label: "Overdue", value: "OVERDUE" },
] as const;

export const assignmentStatusVariants: Record<
	AssignmentStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	PENDING: "outline",
	IN_PROGRESS: "secondary",
	COMPLETED: "default",
	CANCELLED: "outline",
	OVERDUE: "destructive",
};
