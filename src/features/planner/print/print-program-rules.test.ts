import { describe, expect, it } from "vitest";
import { printOptionsSchema } from "./print-options-schema";
import {
	buildPrintProgram,
	type PrintSource,
	type SourceAuthor,
	type SourceSession,
	type SourceSlot,
} from "./print-program-rules";

const options = printOptionsSchema.parse({});

function author(
	id: string,
	firstName: string,
	lastName: string,
	extra: Partial<SourceAuthor> = {},
): SourceAuthor {
	return {
		id,
		userId: null,
		email: `${id}@example.org`,
		firstName,
		lastName,
		orderIndex: 0,
		isPresenter: false,
		...extra,
	};
}

function slot(
	id: string,
	order: number,
	extra: Partial<SourceSlot> = {},
): SourceSlot {
	return {
		id,
		order,
		durationMin: 15,
		cancelled: false,
		badgeId: null,
		submission: {
			id: `sub-${id}`,
			sequentialNumber: order + 100,
			title: `Talk ${id}`,
			type: "ABSTRACT",
			presenterId: null,
			authors: [author(`${id}-a1`, "Jan", "Kowalski")],
		},
		...extra,
	};
}

function session(
	id: string,
	startIso: string,
	endIso: string,
	extra: Partial<SourceSession> = {},
): SourceSession {
	return {
		id,
		title: `Session ${id}`,
		startAt: new Date(startIso),
		endAt: new Date(endIso),
		untimedSlots: false,
		roomId: "room-a",
		track: null,
		chairs: [],
		slots: [],
		...extra,
	};
}

function source(extra: Partial<PrintSource> = {}): PrintSource {
	return {
		conferenceName: "Polymers 2026",
		startDate: "2026-09-14",
		endDate: "2026-09-16",
		timeZone: "Europe/Warsaw",
		timeFormat: "24h",
		draft: false,
		rooms: [
			{ id: "room-a", name: "Aula", order: 0 },
			{ id: "room-b", name: "Sala 2", order: 1 },
		],
		badges: [],
		sessions: [],
		items: [],
		...extra,
	};
}

describe("buildPrintProgram: days", () => {
	it("puts each session on its day in the conference time zone, numbering only days that appear", () => {
		const program = buildPrintProgram(
			source({
				sessions: [
					session("late", "2026-09-14T22:30:00Z", "2026-09-14T23:30:00Z"),
					session("early", "2026-09-14T08:00:00Z", "2026-09-14T09:00:00Z"),
				],
			}),
			options,
		);
		expect(
			program.days.map((d) => [d.index, d.label, d.sessions.map((s) => s.id)]),
		).toEqual([
			[1, "Monday 14 September", ["early"]],
			[2, "Tuesday 15 September", ["late"]],
		]);
	});
});

describe("buildPrintProgram: day numbers", () => {
	it("numbers days from the conference start, so an empty first day keeps later codes stable", () => {
		const program = buildPrintProgram(
			source({
				sessions: [
					session("d2", "2026-09-15T08:00:00Z", "2026-09-15T09:00:00Z"),
					session("d3", "2026-09-16T08:00:00Z", "2026-09-16T09:00:00Z"),
				],
			}),
			options,
		);
		expect(
			program.days.map((d) => [d.index, d.sessions.map((s) => s.code)]),
		).toEqual([
			[2, ["2A1"]],
			[3, ["3A1"]],
		]);
	});

	it("falls back to counting days that appear when something is scheduled before the start date", () => {
		const program = buildPrintProgram(
			source({
				sessions: [
					session("pre", "2026-09-12T08:00:00Z", "2026-09-12T09:00:00Z"),
					session("d1", "2026-09-14T08:00:00Z", "2026-09-14T09:00:00Z"),
				],
			}),
			options,
		);
		expect(program.days.map((d) => d.index)).toEqual([1, 2]);
	});
});

describe("buildPrintProgram: day headings", () => {
	it("capitalises the Polish weekday that starts a day heading", () => {
		const program = buildPrintProgram(
			source({
				sessions: [
					session("s", "2026-09-14T08:00:00Z", "2026-09-14T09:00:00Z"),
				],
			}),
			{ ...options, language: "pl" },
		);
		expect(program.days[0]?.label).toBe("Poniedziałek, 14 września");
	});
});

describe("buildPrintProgram: sessions and slots", () => {
	const withSlots = session(
		"s1",
		"2026-09-14T08:00:00Z",
		"2026-09-14T09:30:00Z",
		{
			roomId: "room-b",
			chairs: [
				{
					userId: "u1",
					email: "c@x.org",
					firstName: "Anna",
					lastName: "Nowak",
				},
			],
			slots: [
				slot("a", 0, { durationMin: 20 }),
				slot("b", 1, {
					cancelled: true,
					submission: { ...slot("b", 1).submission, type: "INVITED" },
				}),
				slot("c", 2, {
					badgeId: "badge-1",
					submission: {
						...slot("c", 2).submission,
						presenterId: "c-a2",
						authors: [
							author("c-a1", "Jan", "Kowalski"),
							author("c-a2", "Ewa", "Zając", { orderIndex: 1 }),
						],
					},
				}),
			],
		},
	);
	const badges = [{ id: "badge-1", label: "Best paper" }];

	it("prints the session header with code, time range, room and chairs", () => {
		const [s] =
			buildPrintProgram(source({ sessions: [withSlots], badges }), options)
				.days[0]?.sessions ?? [];
		expect(s).toMatchObject({
			code: "1B1",
			timeLabel: "10:00–11:30",
			room: "Sala 2",
			chairs: ["A. Nowak"],
		});
	});

	it("times slots back to back from the session start, skips cancelled ones and marks the presenter", () => {
		const [s] =
			buildPrintProgram(source({ sessions: [withSlots], badges }), options)
				.days[0]?.sessions ?? [];
		expect(s?.slots.map((x) => [x.timeLabel, x.badge, x.authors])).toEqual([
			[
				"10:00–10:20",
				null,
				[{ name: "J. Kowalski", fullName: "Jan Kowalski", presenting: false }],
			],
			[
				"10:35–10:50",
				"Best paper",
				[
					{ name: "J. Kowalski", fullName: "Jan Kowalski", presenting: false },
					{ name: "E. Zając", fullName: "Ewa Zając", presenting: true },
				],
			],
		]);
	});

	it("keeps cancelled slots, struck through, when the option asks for them", () => {
		const [s] =
			buildPrintProgram(source({ sessions: [withSlots] }), {
				...options,
				includeCancelled: true,
			}).days[0]?.sessions ?? [];
		expect(s?.slots.map((x) => [x.id, x.cancelled, x.invited])).toEqual([
			["a", false, false],
			["b", true, true],
			["c", false, false],
		]);
	});

	it("gives untimed (poster) slots a board number instead of a time", () => {
		const poster = session(
			"p",
			"2026-09-14T12:00:00Z",
			"2026-09-14T14:00:00Z",
			{
				untimedSlots: true,
				slots: [slot("x", 0), slot("y", 1)],
			},
		);
		const [s] =
			buildPrintProgram(source({ sessions: [poster] }), options).days[0]
				?.sessions ?? [];
		expect(s?.slots.map((x) => [x.timeLabel, x.board])).toEqual([
			[null, "P1"],
			[null, "P2"],
		]);
	});
});

describe("buildPrintProgram: at-a-glance grid and items", () => {
	const day = source({
		sessions: [
			session("s1", "2026-09-14T08:00:00Z", "2026-09-14T09:00:00Z", {
				roomId: "room-a",
			}),
			session("s2", "2026-09-14T08:00:00Z", "2026-09-14T09:30:00Z", {
				roomId: "room-b",
			}),
			session("s3", "2026-09-14T08:30:00Z", "2026-09-14T09:30:00Z", {
				roomId: "room-a",
			}),
			session("key", "2026-09-14T10:00:00Z", "2026-09-14T11:00:00Z", {
				roomId: "room-a",
				title: "Keynote",
			}),
		],
		items: [
			{
				id: "coffee",
				kind: "BREAK",
				title: "Coffee",
				description: "ignored for breaks",
				location: "Foyer",
				roomId: null,
				startAt: new Date("2026-09-14T09:30:00Z"),
				endAt: new Date("2026-09-14T10:00:00Z"),
			},
			{
				id: "dinner",
				kind: "EVENT",
				title: "Dinner",
				description: "Old town",
				location: null,
				roomId: "room-b",
				startAt: new Date("2026-09-14T17:00:00Z"),
				endAt: new Date("2026-09-14T19:00:00Z"),
			},
		],
	});

	it("splits a room into lanes for overlapping sessions and spans breaks and lone sessions across all columns", () => {
		const grid = buildPrintProgram(day, options).days[0]?.grid;
		expect(grid?.columns).toEqual([
			{ room: "Aula", lane: 1, lanes: 2 },
			{ room: "Aula", lane: 2, lanes: 2 },
			{ room: "Sala 2", lane: 1, lanes: 1 },
		]);
		expect(grid?.rows).toEqual([
			"10:00–10:30",
			"10:30–11:00",
			"11:00–11:30",
			"11:30–12:00",
			"12:00–13:00",
			"19:00–21:00",
		]);
		expect(
			grid?.cells.map((c) => [
				c.title,
				c.row,
				c.col,
				c.rowSpan,
				c.colSpan,
				c.band,
			]),
		).toEqual([
			["Session s1", 0, 0, 2, 1, false],
			["Session s2", 0, 2, 3, 1, false],
			["Session s3", 1, 1, 2, 1, false],
			["Coffee", 3, 0, 1, 3, true],
			["Keynote", 4, 0, 1, 3, true],
			["Dinner", 5, 0, 1, 3, true],
		]);
	});

	it("keeps a break that overlaps sessions out of the full-width bands, in the roomless column", () => {
		const clash = source({
			sessions: [
				session("s1", "2026-09-14T08:00:00Z", "2026-09-14T09:00:00Z", {
					roomId: "room-a",
				}),
				session("s2", "2026-09-14T08:00:00Z", "2026-09-14T09:00:00Z", {
					roomId: "room-b",
				}),
			],
			items: [
				{
					id: "c",
					kind: "BREAK",
					title: "Coffee",
					description: null,
					location: null,
					roomId: null,
					startAt: new Date("2026-09-14T08:30:00Z"),
					endAt: new Date("2026-09-14T09:30:00Z"),
				},
			],
		});
		const grid = buildPrintProgram(clash, options).days[0]?.grid;
		expect(grid?.columns.map((c) => c.room)).toEqual([
			"Aula",
			"Sala 2",
			"No room",
		]);
		expect(grid?.cells.find((c) => c.title === "Coffee")).toMatchObject({
			band: false,
			col: 2,
			colSpan: 1,
		});
	});

	const item = (id: string, startIso: string, endIso: string) => ({
		id,
		kind: "BREAK" as const,
		title: id,
		description: null,
		location: null,
		roomId: null,
		startAt: new Date(startIso),
		endAt: new Date(endIso),
	});

	it("keeps a break that overlaps a lone session as its own cell instead of a band over it", () => {
		const grid = buildPrintProgram(
			source({
				sessions: [
					session("plenary", "2026-09-14T08:00:00Z", "2026-09-14T09:00:00Z"),
				],
				items: [item("Coffee", "2026-09-14T08:30:00Z", "2026-09-14T09:30:00Z")],
			}),
			options,
		).days[0]?.grid;
		expect(grid?.cells.map((c) => [c.title, c.col, c.colSpan, c.band])).toEqual(
			[
				["Session plenary", 0, 1, false],
				["Coffee", 1, 1, false],
			],
		);
	});

	it("never makes two overlapping breaks full-width bands", () => {
		const grid = buildPrintProgram(
			source({
				items: [
					item("Coffee", "2026-09-14T08:00:00Z", "2026-09-14T09:00:00Z"),
					item("Posters", "2026-09-14T08:30:00Z", "2026-09-14T09:30:00Z"),
				],
			}),
			options,
		).days[0]?.grid;
		expect(grid?.cells.map((c) => [c.title, c.col, c.colSpan, c.band])).toEqual(
			[
				["Coffee", 0, 1, false],
				["Posters", 1, 1, false],
			],
		);
	});

	it("lists breaks and events with time and place, describing only events", () => {
		const items = buildPrintProgram(day, options).days[0]?.items;
		expect(
			items?.map((i) => [i.title, i.timeLabel, i.place, i.description]),
		).toEqual([
			["Coffee", "11:30–12:00", "Foyer", null],
			["Dinner", "19:00–21:00", "Sala 2", "Old town"],
		]);
	});
});

describe("buildPrintProgram: author index and track legend", () => {
	const s1 = session("s1", "2026-09-14T08:00:00Z", "2026-09-14T09:00:00Z", {
		track: { name: "Polymers", color: "#ff0000" },
		slots: [
			slot("a", 0, {
				submission: {
					...slot("a", 0).submission,
					presenterId: "a-1",
					authors: [
						author("a-1", "Jan", "Kowalski", { userId: "u1" }),
						author("a-2", "Ewa", "Łukasik", {
							email: "E.Lukasik@x.org",
							orderIndex: 1,
						}),
					],
				},
			}),
		],
	});
	const s2 = session("s2", "2026-09-14T10:00:00Z", "2026-09-14T11:00:00Z", {
		track: { name: "Alloys", color: null },
		chairs: [
			{ userId: "u9", email: "lis@x.org", firstName: "Adam", lastName: "Lis" },
		],
		slots: [
			slot("b", 0, {
				submission: {
					...slot("b", 0).submission,
					authors: [
						author("b-1", "Jan", "Kowalski", {
							userId: "u1",
							email: "other@x.org",
						}),
						author("b-2", "Ewa", "Łukasik", {
							email: "e.lukasik@x.org",
							orderIndex: 1,
						}),
					],
				},
			}),
		],
	});

	it("lists every author and chair once, in Polish order, with presenting appearances marked", () => {
		const program = buildPrintProgram(source({ sessions: [s1, s2] }), {
			...options,
			language: "pl",
		});
		expect(program.authorIndex).toEqual([
			{
				name: "Kowalski, Jan",
				refs: [
					{ code: "1A1", presenting: true },
					{ code: "1A2", presenting: false },
				],
			},
			{ name: "Lis, Adam", refs: [{ code: "1A2", presenting: false }] },
			{
				name: "Łukasik, Ewa",
				refs: [
					{ code: "1A1", presenting: false },
					{ code: "1A2", presenting: false },
				],
			},
		]);
	});

	it("merges a linked user with an unlinked co-author who has the same email", () => {
		const linked = session(
			"s1",
			"2026-09-14T08:00:00Z",
			"2026-09-14T09:00:00Z",
			{
				slots: [
					slot("a", 0, {
						submission: {
							...slot("a", 0).submission,
							authors: [
								author("a-1", "Jan", "Kowalski", {
									userId: "u1",
									email: "jan@x.org",
								}),
							],
						},
					}),
				],
			},
		);
		const unlinked = session(
			"s2",
			"2026-09-14T10:00:00Z",
			"2026-09-14T11:00:00Z",
			{
				slots: [
					slot("b", 0, {
						submission: {
							...slot("b", 0).submission,
							authors: [
								author("b-1", "Jan", "Kowalski", { email: "Jan@X.org" }),
							],
						},
					}),
				],
			},
		);
		expect(
			buildPrintProgram(source({ sessions: [unlinked, linked] }), options)
				.authorIndex,
		).toEqual([
			{
				name: "Kowalski, Jan",
				refs: [
					{ code: "1A1", presenting: false },
					{ code: "1A2", presenting: false },
				],
			},
		]);
	});

	it("keeps invited speakers without an account or email apart, merging only by name", () => {
		const invited = (id: string, first: string, last: string) =>
			author(id, first, last, { email: "" });
		const talk = (id: string, ...authors: SourceAuthor[]) =>
			slot(id, 0, { submission: { ...slot(id, 0).submission, authors } });
		const program = buildPrintProgram(
			source({
				sessions: [
					session("s1", "2026-09-14T08:00:00Z", "2026-09-14T09:00:00Z", {
						slots: [talk("a", invited("i1", "Anna", "Nowak"))],
					}),
					session("s2", "2026-09-14T10:00:00Z", "2026-09-14T11:00:00Z", {
						slots: [
							talk(
								"b",
								invited("i2", "Piotr", "Wolski"),
								invited("i3", "Anna", "Nowak"),
							),
						],
					}),
				],
			}),
			options,
		);
		expect(
			program.authorIndex.map((e) => [e.name, e.refs.map((r) => r.code)]),
		).toEqual([
			["Nowak, Anna", ["1A1", "1A2"]],
			["Wolski, Piotr", ["1A2"]],
		]);
	});

	it("collects the tracks used, for the colour legend", () => {
		expect(
			buildPrintProgram(source({ sessions: [s1, s2] }), options).tracks,
		).toEqual([
			{ name: "Alloys", color: null },
			{ name: "Polymers", color: "#ff0000" },
		]);
	});
});
