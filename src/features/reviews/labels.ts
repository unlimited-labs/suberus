import type { AssignmentStatus } from "@/generated/prisma/enums";

export const assignmentStatusLabels = {
	PENDING: "Pending",
	COMPLETED: "Completed",
	CANCELLED: "Cancelled",
	OVERDUE: "Overdue",
} satisfies Record<AssignmentStatus, string>;

export const assignmentStatusFilterOptions = [
	{ label: "Pending", value: "PENDING" },
	{ label: "Completed", value: "COMPLETED" },
	{ label: "Overdue", value: "OVERDUE" },
	{ label: "Cancelled", value: "CANCELLED" },
] as const;

export const assignmentStatusVariants = {
	PENDING: "outline",
	COMPLETED: "default",
	CANCELLED: "outline",
	OVERDUE: "destructive",
} satisfies Record<
	AssignmentStatus,
	"default" | "secondary" | "destructive" | "outline"
>;
