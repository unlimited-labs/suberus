import { describe, expect, it } from "vitest";
import {
	canDecideExhibitor,
	exhibitorDecisionEventType,
} from "./exhibitor-decision-helpers";

describe("exhibitorDecisionEventType", () => {
	it("maps the decision to its event type", () => {
		expect(exhibitorDecisionEventType("APPROVED")).toBe("EXHIBITOR_APPROVED");
		expect(exhibitorDecisionEventType("REJECTED")).toBe("EXHIBITOR_REJECTED");
	});
});

describe("canDecideExhibitor", () => {
	it("allows a pending, completed application", () => {
		expect(
			canDecideExhibitor({ status: "PENDING", appliedAt: new Date() }),
		).toBe(true);
	});

	it("rejects a non-pending status", () => {
		expect(
			canDecideExhibitor({ status: "APPROVED", appliedAt: new Date() }),
		).toBe(false);
	});

	it("rejects a pending application that was never completed", () => {
		expect(canDecideExhibitor({ status: "PENDING", appliedAt: null })).toBe(
			false,
		);
	});
});
