import { describe, expect, it } from "vitest";
import {
	campaignExpireSeconds,
	finalCampaignStatus,
	isResumableCampaignStatus,
} from "./bulk-email-status";

describe("isResumableCampaignStatus", () => {
	it("allows QUEUED and SENDING (resume)", () => {
		expect(isResumableCampaignStatus("QUEUED")).toBe(true);
		expect(isResumableCampaignStatus("SENDING")).toBe(true);
	});

	it("blocks DRAFT, SENT and FAILED (no re-send)", () => {
		expect(isResumableCampaignStatus("DRAFT")).toBe(false);
		expect(isResumableCampaignStatus("SENT")).toBe(false);
		expect(isResumableCampaignStatus("FAILED")).toBe(false);
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
