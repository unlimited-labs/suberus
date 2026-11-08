import { describe, expect, it } from "vitest";
import {
	buildPrintDocument,
	chooseGlanceLayout,
	breakableAfterRow,
	columnFractions,
	tableRows,
} from "./print-document-rules";
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
		const detailed = docFor().sections[2];
		const styles = detailed?.blocks
			.flatMap((b) => (b.type === "paragraph" ? [b.style] : []))
			.slice(0, 2);
		expect(styles).toEqual(["PartHeading", "DayHeading"]);
	});

	it("prints the session code and presenter with their character styles", () => {
		const detailed = docFor().sections[2];
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
		const doc = docFor({ ...options, layoutOverride: "spread" });
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
