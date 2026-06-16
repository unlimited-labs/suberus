import type { EventFormProps } from "@ilamy/calendar";
import { describe, expect, it } from "vitest";
import { buildEventFormDefaults, toDate } from "./create-event-form-helpers";

type SelectedEvent = EventFormProps["selectedEvent"];
const selected = (over: Record<string, unknown>): SelectedEvent =>
	over as unknown as SelectedEvent;

const defaultStartAt = new Date("2026-04-22T09:00:00Z");
const rooms = [{ id: "roomA" }, { id: "roomB" }];
const base = {
	timezone: "UTC",
	defaultStartAt,
	rooms,
	defaultPresentationMin: 20,
};

describe("toDate", () => {
	it("passes through Date and parses strings/numbers", () => {
		const d = new Date("2026-01-01");
		expect(toDate(d)).toBe(d);
		expect(toDate("2026-01-01")).toEqual(new Date("2026-01-01"));
		expect(toDate(0)).toEqual(new Date(0));
	});

	it("unwraps a dayjs-like object via toDate()", () => {
		const d = new Date("2026-02-02");
		expect(toDate({ toDate: () => d })).toBe(d);
	});

	it("returns null for nullish or invalid input", () => {
		expect(toDate(null)).toBeNull();
		expect(toDate(undefined)).toBeNull();
		expect(toDate("not a date")).toBeNull();
		expect(toDate({})).toBeNull();
	});
});

describe("buildEventFormDefaults", () => {
	it("falls back to the first room and a 30min break with no selection", () => {
		const v = buildEventFormDefaults({ ...base, selectedEvent: undefined });
		expect(v.roomId).toBe("roomA");
		expect(v.breakDurationMin).toBe(30);
		expect(v.type).toBe("session");
		expect(v.minutesPerPresentation).toBe(20);
	});

	it("uses the clicked resource and derives break from the dragged span", () => {
		const v = buildEventFormDefaults({
			...base,
			selectedEvent: selected({
				resourceId: "roomB",
				start: new Date("2026-04-22T10:00:00Z"),
				end: new Date("2026-04-22T10:45:00Z"),
			}),
		});
		expect(v.roomId).toBe("roomB");
		expect(v.breakDurationMin).toBe(45);
	});

	it("clamps the derived break duration to 5–180 minutes", () => {
		const long = buildEventFormDefaults({
			...base,
			selectedEvent: selected({
				start: new Date("2026-04-22T10:00:00Z"),
				end: new Date("2026-04-22T15:00:00Z"),
			}),
		});
		expect(long.breakDurationMin).toBe(180);
	});

	it("coerces a numeric resource id to a string", () => {
		const v = buildEventFormDefaults({
			...base,
			selectedEvent: selected({ resourceId: 7 }),
		});
		expect(v.roomId).toBe("7");
	});
});
