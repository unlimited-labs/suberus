import type { AutoPlanProposal } from "@/features/planner/server/autoplan-types";

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
