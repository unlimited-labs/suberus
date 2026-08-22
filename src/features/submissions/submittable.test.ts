import { describe, expect, it } from "vitest";
import { SubmissionType } from "@/generated/prisma/enums";
import { isNonSubmittable, NON_SUBMITTABLE_TYPES } from "./submittable";

// Guards the one place six call sites now agree on: adding a SubmissionType
// must be a deliberate choice about whether it enters the review pipeline.
describe("isNonSubmittable", () => {
	it("rejects the placeholder types", () => {
		expect(isNonSubmittable("EXHIBITOR")).toBe(true);
		expect(isNonSubmittable("INVITED")).toBe(true);
	});

	it("accepts every type an author actually submits", () => {
		const submittable = Object.values(SubmissionType).filter(
			(t) => !NON_SUBMITTABLE_TYPES.some((n) => n === t),
		);
		expect(submittable.length).toBeGreaterThan(0);
		for (const type of submittable) {
			expect(isNonSubmittable(type)).toBe(false);
		}
	});

	it("only lists real enum members, so a typo cannot silently stop matching", () => {
		const all: string[] = Object.values(SubmissionType);
		for (const type of NON_SUBMITTABLE_TYPES) {
			expect(all).toContain(type);
		}
	});
});
