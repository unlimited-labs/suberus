import {
	IconCash,
	IconEye,
	IconFileText,
	IconGavel,
	IconMail,
	IconPlug,
	IconUser,
	IconUserMinus,
} from "@tabler/icons-react";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { statusLabels } from "@/shared/lib/labels/submission";
import { roleLabels } from "@/shared/lib/labels/user-role";

export type ActivityEvent = AdminDashboardMetrics["recentActivity"][number];

function str(value: unknown): string | undefined {
	return value == null ? undefined : String(value);
}

function statusLabel(value: unknown): string | undefined {
	const raw = str(value);
	return raw
		? (statusLabels[raw as keyof typeof statusLabels] ?? raw)
		: undefined;
}

function roleLabel(value: unknown): string | undefined {
	const raw = str(value);
	return raw ? (roleLabels[raw as keyof typeof roleLabels] ?? raw) : undefined;
}

function humanize(value: unknown): string | undefined {
	const raw = str(value);
	return raw?.replace(/_/g, " ");
}

/** Icon for an activity event, by exact type then entity-prefix family. */
export function getEventIcon(type: string) {
	if (type === "USER_DELETED") return IconUserMinus;
	if (type.startsWith("USER_")) return IconUser;
	if (type.startsWith("SUBMISSION_")) return IconFileText;
	if (type.startsWith("REVIEW_")) return IconEye;
	if (type.startsWith("DECISION_")) return IconGavel;
	if (type.startsWith("INVITATION_")) return IconMail;
	if (type.startsWith("FEE_")) return IconCash;
	if (type.startsWith("MCP_")) return IconPlug;
	return IconFileText;
}

/** Text color for an event: per-type overrides, then entity-prefix defaults. */
export function getEventColor(type: string): string {
	if (type === "USER_DELETED") return "text-red-600";
	if (type === "SUBMISSION_WITHDRAWN") return "text-gray-600";
	if (type === "REVIEW_OVERDUE") return "text-orange-600";
	if (type === "REVIEW_CANCELLED") return "text-gray-600";
	if (type === "DECISION_DESK_REJECT") return "text-red-600";
	if (type === "DECISION_DESK_ACCEPT") return "text-green-600";
	if (type === "FEE_MARKED_UNPAID") return "text-red-600";

	if (type.startsWith("USER_")) return "text-indigo-600";
	if (type.startsWith("SUBMISSION_")) return "text-blue-600";
	if (type.startsWith("REVIEW_")) return "text-yellow-600";
	if (type.startsWith("DECISION_")) return "text-purple-600";
	if (type.startsWith("INVITATION_")) return "text-teal-600";
	if (type.startsWith("FEE_")) return "text-emerald-600";
	if (type.startsWith("MCP_")) return "text-sky-600";

	return "text-gray-600";
}

export type ActivitySubject =
	| { kind: "submission"; id: string; title: string }
	| { kind: "user"; id: string; name: string }
	| { kind: "name"; name: string }
	| { kind: "none" };

/**
 * The single linkable subject of an activity row: the submission, the affected
 * user (for USER_ events), a bare performer name, or nothing. Pure, so the
 * mutually-exclusive precedence is unit-testable.
 */
export function resolveActivitySubject(event: ActivityEvent): ActivitySubject {
	if (event.type === "SUBMISSION_DELETED" && event.detail?.title) {
		const seq = event.detail.sequentialNumber;
		const title = String(event.detail.title);
		return { kind: "name", name: seq != null ? `#${seq} ${title}` : title };
	}
	if (event.type.startsWith("MCP_")) {
		const name = str(event.detail?.clientName) ?? str(event.detail?.clientId);
		return name ? { kind: "name", name } : { kind: "none" };
	}
	if (event.submissionId && event.submissionTitle) {
		return {
			kind: "submission",
			id: event.submissionId,
			title: event.submissionTitle,
		};
	}
	const isUserEvent = event.type.startsWith("USER_");
	if (isUserEvent && event.userId && event.userName) {
		return { kind: "user", id: event.userId, name: event.userName };
	}
	if (!isUserEvent && !event.submissionId && event.userName) {
		return { kind: "name", name: event.userName };
	}
	return { kind: "none" };
}

type DescriptionRenderer = (event: ActivityEvent) => string | null;

const arrow = (
	from: string | undefined,
	to: string | undefined,
): string | null => (from && to ? `${from} → ${to}` : null);

const statusArrow: DescriptionRenderer = (e) =>
	arrow(statusLabel(e.detail?.fromStatus), statusLabel(e.detail?.toStatus));
const reasonOf: DescriptionRenderer = (e) => str(e.detail?.reason) ?? null;
const decisionOf: DescriptionRenderer = (e) =>
	humanize(e.detail?.decision) ?? null;
const emailOf: DescriptionRenderer = (e) => str(e.detail?.email) ?? null;
const documentOf: DescriptionRenderer = (e) =>
	str(e.detail?.documentName) ?? null;

const list = (value: unknown): string | undefined =>
	Array.isArray(value) && value.length > 0
		? value.map(String).join(", ")
		: undefined;

const mcpClientOf: DescriptionRenderer = (e) => {
	const clientId = str(e.detail?.clientId);
	if (!clientId) return null;
	const redirects = list(e.detail?.redirectUris);
	return redirects ? `${clientId} → ${redirects}` : clientId;
};

const descriptionRenderers: Record<string, DescriptionRenderer> = {
	MCP_CLIENT_REGISTERED: mcpClientOf,
	MCP_CLIENT_UPDATED: (e) => {
		const base = mcpClientOf(e);
		const changed = list(e.detail?.changedFields);
		if (!base) return null;
		return changed ? `${base} · Changed: ${changed}` : base;
	},
	SUBMISSION_DELETED: (e) => (e.userName ? `Author: ${e.userName}` : null),
	SUBMISSION_STATUS_CHANGED: statusArrow,
	SUBMISSION_RESUBMITTED: statusArrow,
	USER_ROLE_CHANGED: (e) =>
		arrow(roleLabel(e.detail?.fromRole), roleLabel(e.detail?.toRole)),
	SUBMISSION_REVISION_UPLOADED: (e) =>
		e.detail?.version != null ? `Version ${e.detail.version}` : null,
	SUBMISSION_WITHDRAWN: reasonOf,
	DECISION_DESK_REJECT: reasonOf,
	DECISION_DESK_ACCEPT: reasonOf,
	DECISION_OVERRIDE: (e) => str(e.detail?.reasoning) ?? null,
	REVIEW_SUBMITTED: decisionOf,
	DECISION_SUBMITTED: decisionOf,
	USER_TOGGLED_ACTIVE: (e) =>
		e.detail ? (e.detail.isActive ? "Activated" : "Deactivated") : null,
	USER_TOGGLED_LATE_SUBMISSION: (e) =>
		e.detail ? (e.detail.allowLateSubmission ? "Enabled" : "Disabled") : null,
	USER_PROFILE_UPDATED: (e) =>
		Array.isArray(e.detail?.fields) && e.detail.fields.length > 0
			? `Updated: ${e.detail.fields.join(", ")}`
			: null,
	INVITATION_CREATED: (e) => {
		const email = str(e.detail?.email);
		if (!email) return null;
		const role = roleLabel(e.detail?.role);
		return role ? `${email} · ${role}` : email;
	},
	INVITATION_USED: emailOf,
	USER_REGISTERED: emailOf,
	USER_DELETED: emailOf,
	EXHIBITOR_APPLIED: (e) => str(e.detail?.companyName) ?? null,
	DOCUMENT_GENERATED: documentOf,
	DOCUMENT_DELETED: documentOf,
	FEE_MARKED_PAID: (e) =>
		e.detail?.amount != null
			? `${String(e.detail.amount)} ${e.detail.currency ? String(e.detail.currency) : ""}`.trim()
			: null,
};

/** Short detail line for an event: transition, decision, reason, snapshot. */
export function getEventDescription(event: ActivityEvent): string | null {
	return descriptionRenderers[event.type]?.(event) ?? null;
}
