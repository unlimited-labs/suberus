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

export const assignmentStatusColors = {
	PENDING: "bg-yellow-100 text-yellow-800",
	COMPLETED: "bg-green-100 text-green-800",
	CANCELLED: "bg-gray-100 text-gray-800",
	OVERDUE: "bg-red-100 text-red-800",
} satisfies Record<AssignmentStatus, string> as Record<string, string>;
