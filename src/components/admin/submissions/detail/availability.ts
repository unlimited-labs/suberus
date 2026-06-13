import { isPast } from "date-fns";

import type { getSubmissionForEditor } from "@/lib/server/admin/submissions";
import type { SubmissionTypeConfig } from "@/lib/settings/types";

// Derived from the editor-submission query payload so these stay in sync with
// the server shape. `import type` is erased at build — no server/client leak.
export type EditorSubmissionData = NonNullable<
	Awaited<ReturnType<typeof getSubmissionForEditor>>
>;
export type EditorSubmission = EditorSubmissionData["submission"];
export type EditorAuthor = EditorSubmissionData["authors"][number];
export type EditorAssignment = EditorSubmissionData["assignments"][number];
export type EditorReview = EditorSubmissionData["reviews"][number];
export type EditorVersion = EditorSubmissionData["versions"][number];
export type EditorActivity = EditorSubmissionData["activityHistory"][number];

/** Whether a pending assignment's deadline has passed. */
export function isOverdue(
	deadline: Date | string | null,
	status: string,
): boolean {
	if (!deadline || status === "COMPLETED" || status === "CANCELLED") {
		return false;
	}
	return isPast(new Date(deadline));
}

export interface ActionAvailability {
	canAssignReviewers: boolean;
	canDeskAccept: boolean;
	canDeskReject: boolean;
	canTransitionToAwaitingDecision: boolean;
	canMakeDecision: boolean;
	canConfirmConditions: boolean;
	canOverrideDecision: boolean;
}

/**
 * Which editor actions a submission allows, by status and type.
 * EXHIBITOR entries are never peer-reviewed and are decided via the exhibitor
 * approval flow, so reviewer assignment and desk/override decisions are excluded.
 */
export function getActionAvailability(
	submission: Pick<EditorSubmission, "type" | "status">,
	config: Pick<SubmissionTypeConfig, "requiresEditorDecision">,
): ActionAvailability {
	const isExhibitor = submission.type === "EXHIBITOR";
	return {
		canAssignReviewers:
			!isExhibitor &&
			["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(submission.status),
		canDeskAccept: submission.status === "SUBMITTED" && !isExhibitor,
		canDeskReject: submission.status === "SUBMITTED" && !isExhibitor,
		canTransitionToAwaitingDecision:
			submission.status === "REVIEWS_COMPLETE" && config.requiresEditorDecision,
		canMakeDecision:
			submission.status === "AWAITING_DECISION" ||
			submission.status === "REVIEWS_COMPLETE",
		canConfirmConditions: submission.status === "CONDITIONALLY_ACCEPTED",
		canOverrideDecision:
			!isExhibitor &&
			["ACCEPTED", "CONDITIONALLY_ACCEPTED", "REJECTED"].includes(
				submission.status,
			),
	};
}

export type PrimaryAction = "transition" | "decision" | "conditions";

/** The single contextual primary action; everything else goes to the menu. */
export function getPrimaryAction(
	availability: ActionAvailability,
): PrimaryAction | null {
	if (availability.canTransitionToAwaitingDecision) return "transition";
	if (availability.canMakeDecision) return "decision";
	if (availability.canConfirmConditions) return "conditions";
	return null;
}

/** Distinct review rounds, newest first. */
export function getReviewRounds(
	reviews: readonly { round: number }[],
): number[] {
	return [...new Set(reviews.map((r) => r.round))].sort((a, b) => b - a);
}

/** Reviews matching the selected round filter ("all" | "current" | a round number). */
export function filterReviewsByRound<T extends { round: number }>(
	reviews: T[],
	selected: string,
	currentRound: number,
): T[] {
	if (selected === "all") return reviews;
	if (selected === "current") {
		return reviews.filter((r) => r.round === currentRound);
	}
	return reviews.filter((r) => r.round === Number(selected));
}

export interface ReviewProgress<T> {
	currentRoundAssignments: T[];
	completedAssignments: T[];
	progress: number;
}

/** Current-round assignment counts and completion percentage. */
export function computeReviewProgress<
	T extends { round: number; status: string },
>(assignments: T[], currentRound: number): ReviewProgress<T> {
	const currentRoundAssignments = assignments.filter(
		(a) => a.round === currentRound && a.status !== "CANCELLED",
	);
	const completedAssignments = currentRoundAssignments.filter(
		(a) => a.status === "COMPLETED",
	);
	const progress =
		currentRoundAssignments.length > 0
			? (completedAssignments.length / currentRoundAssignments.length) * 100
			: 0;
	return { currentRoundAssignments, completedAssignments, progress };
}

export interface DisplayedVersion {
	effectiveVersion: number;
	content: string;
	file: EditorSubmission["file"];
}

/** Content/file to show: the selected older version, else the current submission. */
export function resolveDisplayedVersion(
	versions: Pick<EditorVersion, "version" | "content" | "file">[],
	selectedVersion: number | null,
	submission: Pick<
		EditorSubmission,
		"currentVersionNumber" | "content" | "file"
	>,
): DisplayedVersion {
	const effectiveVersion = selectedVersion ?? submission.currentVersionNumber;
	const displayedVersion = versions.find((v) => v.version === effectiveVersion);
	return {
		effectiveVersion,
		content: displayedVersion?.content ?? submission.content,
		file: displayedVersion?.file ?? submission.file,
	};
}

/** Whether the author uploaded a revised version (e.g. after conditional accept). */
export function hasRevisionUpload(
	activityHistory: readonly { activityType: string }[],
): boolean {
	return activityHistory.some(
		(e) => e.activityType === "SUBMISSION_REVISION_UPLOADED",
	);
}
