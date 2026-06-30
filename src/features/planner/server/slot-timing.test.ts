import { describe, expect, it } from "vitest";
import { isReminderDue, slotStartAt } from "./slot-timing";

const base = new Date("2026-06-30T09:00:00.000Z");
const slots = [
	{ order: 0, durationMin: 20 },
	{ order: 1, durationMin: 15 },
	{ order: 2, durationMin: 30 },
];

describe("slotStartAt", () => {
	it("returns the session start for the first slot", () => {
		expect(slotStartAt(base, slots, 0).toISOString()).toBe(base.toISOString());
	});

	it("offsets by the cumulative duration of earlier slots", () => {
		expect(slotStartAt(base, slots, 1).toISOString()).toBe(
			"2026-06-30T09:20:00.000Z",
		);
		expect(slotStartAt(base, slots, 2).toISOString()).toBe(
			"2026-06-30T09:35:00.000Z",
		);
	});

	it("ignores slot order in the array, summing by order value", () => {
		const shuffled = [slots[2], slots[0], slots[1]];
		expect(slotStartAt(base, shuffled, 2).toISOString()).toBe(
			"2026-06-30T09:35:00.000Z",
		);
	});
});

describe("isReminderDue", () => {
	const start = base.getTime();
	const lead = 5;

	it("is false before the lead window opens", () => {
		expect(isReminderDue(start, start - 6 * 60_000, lead)).toBe(false);
	});

	it("is true inside the lead window", () => {
		expect(isReminderDue(start, start - 5 * 60_000, lead)).toBe(true);
		expect(isReminderDue(start, start - 1 * 60_000, lead)).toBe(true);
	});

	it("is false once the talk has started", () => {
		expect(isReminderDue(start, start, lead)).toBe(false);
		expect(isReminderDue(start, start + 1, lead)).toBe(false);
	});
});
