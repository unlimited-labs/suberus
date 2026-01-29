import type { FeeType, UserRole } from "@/generated/prisma";

export const roleLabels: Record<UserRole, string> = {
	ADMIN: "Administrator",
	EDITOR: "Editor",
	REVIEWER: "Reviewer",
	AUTHOR: "Author",
};

export const roleFilterOptions = [
	{ label: "Administrator", value: "ADMIN" },
	{ label: "Editor", value: "EDITOR" },
	{ label: "Reviewer", value: "REVIEWER" },
	{ label: "Author", value: "AUTHOR" },
] as const;

export const feeTypeLabels: Record<FeeType, string> = {
	FULL: "Full",
	STUDENT: "Student",
	INVITED: "Invited",
	STAFF: "Staff",
	CASH: "Cash",
};

export const feeFilterOptions = [
	{ label: "Paid", value: "paid" },
	{ label: "Unpaid", value: "unpaid" },
] as const;

export const feeTypeOptions: { value: FeeType; label: string }[] = [
	{ value: "FULL", label: "Full" },
	{ value: "STUDENT", label: "Student" },
	{ value: "INVITED", label: "Invited" },
	{ value: "STAFF", label: "Staff" },
	{ value: "CASH", label: "Cash" },
];

export const userRoleOptions: { value: UserRole; label: string }[] = [
	{ value: "AUTHOR", label: "Author" },
	{ value: "REVIEWER", label: "Reviewer" },
	{ value: "EDITOR", label: "Editor" },
	{ value: "ADMIN", label: "Administrator" },
];
