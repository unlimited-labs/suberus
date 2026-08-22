import {
	IconCheck,
	IconGavel,
	IconSend,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import type { ActionAvailability, PrimaryAction } from "./availability";
import type { SubmissionDialogKind } from "./detail-dialogs";

export type SecondaryActionSelect =
	| { type: "dialog"; kind: SubmissionDialogKind }
	| { type: "transition" };

export interface SecondaryAction {
	id: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	select: SecondaryActionSelect;
}

/**
 * The dropdown-menu actions a submission offers, given availability flags and
 * the contextual primary action (which is rendered as a dedicated button, so it
 * is omitted from the menu). Pure so the visibility matrix is unit-testable.
 */
export function buildSecondaryActions(
	availability: ActionAvailability,
	primaryAction: PrimaryAction | null,
): SecondaryAction[] {
	const items: SecondaryAction[] = [];

	if (availability.canSubmitDraft) {
		items.push({
			id: "submitDraft",
			label: "Submit Draft",
			icon: IconSend,
			select: { type: "dialog", kind: "submitDraft" },
		});
	}
	if (availability.canAssignReviewers) {
		items.push({
			id: "assign",
			label: "Assign Reviewer",
			icon: IconUsers,
			select: { type: "dialog", kind: "assign" },
		});
	}
	if (availability.canDeskAccept) {
		items.push({
			id: "deskAccept",
			label: "Desk Accept",
			icon: IconCheck,
			select: { type: "dialog", kind: "deskAccept" },
		});
	}
	if (availability.canDeskReject) {
		items.push({
			id: "deskReject",
			label: "Desk Reject",
			icon: IconX,
			select: { type: "dialog", kind: "deskReject" },
		});
	}
	if (
		availability.canTransitionToAwaitingDecision &&
		primaryAction !== "transition"
	) {
		items.push({
			id: "transition",
			label: "Ready for Decision",
			icon: IconGavel,
			select: { type: "transition" },
		});
	}
	if (availability.canMakeDecision && primaryAction !== "decision") {
		items.push({
			id: "decision",
			label: "Make Decision",
			icon: IconGavel,
			select: { type: "dialog", kind: "decision" },
		});
	}
	if (availability.canConfirmConditions && primaryAction !== "conditions") {
		items.push({
			id: "conditions",
			label: "Confirm Conditions Met",
			icon: IconCheck,
			select: { type: "dialog", kind: "confirmConditions" },
		});
	}
	if (availability.canOverrideDecision) {
		items.push({
			id: "override",
			label: "Override Decision",
			icon: IconGavel,
			select: { type: "dialog", kind: "override" },
		});
	}

	return items;
}
