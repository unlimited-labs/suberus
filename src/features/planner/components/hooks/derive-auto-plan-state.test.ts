import { describe, expect, it } from "vitest";
import type { AutoPlanProposal } from "@/features/planner/server/autoplan-types";
import {
	type AutoPlanStateInput,
	deriveAutoPlanState,
} from "./derive-auto-plan-state";

const proposal = {} as AutoPlanProposal;

const base: AutoPlanStateInput = {
	jobData: undefined,
	startPending: false,
	sseStatus: "idle",
	sseError: null,
	applyError: null,
	startError: null,
};

describe("deriveAutoPlanState", () => {
	it("is running while starting or while the SSE job runs", () => {
		expect(deriveAutoPlanState({ ...base, startPending: true }).running).toBe(
			true,
		);
		expect(deriveAutoPlanState({ ...base, sseStatus: "running" }).running).toBe(
			true,
		);
		expect(deriveAutoPlanState({ ...base, sseStatus: "pending" }).running).toBe(
			true,
		);
		expect(deriveAutoPlanState(base).running).toBe(false);
	});

	it("exposes the proposal only when done, present and not yet applied", () => {
		expect(
			deriveAutoPlanState({
				...base,
				sseStatus: "done",
				jobData: { notFound: false, proposal, appliedAt: null },
			}).proposal,
		).toBe(proposal);

		// Already applied → no proposal to act on.
		expect(
			deriveAutoPlanState({
				...base,
				sseStatus: "done",
				jobData: { notFound: false, proposal, appliedAt: "2026-01-01" },
			}).proposal,
		).toBeNull();

		// Not done yet.
		expect(
			deriveAutoPlanState({
				...base,
				sseStatus: "running",
				jobData: { notFound: false, proposal, appliedAt: null },
			}).proposal,
		).toBeNull();
	});

	it("ignores a not-found job result", () => {
		expect(
			deriveAutoPlanState({
				...base,
				sseStatus: "done",
				jobData: { notFound: true },
			}).proposal,
		).toBeNull();
	});

	it("prioritizes SSE error, then apply, then start", () => {
		expect(
			deriveAutoPlanState({ ...base, sseStatus: "error", sseError: "boom" })
				.errorMsg,
		).toBe("boom");
		expect(deriveAutoPlanState({ ...base, sseStatus: "error" }).errorMsg).toBe(
			"Unknown error",
		);
		expect(
			deriveAutoPlanState({ ...base, applyError: new Error("apply failed") })
				.errorMsg,
		).toBe("apply failed");
		expect(
			deriveAutoPlanState({ ...base, startError: new Error("start failed") })
				.errorMsg,
		).toBe("start failed");
		expect(deriveAutoPlanState(base).errorMsg).toBeNull();
	});
});
