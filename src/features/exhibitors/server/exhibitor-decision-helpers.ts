export type ExhibitorDecision = "APPROVED" | "REJECTED";

/** Activity-log and email event type for an exhibitor decision. */
export function exhibitorDecisionEventType(
	decision: ExhibitorDecision,
): "EXHIBITOR_APPROVED" | "EXHIBITOR_REJECTED" {
	return decision === "APPROVED" ? "EXHIBITOR_APPROVED" : "EXHIBITOR_REJECTED";
}

/** Only a pending application that the exhibitor actually completed can be decided. */
export function canDecideExhibitor(exhibitor: {
	status: string;
	appliedAt: Date | null;
}): boolean {
	return exhibitor.status === "PENDING" && exhibitor.appliedAt !== null;
}
