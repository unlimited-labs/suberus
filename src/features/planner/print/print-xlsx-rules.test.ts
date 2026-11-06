import { describe, expect, it } from "vitest";
import { printOptionsSchema } from "./print-options-schema";
import { buildPrintProgram, type PrintSource } from "./print-program-rules";
import { buildXlsxSheets } from "./print-xlsx-rules";

const src: PrintSource = {
	conferenceName: "Polymers 2026",
	startDate: "2026-09-14",
	endDate: "2026-09-14",
	timeZone: "Europe/Warsaw",
	timeFormat: "24h",
	draft: false,
	rooms: [
		{ id: "a", name: "Aula", order: 0 },
		{ id: "b", name: "Sala 2", order: 1 },
	],
	badges: [],
	sessions: [
		{
			id: "s1",
			title: "Opening",
			startAt: new Date("2026-09-14T08:00:00Z"),
			endAt: new Date("2026-09-14T09:00:00Z"),
			untimedSlots: false,
			roomId: "a",
			track: { name: "Polymers", color: "#f00" },
			chairs: [
				{ userId: "u9", email: "c@x.org", firstName: "Adam", lastName: "Lis" },
			],
			slots: [
				{
					id: "p1",
					order: 0,
					durationMin: 20,
					cancelled: false,
					badgeId: null,
					submission: {
						id: "sub1",
						sequentialNumber: 7,
						title: "Chain growth",
						type: "ABSTRACT",
						presenterId: "au1",
						authors: [
							{
								id: "au1",
								userId: null,
								email: "e@x.org",
								firstName: "Ewa",
								lastName: "Zając",
								orderIndex: 0,
								isPresenter: true,
							},
						],
					},
				},
			],
		},
		{
			id: "s2",
			title: "Parallel",
			startAt: new Date("2026-09-14T08:00:00Z"),
			endAt: new Date("2026-09-14T09:00:00Z"),
			untimedSlots: false,
			roomId: "b",
			track: null,
			chairs: [],
			slots: [],
		},
	],
	items: [
		{
			id: "c",
			kind: "BREAK",
			title: "Coffee",
			description: null,
			location: "Foyer",
			roomId: null,
			startAt: new Date("2026-09-14T09:00:00Z"),
			endAt: new Date("2026-09-14T09:30:00Z"),
		},
	],
};

const options = printOptionsSchema.parse({});
const sheetsFor = (o = options) =>
	buildXlsxSheets(buildPrintProgram(src, o), o);

describe("buildXlsxSheets", () => {
	it("writes the Program list, one grid sheet per day and the Authors list", () => {
		expect(sheetsFor().map((s) => s.name)).toEqual([
			"Program",
			"D1 Mon 14 Sept",
			"Authors",
		]);
	});

	it("lists one Program row per slot, per empty session and per break, with the session repeated on each row", () => {
		const [program] = sheetsFor();
		const header = program?.rows[0] ?? [];
		const col = (name: string) => header.indexOf(name);
		const rows = program?.rows.slice(1) ?? [];
		expect(
			rows.map((r) => [
				r[col("Session code")],
				r[col("Type")],
				r[col("Start")],
				r[col("Title")],
				r[col("Presenter")],
				r[col("Submission ID")],
			]),
		).toEqual([
			["1A1", "Slot", "10:00", "Chain growth", "Ewa Zając", 7],
			["1B1", "Session", "10:00", "", "", ""],
			["", "Break", "11:00", "Coffee", "", ""],
		]);
		expect(rows[0]?.[col("Date")]).toEqual(new Date("2026-09-14T00:00:00Z"));
		expect(header).not.toContain("Cancelled");
		expect(program?.autofilter).toBe(true);
	});

	it("lays the day grid out with rooms as columns, code and title in a cell, and the break merged across rooms", () => {
		const grid = sheetsFor()[1];
		expect(grid?.rows).toEqual([
			["Time", "Aula", "Sala 2"],
			["10:00–11:00", "1A1 — Opening", "1B1 — Parallel"],
			["11:00–11:30", "Coffee", null],
		]);
		expect(grid?.merges).toEqual([{ s: { r: 2, c: 1 }, e: { r: 2, c: 2 } }]);
	});

	it("writes one Authors row per appearance, chairs included, in Polish when asked", () => {
		const authors = sheetsFor({ ...options, language: "pl" })[2];
		expect(authors?.name).toBe("Autorzy");
		expect(authors?.rows).toEqual([
			["Nazwisko", "Imię", "Kod sesji", "Rola", "Tytuł wystąpienia"],
			["Lis", "Adam", "1A1", "Prowadzący", ""],
			["Zając", "Ewa", "1A1", "Prezentujący", "Chain growth"],
		]);
	});

	it("leaves out the sheets of Parts that are not included", () => {
		expect(
			sheetsFor({ ...options, parts: ["detailed"] }).map((s) => s.name),
		).toEqual(["Program"]);
	});
});
