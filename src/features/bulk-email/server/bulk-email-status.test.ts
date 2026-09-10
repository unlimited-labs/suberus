import { describe, expect, it } from "vitest";
import {
	campaignExpireSeconds,
	finalCampaignStatus,
	hasLiveJob,
	RESUMABLE_CAMPAIGN_STATUSES,
} from "./bulk-email-status";

describe("RESUMABLE_CAMPAIGN_STATUSES", () => {
	it("lets the worker claim a scheduled, queued or in-flight campaign", () => {
		expect(RESUMABLE_CAMPAIGN_STATUSES).toEqual([
			"SCHEDULED",
			"QUEUED",
			"SENDING",
		]);
	});

	it("never re-sends a DRAFT, SENT or FAILED campaign", () => {
		for (const status of ["DRAFT", "SENT", "FAILED"] as const) {
			expect(RESUMABLE_CAMPAIGN_STATUSES).not.toContain(status);
		}
	});
});

describe("hasLiveJob", () => {
	it("is false before the job can run", () => {
		expect(hasLiveJob("DRAFT")).toBe(false);
		expect(hasLiveJob("SCHEDULED")).toBe(false);
	});

	it("is true once it is queued", () => {
		expect(hasLiveJob("QUEUED")).toBe(true);
		expect(hasLiveJob("SENDING")).toBe(true);
	});
});

describe("finalCampaignStatus", () => {
	it("is FAILED only when nothing sent and something failed", () => {
		expect(finalCampaignStatus(0, 3)).toBe("FAILED");
	});

	it("is SENT when at least one succeeded", () => {
		expect(finalCampaignStatus(2, 1)).toBe("SENT");
		expect(finalCampaignStatus(5, 0)).toBe("SENT");
	});

	it("is SENT for an empty campaign (nothing failed)", () => {
		expect(finalCampaignStatus(0, 0)).toBe("SENT");
	});
});

describe("campaignExpireSeconds", () => {
	it("applies a floor for tiny campaigns", () => {
		expect(campaignExpireSeconds(1, 5)).toBe(900);
	});

	it("always exceeds the worst-case run time (total × delay)", () => {
		const total = 500;
		const delay = 5;
		expect(campaignExpireSeconds(total, delay)).toBeGreaterThan(total * delay);
	});
});
