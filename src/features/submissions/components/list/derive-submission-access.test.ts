import { describe, expect, it } from "vitest";
import {
	deriveSubmissionAccess,
	type SubmissionAccessInput,
} from "./derive-submission-access";

const now = new Date("2026-04-01T00:00:00Z");

const base: SubmissionAccessInput = {
	deadline: "2026-04-20T00:00:00Z",
	locked: false,
	canBypass: false,
	activeTypeCount: 2,
	now,
};

describe("deriveSubmissionAccess", () => {
	it("allows submitting within an open window with active types", () => {
		const a = deriveSubmissionAccess(base);
		expect(a.canSubmit).toBe(true);
		expect(a.disabledReason).toBe("");
		expect(a.deadlineUrgent).toBe(false);
		expect(a.deadlineCritical).toBe(false);
	});

	it("flags urgency within 7 and 3 days", () => {
		expect(
			deriveSubmissionAccess({ ...base, deadline: "2026-04-06T00:00:00Z" }),
		).toMatchObject({ deadlineUrgent: true, deadlineCritical: false });
		expect(
			deriveSubmissionAccess({ ...base, deadline: "2026-04-03T00:00:00Z" }),
		).toMatchObject({ deadlineUrgent: true, deadlineCritical: true });
	});

	it("blocks when locked (admin closed)", () => {
		const a = deriveSubmissionAccess({ ...base, locked: true });
		expect(a.canSubmit).toBe(false);
		expect(a.disabledReason).toBe(
			"Submissions have been closed by the administrator",
		);
	});

	it("blocks past the deadline", () => {
		const a = deriveSubmissionAccess({
			...base,
			deadline: "2026-03-01T00:00:00Z",
		});
		expect(a.canSubmit).toBe(false);
		expect(a.disabledReason).toBe("The submission deadline has passed");
	});

	it("blocks with no active types", () => {
		const a = deriveSubmissionAccess({ ...base, activeTypeCount: 0 });
		expect(a.canSubmit).toBe(false);
		expect(a.disabledReason).toBe("No submission types are currently active");
	});

	it("lets a bypassing author submit even when locked and past deadline", () => {
		const a = deriveSubmissionAccess({
			...base,
			locked: true,
			canBypass: true,
			deadline: "2026-03-01T00:00:00Z",
		});
		expect(a.canSubmit).toBe(true);
		expect(a.disabledReason).toBe("");
	});

	it("treats a missing deadline as open and never urgent", () => {
		const a = deriveSubmissionAccess({ ...base, deadline: null });
		expect(a.canSubmit).toBe(true);
		expect(a.deadlineUrgent).toBe(false);
		expect(a.deadlineCritical).toBe(false);
	});
});
