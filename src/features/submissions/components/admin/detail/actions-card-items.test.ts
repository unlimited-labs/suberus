import { describe, expect, it } from "vitest";
import { buildSecondaryActions } from "./actions-card-items";
import type { ActionAvailability } from "./availability";

const none: ActionAvailability = {
	canSubmitDraft: false,
	canAssignReviewers: false,
	canDeskAccept: false,
	canDeskReject: false,
	canTransitionToAwaitingDecision: false,
	canMakeDecision: false,
	canConfirmConditions: false,
	canOverrideDecision: false,
};

const ids = (a: ReturnType<typeof buildSecondaryActions>) => a.map((i) => i.id);

describe("buildSecondaryActions", () => {
	it("returns nothing when no actions are available", () => {
		expect(buildSecondaryActions(none, null)).toEqual([]);
	});

	it("includes every available action in menu order", () => {
		const all: ActionAvailability = {
			canSubmitDraft: true,
			canAssignReviewers: true,
			canDeskAccept: true,
			canDeskReject: true,
			canTransitionToAwaitingDecision: true,
			canMakeDecision: true,
			canConfirmConditions: true,
			canOverrideDecision: true,
		};
		expect(ids(buildSecondaryActions(all, null))).toEqual([
			"submitDraft",
			"assign",
			"deskAccept",
			"deskReject",
			"transition",
			"decision",
			"conditions",
			"override",
		]);
	});

	it("omits the action already shown as the primary button", () => {
		const avail: ActionAvailability = {
			...none,
			canTransitionToAwaitingDecision: true,
			canMakeDecision: true,
			canConfirmConditions: true,
		};
		expect(ids(buildSecondaryActions(avail, "transition"))).toEqual([
			"decision",
			"conditions",
		]);
		expect(ids(buildSecondaryActions(avail, "decision"))).toEqual([
			"transition",
			"conditions",
		]);
		expect(ids(buildSecondaryActions(avail, "conditions"))).toEqual([
			"transition",
			"decision",
		]);
	});

	it("maps the transition action to a transition select, others to dialogs", () => {
		const avail: ActionAvailability = {
			...none,
			canTransitionToAwaitingDecision: true,
			canOverrideDecision: true,
		};
		const items = buildSecondaryActions(avail, null);
		expect(items.find((i) => i.id === "transition")?.select).toEqual({
			type: "transition",
		});
		expect(items.find((i) => i.id === "override")?.select).toEqual({
			type: "dialog",
			kind: "override",
		});
	});
});
