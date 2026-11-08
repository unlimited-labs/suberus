import { describe, expect, it } from "vitest";
import { buildPrintDocument, chooseGlanceLayout } from "./print-document-rules";
import type { PrintBlock, PrintTable } from "./print-document-schema";
import {
	breakableAfterRow,
	columnFractions,
	tableRows,
} from "./print-layout-rules";
import { printOptionsSchema } from "./print-options-schema";
import { buildPrintProgram, type PrintSource } from "./print-program-rules";

describe("chooseGlanceLayout", () => {
	it("keeps A4 grids portrait up to 4 rooms, landscape up to 8, a spread up to 14 and transposes beyond", () => {
		expect(
			[3, 5, 8, 9, 14, 15].map((n) => chooseGlanceLayout(n, "A4", "auto")),
		).toEqual([
			{ layout: "columns", orientation: "portrait" },
			{ layout: "columns", orientation: "landscape" },
			{ layout: "columns", orientation: "landscape" },
			{ layout: "spread", orientation: "portrait" },
			{ layout: "spread", orientation: "portrait" },
			{ layout: "transposed", orientation: "landscape" },
		]);
	});

	it("goes landscape from 4 rooms in an A5 book", () => {
		expect(chooseGlanceLayout(4, "A5", "auto")).toEqual({
			layout: "columns",
			orientation: "landscape",
		});
	});

	it("applies a manual override to every day", () => {
		expect(chooseGlanceLayout(3, "A4", "list")).toEqual({
			layout: "list",
			orientation: "portrait",
		});
	});
});

const src: PrintSource = {
	conferenceName: "Polymers 2026",
	startDate: "2026-09-14",
	endDate: "2026-09-15",
	timeZone: "Europe/Warsaw",
	timeFormat: "24h",
	draft: true,
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
			track: { name: "Polymers", color: "#ff0000" },
			chairs: [
				{
					userId: "u9",
					email: "c@x.org",
					firstName: "Adam",
					lastName: "Lis",
					title: null,
				},
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
								title: null,
								affiliation: null,
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
		{
			id: "s3",
			title: "Day two",
			startAt: new Date("2026-09-15T08:00:00Z"),
			endAt: new Date("2026-09-15T09:00:00Z"),
			untimedSlots: false,
			roomId: "a",
			track: null,
			chairs: [],
			slots: [],
		},
	],
	items: [],
};

const options = printOptionsSchema.parse({});
const list = printOptionsSchema.parse({ detailedLayout: "list" });
const docFor = (o = options) =>
	buildPrintDocument(buildPrintProgram(src, o), o, null);
const text = (p: { runs: { text: string }[] }) =>
	p.runs.map((r) => r.text).join("");
const glanceTables = (o = options) =>
	docFor(o).sections.flatMap((s) =>
		s.blocks.flatMap((b) => (b.type === "table" ? [b] : [])),
	);

describe("buildPrintDocument", () => {
	it("orders the Parts as title, glance, detailed program and author index, each detailed day on a new page", () => {
		const doc = docFor();
		const firstHeadings = doc.sections.map((s) => {
			const p = s.blocks.find((b) => b.type === "paragraph");
			return p?.type === "paragraph" ? `${p.style}: ${text(p)}` : "";
		});
		expect(firstHeadings).toEqual([
			"Title: Polymers 2026",
			"PartHeading: Program at a glance",
			"PartHeading: Detailed program",
			"DayHeading: Tuesday 15 September",
			"PartHeading: Author index",
		]);
		expect(doc.draft).toBe(true);
		expect(doc.sections[4]?.columns).toBe(2);
	});

	it("keeps the first day under its Part heading instead of breaking the page twice", () => {
		const detailed = docFor(list).sections[2];
		const styles = detailed?.blocks
			.flatMap((b) => (b.type === "paragraph" ? [b.style] : []))
			.slice(0, 2);
		expect(styles).toEqual(["PartHeading", "DayHeading"]);
	});

	it("prints the session code and presenter with their character styles", () => {
		const detailed = docFor(list).sections[2];
		const paras =
			detailed?.blocks.flatMap((b) => (b.type === "paragraph" ? [b] : [])) ??
			[];
		const heading = paras.find((p) => p.style === "SessionHeading");
		const authors = paras.find((p) => p.style === "SlotAuthors");
		expect(heading?.runs[0]).toEqual({ text: "1A1 ", charStyle: "Code" });
		expect(authors?.runs).toEqual([
			{ text: "E. Zając", charStyle: "Presenter" },
		]);
	});

	it("builds the day grid as a table with a header row, rooms as columns and the track accent", () => {
		const glance = docFor().sections[1];
		const table = glance?.blocks.find((b) => b.type === "table");
		expect(table?.type === "table" && table.headerRows).toBe(1);
		expect(table?.type === "table" && table.columns.length).toBe(3);
		const opening =
			table?.type === "table" ? table.cells.find((c) => c.accent) : undefined;
		expect(opening).toMatchObject({ row: 1, col: 1, accent: "#ff0000" });
	});

	it("prints a one-room day's session as a cell under its room name", () => {
		const [, day2] = glanceTables();
		expect(day2?.columns.length).toBe(2);
		const at = (row: number) =>
			day2?.cells.find((c) => c.row === row && c.col === 1)?.blocks[0];
		const header = at(0);
		expect(header ? text(header) : null).toBe("Aula");
		expect(at(1)?.style).toBe("GridCell");
	});

	it("keeps the time column narrow and shares the rest equally between rooms", () => {
		const [day1] = glanceTables();
		const [time, ...rooms] = day1 ? columnFractions(day1) : [];
		expect(time).toBeGreaterThan(0.08);
		expect(time).toBeLessThan(0.15);
		expect(new Set(rooms).size).toBe(1);
	});

	it("runs the days of the glance one under another on shared pages", () => {
		const glance = docFor().sections[1];
		const headings = glance?.blocks.flatMap((b) =>
			b.type === "paragraph" && b.style === "DayHeading" ? [text(b)] : [],
		);
		expect(headings).toEqual(["Monday 14 September", "Tuesday 15 September"]);
	});

	it("lists a named swatch for every coloured track, none when track colour is off", () => {
		expect(docFor().swatches).toEqual([{ name: "Polymers", color: "#ff0000" }]);
		expect(docFor({ ...options, trackColor: false }).swatches).toEqual([]);
	});

	it("falls back to a single grid when a forced spread has no room boundary to split at", () => {
		const doc = docFor({ ...list, layoutOverride: "spread" });
		const tables = doc.sections.flatMap((s) =>
			s.blocks.flatMap((b) => (b.type === "table" ? [b] : [])),
		);
		expect(tables.map((t) => t.columns.length)).toEqual([2, 2, 2]);
	});

	it("prints one index letter for surnames that differ only by an accent, but keeps Polish Ł apart", () => {
		const names = ["Edwards", "Émile", "Ezra", "Lis", "Łukasik"];
		const [first] = src.sessions;
		const [talk] = first?.slots ?? [];
		if (!first || !talk) throw new Error("fixture has a first talk");
		const withNames: PrintSource = {
			...src,
			sessions: [
				{
					...first,
					chairs: [],
					slots: [
						{
							...talk,
							submission: {
								...talk.submission,
								authors: names.map((lastName, i) => ({
									id: `n${i}`,
									userId: null,
									email: `n${i}@x.org`,
									firstName: "A",
									lastName,
									orderIndex: i,
									isPresenter: i === 0,
									title: null,
									affiliation: null,
								})),
							},
						},
					],
				},
			],
		};
		const letters = (language: "en" | "pl") => {
			const o = {
				...options,
				language,
				parts: ["index" as const, "detailed" as const],
			};
			return buildPrintDocument(buildPrintProgram(withNames, o), o, null)
				.sections.flatMap((x) => x.blocks)
				.flatMap((b) =>
					b.type === "paragraph" && b.style === "IndexLetter" ? [text(b)] : [],
				);
		};
		expect(letters("en")).toEqual(["E", "L"]);
		expect(letters("pl")).toEqual(["E", "L", "Ł"]);
	});

	it("drops the Parts that are not included and the logo when there is none", () => {
		const doc = docFor({ ...options, parts: ["detailed"] });
		expect(doc.sections).toHaveLength(2);
		expect(
			doc.sections
				.flatMap((s) => s.blocks)
				.some((b) => b.type === "image" || b.type === "toc"),
		).toBe(false);
	});
});

describe("table layout helpers", () => {
	const cells = [
		{ row: 0, col: 0, rowSpan: 2, colSpan: 1 },
		{ row: 0, col: 1, rowSpan: 1, colSpan: 2 },
		{ row: 1, col: 2, rowSpan: 1, colSpan: 1 },
	];

	it("lists each row's anchor cells, empty cells as null, and skips covered ones", () => {
		expect(
			tableRows(cells, 3, 0, 2).map((r) =>
				r.slots.map((s) => (s.cell ? `${s.cell.row}:${s.cell.col}` : null)),
			),
		).toEqual([
			["0:0", "0:1"],
			[null, "1:2"],
		]);
	});

	it("never breaks a page inside a row span", () => {
		expect(breakableAfterRow(cells, 3)).toEqual([false, true, true]);
	});
});

describe("buildPrintDocument: detailed program as a talk grid", () => {
	const detailedOnly = { ...options, parts: ["detailed" as const] };
	const detailed = (source: PrintSource) =>
		buildPrintDocument(
			buildPrintProgram(source, detailedOnly),
			detailedOnly,
			null,
		).sections;
	const tablesOf = (s: { blocks: PrintBlock[] } | undefined) =>
		s?.blocks.flatMap((b) => (b.type === "table" ? [b] : [])) ?? [];
	const at = (t: PrintTable | undefined, row: number, col: number) => {
		const cell = t?.cells.find((c) => c.row === row && c.col === col);
		return cell?.blocks.map(text).join(" / ");
	};
	const [first] = src.sessions;
	if (!first) throw new Error("fixture has a first session");

	it("heads each block with its time range, then rooms tinted by track, chairs and one row per talk", () => {
		const [day1] = detailed(src);
		const [t] = tablesOf(day1);
		expect(t?.columns.length).toBe(3);
		expect(t?.headerRows).toBe(3);
		expect([0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => at(t, r, c)))).toEqual([
			["10:00–11:00", undefined, undefined],
			["", "Aula / 1A1 Opening", "Sala 2 / 1B1 Parallel"],
			["", "Chair: Adam Lis", ""],
			["10:00–10:20", "Chain growth / Ewa Zając", ""],
		]);
		const cell = (row: number, col: number) =>
			t?.cells.find((c) => c.row === row && c.col === col);
		expect(cell(1, 1)?.fill).toEqual({ color: "#ff0000", tint: 20 });
		expect(cell(1, 2)?.fill).toEqual({ color: "#000000", tint: 6 });
		expect(cell(3, 0)?.blocks[0]?.style).toBe("TalkTime");
	});

	it("drops the time column when rooms keep different talk lengths and prints each talk's time by its title", () => {
		const [opening, parallel] = src.sessions;
		const [talk] = opening?.slots ?? [];
		if (!opening || !parallel || !talk)
			throw new Error("fixture has two sessions");
		const [day1] = detailed({
			...src,
			sessions: [
				opening,
				{ ...parallel, slots: [{ ...talk, id: "p9", durationMin: 30 }] },
			],
		});
		const [t] = tablesOf(day1);
		expect(t?.columns.length).toBe(2);
		expect(at(t, 3, 0)).toBe("10:00–10:20 Chain growth / Ewa Zając");
		expect(at(t, 3, 1)).toBe("10:00–10:30 Chain growth / Ewa Zając");
	});

	it("puts a lone session's title in its time band", () => {
		const [, day2] = detailed(src);
		const [t] = tablesOf(day2);
		expect(at(t, 0, 0)).toBe("10:00–11:00   Day two");
		expect(at(t, 1, 1)).toBe("Aula / 2A1");
		expect(day2?.page.orientation).toBe("portrait");
	});

	it("turns the day landscape for many parallel rooms and splits a block into tables of at most five", () => {
		const rooms = Array.from({ length: 7 }, (_, i) => ({
			id: `r${i}`,
			name: `Room ${i}`,
			order: i,
		}));
		const [day] = detailed({
			...src,
			rooms,
			sessions: rooms.map((r) => ({
				...first,
				id: r.id,
				roomId: r.id,
				chairs: [],
				slots: [],
			})),
		});
		expect(day?.page.orientation).toBe("landscape");
		expect(tablesOf(day).map((t) => t.columns.length)).toEqual([5, 4]);
	});

	it("prints breaks as full-width bands and poster boards in place of a time column", () => {
		const [day1] = detailed({
			...src,
			sessions: [
				first,
				{
					...first,
					id: "posters",
					title: "Posters",
					roomId: null,
					track: null,
					chairs: [],
					untimedSlots: true,
					startAt: new Date("2026-09-14T10:00:00Z"),
					endAt: new Date("2026-09-14T11:00:00Z"),
				},
			],
			items: [
				{
					id: "k",
					kind: "BREAK",
					title: "Coffee",
					description: null,
					location: "Foyer",
					roomId: null,
					startAt: new Date("2026-09-14T09:00:00Z"),
					endAt: new Date("2026-09-14T09:30:00Z"),
				},
			],
		});
		const [, coffee, posters] = tablesOf(day1);
		expect(coffee?.columns.length).toBe(1);
		expect(at(coffee, 0, 0)).toBe("11:00–11:30   Coffee · Foyer");
		expect(posters?.columns.length).toBe(2);
		expect([at(posters, 1, 0), at(posters, 2, 0), at(posters, 2, 1)]).toEqual([
			"1X1 Posters",
			"P1",
			"Chain growth / Ewa Zając",
		]);
	});
});
