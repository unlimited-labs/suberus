import { describe, expect, it } from "vitest";
import { UploadValidationError } from "@/shared/server/validate-upload";
import {
	assertTotalWithinCap,
	MAX_CAMPAIGN_ATTACHMENTS_BYTES,
} from "./attachment-limits";

describe("assertTotalWithinCap", () => {
	it("allows a total at the cap", () => {
		expect(() =>
			assertTotalWithinCap(MAX_CAMPAIGN_ATTACHMENTS_BYTES - 100, 100),
		).not.toThrow();
	});

	it("rejects a total over the cap", () => {
		expect(() =>
			assertTotalWithinCap(MAX_CAMPAIGN_ATTACHMENTS_BYTES, 1),
		).toThrow(UploadValidationError);
	});
});
