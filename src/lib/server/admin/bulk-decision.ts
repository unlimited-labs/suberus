import type { SubmissionStatus } from "@/generated/prisma/enums";

export type BulkDecisionType =
	| "ACCEPT"
	| "CONDITIONALLY_ACCEPT"
	| "REVISE_AND_RESUBMIT"
	| "REJECT";

/** Editor-decision type recorded for a bulk status change. */
export function decisionTypeFor(
	targetStatus: SubmissionStatus,
): BulkDecisionType {
	switch (targetStatus) {
		case "ACCEPTED":
			return "ACCEPT";
		case "CONDITIONALLY_ACCEPTED":
			return "CONDITIONALLY_ACCEPT";
		case "REVISE_REQUIRED":
			return "REVISE_AND_RESUBMIT";
		default:
			return "REJECT";
	}
}
