import { describe, expect, it } from "vitest";
import type { AssignmentStatus } from "@/generated/prisma/enums";
import { compareAssignmentUrgency } from "./assignment-urgency";

const now = new Date("2026-06-15T12:00:00Z");
const past = new Date("2026-06-10T12:00:00Z");
const future = new Date("2026-06-20T12:00:00Z");

const a = (status: AssignmentStatus, deadline: Date | null = null) => ({
	status,
	deadline,
});

describe("compareAssignmentUrgency", () => {
	it("sorts completed after non-completed", () => {
		expect(compareAssignmentUrgency(a("COMPLETED"), a("PENDING"), now)).toBe(1);
		expect(compareAssignmentUrgency(a("PENDING"), a("COMPLETED"), now)).toBe(
			-1,
		);
	});

	it("falls through when both completed (compares by deadline)", () => {
		expect(
			compareAssignmentUrgency(
				a("COMPLETED", past),
				a("COMPLETED", future),
				now,
			),
		).toBeLessThan(0);
		expect(compareAssignmentUrgency(a("COMPLETED"), a("COMPLETED"), now)).toBe(
			0,
		);
	});

	it("sorts overdue-by-status before non-overdue", () => {
		expect(
			compareAssignmentUrgency(a("OVERDUE"), a("PENDING", future), now),
		).toBe(-1);
		expect(
			compareAssignmentUrgency(a("PENDING", future), a("OVERDUE"), now),
		).toBe(1);
	});

	it("treats a past deadline as overdue even when status is not OVERDUE", () => {
		expect(
			compareAssignmentUrgency(a("PENDING", past), a("PENDING", future), now),
		).toBe(-1);
	});

	it("sorts by earliest deadline when both same urgency tier", () => {
		expect(
			compareAssignmentUrgency(a("PENDING", future), a("PENDING", future), now),
		).toBe(0);
		const earlier = new Date("2026-06-18T12:00:00Z");
		expect(
			compareAssignmentUrgency(
				a("PENDING", earlier),
				a("PENDING", future),
				now,
			),
		).toBeLessThan(0);
	});

	it("orders assignments without a deadline last", () => {
		expect(
			compareAssignmentUrgency(a("PENDING"), a("PENDING", future), now),
		).toBe(1);
		expect(
			compareAssignmentUrgency(a("PENDING", future), a("PENDING"), now),
		).toBe(-1);
		expect(compareAssignmentUrgency(a("PENDING"), a("PENDING"), now)).toBe(0);
	});
});
