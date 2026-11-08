import type { InvoiceState } from "@/features/settings/billing-details-rules";
import type {
	SubmissionInvolvementRole,
	SubmissionRoleSummary,
} from "@/features/users/server/users";
import type { UserRole, VatIdCheckStatus } from "@/generated/prisma/enums";
import { typeLabels } from "@/shared/lib/labels/submission";

export { roleLabels } from "@/shared/lib/labels/user-role";

export const roleFilterOptions = [
	{ label: "Administrator", value: "ADMIN" },
	{ label: "Editor", value: "EDITOR" },
	{ label: "Reviewer", value: "REVIEWER" },
	{ label: "Author", value: "AUTHOR" },
	{ label: "Exhibitor", value: "EXHIBITOR" },
] as const;

export const invoiceStateLabels = {
	NONE: "—",
	REQUESTED: "Requested",
	INCOMPLETE: "Incomplete",
} satisfies Record<InvoiceState, string>;

export const invoiceFilterOptions = [
	{ label: "Not needed", value: "NONE" },
	{ label: "Requested", value: "REQUESTED" },
	{ label: "Incomplete", value: "INCOMPLETE" },
] as const;

export const vatIdStatusLabels = {
	VERIFIED: "Verified",
	NOT_FOUND: "Not found",
	UNAVAILABLE: "Registry unavailable",
	NOT_CHECKABLE: "Not checkable",
} satisfies Record<VatIdCheckStatus, string>;

export const vatIdStatusFilterOptions = [
	{ label: "Verified", value: "VERIFIED" },
	{ label: "Not found", value: "NOT_FOUND" },
	{ label: "Registry unavailable", value: "UNAVAILABLE" },
	{ label: "No VAT ID / not checked", value: "NONE" },
] as const;

export const feeFilterOptions = [
	{ label: "Paid", value: "paid" },
	{ label: "Unpaid", value: "unpaid" },
] as const;

/** Roles an admin may grant directly; EXHIBITOR is granted via exhibitor signup only. */
export type AssignableUserRole = Exclude<UserRole, "EXHIBITOR">;

export const userRoleOptions: { value: AssignableUserRole; label: string }[] = [
	{ value: "AUTHOR", label: "Author" },
	{ value: "REVIEWER", label: "Reviewer" },
	{ value: "EDITOR", label: "Editor" },
	{ value: "ADMIN", label: "Administrator" },
];

export function assignableRoleOptions(
	canAssignAdminRole: boolean,
): { value: AssignableUserRole; label: string }[] {
	return canAssignAdminRole
		? userRoleOptions
		: userRoleOptions.filter((opt) => opt.value !== "ADMIN");
}

export const submissionRoleLabels = {
	author: "author",
	coauthor: "coauthor",
} satisfies Record<SubmissionInvolvementRole, string>;

export const submissionRoleFilterOptions = [
	{ label: "Author", value: "author" },
	{ label: "Coauthor", value: "coauthor" },
] as const;

export const submissionDraftFilterOptions = [
	{ label: "Submitted", value: "submitted" },
	{ label: "Accepted", value: "accepted" },
	{ label: "Draft", value: "draft" },
] as const;

const submissionStatusSuffix = {
	draft: " (draft)",
	accepted: " (accepted)",
	submitted: "",
} satisfies Record<SubmissionRoleSummary["status"], string>;

export function formatSubmissionRole(role: SubmissionRoleSummary): string {
	const count = role.count > 1 ? ` ×${role.count}` : "";
	const suffix = submissionStatusSuffix[role.status];
	return `${typeLabels[role.type]} · ${submissionRoleLabels[role.role]}${count}${suffix}`;
}

export function formatSubmissionRoles(roles: SubmissionRoleSummary[]): string {
	return roles.map(formatSubmissionRole).join(", ");
}
