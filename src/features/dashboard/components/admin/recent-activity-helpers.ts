import {
	IconCash,
	IconEye,
	IconFileText,
	IconGavel,
	IconMail,
	IconUser,
	IconUserMinus,
} from "@tabler/icons-react";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";

export type ActivityEvent = AdminDashboardMetrics["recentActivity"][number];

/** Icon for an activity event, by exact type then entity-prefix family. */
export function getEventIcon(type: string) {
	if (type === "USER_DELETED") return IconUserMinus;
	if (type.startsWith("USER_")) return IconUser;
	if (type.startsWith("SUBMISSION_")) return IconFileText;
	if (type.startsWith("REVIEW_")) return IconEye;
	if (type.startsWith("DECISION_")) return IconGavel;
	if (type.startsWith("INVITATION_")) return IconMail;
	if (type.startsWith("FEE_")) return IconCash;
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

/** Short detail line for an event (status/role transition, decision, fee). */
export function getEventDescription(event: ActivityEvent): string | null {
	const detail = event.detail;
	if (!detail) return null;

	switch (event.type) {
		case "SUBMISSION_STATUS_CHANGED":
			if (detail.fromStatus && detail.toStatus) {
				return `${String(detail.fromStatus)} → ${String(detail.toStatus)}`;
			}
			return null;
		case "USER_ROLE_CHANGED":
			if (detail.fromRole && detail.toRole) {
				return `${String(detail.fromRole)} → ${String(detail.toRole)}`;
			}
			return null;
		case "DECISION_SUBMITTED":
			if (detail.decision) {
				return String(detail.decision);
			}
			return null;
		case "FEE_MARKED_PAID":
			if (detail.amount != null) {
				return `${String(detail.amount)} ${detail.currency ? String(detail.currency) : ""}`.trim();
			}
			return null;
		default:
			return null;
	}
}
