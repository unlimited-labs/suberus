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

export const CHANGED_AFTER_PAYMENT = "CHANGED_AFTER_PAYMENT";

export const invoiceStateLabels = {
	NONE: "Not needed",
	REQUESTED: "Requested",
	INCOMPLETE: "Incomplete",
} satisfies Record<InvoiceState, string>;

export const CHANGED_AFTER_PAYMENT_LABEL = "Changed after payment";

export const invoiceFilterOptions = [
	...Object.entries(invoiceStateLabels).map(([value, label]) => ({
		label,
		value,
	})),
	{ label: CHANGED_AFTER_PAYMENT_LABEL, value: CHANGED_AFTER_PAYMENT },
];

export const vatIdStatusLabels = {
	VERIFIED: "Verified",
	NOT_FOUND: "Not found",
	UNAVAILABLE: "Registry unavailable",
	NOT_CHECKABLE: "Not checkable",
} satisfies Record<VatIdCheckStatus, string>;

export const vatIdStatusFilterOptions = [
	...Object.entries(vatIdStatusLabels)
		.filter(([value]) => value !== "NOT_CHECKABLE")
		.map(([value, label]) => ({ label, value })),
	{ label: "No VAT ID / not checked", value: "NONE" },
];

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
