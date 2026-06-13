import { describe, expect, it } from "vitest";

import type { SubmissionStatus } from "@/generated/prisma/enums";

import { decisionTypeFor } from "./bulk-decision";

describe("decisionTypeFor", () => {
	it("maps each decision status to its editor-decision type", () => {
		expect(decisionTypeFor("ACCEPTED")).toBe("ACCEPT");
		expect(decisionTypeFor("CONDITIONALLY_ACCEPTED")).toBe(
			"CONDITIONALLY_ACCEPT",
		);
		expect(decisionTypeFor("REVISE_REQUIRED")).toBe("REVISE_AND_RESUBMIT");
		expect(decisionTypeFor("REJECTED")).toBe("REJECT");
	});

	it("defaults to REJECT for any other status", () => {
		expect(decisionTypeFor("WITHDRAWN" as SubmissionStatus)).toBe("REJECT");
	});
});
