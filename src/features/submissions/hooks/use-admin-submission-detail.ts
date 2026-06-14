import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { adminSettingQueryOptions } from "@/features/settings/api/settings";
import type { SubmissionTypeConfig } from "@/features/settings/types";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import { editorSubmissionQueryOptions } from "@/features/submissions/api/admin-submissions";
import {
	type ActionAvailability,
	computeReviewProgress,
	type EditorAssignment,
	type EditorReview,
	type EditorSubmissionData,
	filterReviewsByRound,
	getActionAvailability,
	getPrimaryAction,
	getReviewRounds,
	hasRevisionUpload,
	type PrimaryAction,
} from "@/features/submissions/components/admin/detail/availability";
import type { AvailableTrack } from "@/features/submissions/types";

export interface AdminSubmissionDetailReady {
	status: "ready";
	data: EditorSubmissionData;
	config: SubmissionTypeConfig;
	availableTracks: AvailableTrack[];
	availability: ActionAvailability;
	primaryAction: PrimaryAction | null;
	currentRoundReviews: EditorReview[];
	currentRoundAssignments: EditorAssignment[];
	completedAssignments: EditorAssignment[];
	reviewProgress: number;
	allReviewRounds: number[];
	revisionUploaded: boolean;
}

export type AdminSubmissionDetail =
	| { status: "not-found" }
	| AdminSubmissionDetailReady;

/**
 * Loads an admin submission detail (submission + its type config + tracks) and
 * derives the workflow state the page renders from. Returns a discriminated
 * result so callers narrow to `ready` without null checks.
 */
export function useAdminSubmissionDetail(
	id: string,
	availableTracks: AvailableTrack[],
): AdminSubmissionDetail {
	const { data } = useSuspenseQuery(editorSubmissionQueryOptions(id));

	const configKey = data
		? SUBMISSION_TYPE_TO_KEY[data.submission.type]
		: undefined;
	const { data: config } = useQuery({
		...adminSettingQueryOptions(
			configKey ?? "SUBMISSION_TYPE_ORAL_PRESENTATION",
		),
		enabled: !!configKey,
	});

	if (!data || !config) return { status: "not-found" };

	const { submission, assignments, reviews, activityHistory } = data;
	const availability = getActionAvailability(submission, config);
	const { currentRoundAssignments, completedAssignments, progress } =
		computeReviewProgress(assignments, submission.currentRound);

	return {
		status: "ready",
		data,
		config,
		availableTracks,
		availability,
		primaryAction: getPrimaryAction(availability),
		currentRoundReviews: filterReviewsByRound(
			reviews,
			"current",
			submission.currentRound,
		),
		currentRoundAssignments,
		completedAssignments,
		reviewProgress: progress,
		allReviewRounds: getReviewRounds(reviews),
		revisionUploaded: hasRevisionUpload(activityHistory),
	};
}
