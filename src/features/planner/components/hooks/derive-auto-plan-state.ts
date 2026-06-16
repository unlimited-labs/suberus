import type { AutoPlanProposal } from "@/features/planner/server/autoplan-types";

/** The slice of the auto-plan job result this derivation reads. */
export interface AutoPlanJobView {
	notFound: boolean;
	proposal?: AutoPlanProposal | null;
	appliedAt?: string | null;
}

export interface AutoPlanStateInput {
	jobData: AutoPlanJobView | undefined;
	startPending: boolean;
	sseStatus: string | null;
	sseError: string | null | undefined;
	applyError: Error | null;
	startError: Error | null;
}

export interface AutoPlanState {
	running: boolean;
	proposal: AutoPlanProposal | null;
	errorMsg: string | null;
}

/** First non-null error across the SSE stream, apply, and start mutations. */
function resolveAutoPlanError(
	sseStatus: string | null,
	sseError: string | null | undefined,
	applyError: Error | null,
	startError: Error | null,
): string | null {
	if (sseStatus === "error") return sseError ?? "Unknown error";
	if (applyError) return applyError.message;
	if (startError) return startError.message;
	return null;
}

/**
 * Derives the auto-plan view state from the job query, SSE status and mutation
 * states: whether work is running, the applyable proposal (only once the job is
 * done and not yet applied), and the first error message. Pure and testable.
 */
export function deriveAutoPlanState(input: AutoPlanStateInput): AutoPlanState {
	const data = input.jobData && !input.jobData.notFound ? input.jobData : null;
	const running =
		input.startPending ||
		input.sseStatus === "running" ||
		input.sseStatus === "pending";
	const proposal =
		input.sseStatus === "done" && data?.proposal && !data.appliedAt
			? data.proposal
			: null;
	const errorMsg = resolveAutoPlanError(
		input.sseStatus,
		input.sseError,
		input.applyError,
		input.startError,
	);
	return { running, proposal, errorMsg };
}
