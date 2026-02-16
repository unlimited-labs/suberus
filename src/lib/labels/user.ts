import type { UserRole } from "@/generated/prisma/enums";

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

export const feeFilterOptions = [
	{ label: "Paid", value: "paid" },
	{ label: "Unpaid", value: "unpaid" },
] as const;

export const userRoleOptions: { value: UserRole; label: string }[] = [
	{ value: "AUTHOR", label: "Author" },
	{ value: "REVIEWER", label: "Reviewer" },
	{ value: "EDITOR", label: "Editor" },
	{ value: "ADMIN", label: "Administrator" },
];
