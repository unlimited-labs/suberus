export type ExhibitorDecision = "APPROVED" | "REJECTED";

export function exhibitorDecisionEventType(
	decision: ExhibitorDecision,
): "EXHIBITOR_APPROVED" | "EXHIBITOR_REJECTED" {
	return decision === "APPROVED" ? "EXHIBITOR_APPROVED" : "EXHIBITOR_REJECTED";
}

export function canDecideExhibitor(exhibitor: {
	status: string;
	appliedAt: Date | null;
}): boolean {
	return exhibitor.status === "PENDING" && exhibitor.appliedAt !== null;
}
