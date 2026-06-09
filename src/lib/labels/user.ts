import type { UserRole } from "@/generated/prisma/enums";
import type {
	SubmissionInvolvementRole,
	SubmissionRoleSummary,
} from "@/lib/server/admin/users";
import { typeLabels } from "./submission";

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

/**
 * Role choices a performer may assign. Non-admins (editors) cannot grant the
 * ADMIN role, so it is omitted from their picker (server-enforced regardless).
 */
export function assignableRoleOptions(
	canAssignAdminRole: boolean,
): { value: UserRole; label: string }[] {
	return canAssignAdminRole
		? userRoleOptions
		: userRoleOptions.filter((opt) => opt.value !== "ADMIN");
}

export const submissionRoleLabels: Record<SubmissionInvolvementRole, string> = {
	author: "author",
	coauthor: "coauthor",
};

export const submissionRoleFilterOptions = [
	{ label: "Author", value: "author" },
	{ label: "Coauthor", value: "coauthor" },
] as const;

export const submissionDraftFilterOptions = [
	{ label: "Submitted", value: "submitted" },
	{ label: "Draft", value: "draft" },
] as const;

/** Single badge label, e.g. "Poster · coauthor ×3 (draft)". */
export function formatSubmissionRole(role: SubmissionRoleSummary): string {
	const count = role.count > 1 ? ` ×${role.count}` : "";
	const draft = role.draft ? " (draft)" : "";
	return `${typeLabels[role.type]} · ${submissionRoleLabels[role.role]}${count}${draft}`;
}

/** Comma-joined summary of all involvements (used in XLSX export). */
export function formatSubmissionRoles(roles: SubmissionRoleSummary[]): string {
	return roles.map(formatSubmissionRole).join(", ");
}
