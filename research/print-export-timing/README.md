# Printed-program export: sync download vs pg-boss job (timing)

Research for map #94, ticket #109. Run from the repo root:

```sh
node --expose-gc --import tsx poc/print-export-timing/bench.ts [S|M|L|XL]
uv run --with "lxml>=5,<7" python -I poc/print-export-timing/idml_bench.py
```

`bench.ts` writes `program-<scale>.json` next to itself; copy `idml_bench.py` into the same folder to read them.

| Scale | Sessions / slots / rooms | PrintDocument JSON | xlsx   | docx (no TOC page numbers) | docx + `estimatePageNumbers` | IDML (parse+build+zip) |
| ----- | ------------------------ | ------------------ | ------ | -------------------------- | ---------------------------- | ---------------------- |
| S     | 40 / 200 / 4             | 54 KB              | 24 ms  | 63 ms                      | **0.5 s**                    | 40 ms                  |
| M     | 144 / 720 / 8            | 191 KB             | 34 ms  | 83 ms                      | **1.5 s**                    | 113 ms                 |
| L     | 450 / 2 250 / 15         | 601 KB             | 110 ms | 196 ms                     | **6.0 s**                    | 365 ms                 |
| XL    | 900 / 5 400 / 30         | 1.4 MB             | 352 ms | 432 ms                     | **11–16 s**                  | 858 ms                 |

- Every build is **synchronous CPU work: lag = total time**. A 6–16 s docx build freezes every other request on that Node process.
- **The only expensive step is `estimatePageNumbers`** (TOC page numbers written into the file, chosen in [Word generator: code-built vs organizer template](https://github.com/unlimited-labs/suberus/issues/100)): ~2–3 ms per slot, about 30× the cost of the rest of the docx build.
- xlsx: **turn on `compression: true`**: XL 8.5 MB → 1.8 MB at the same time. `src/shared/server/xlsx-write.ts` does not compress today, which also affects the existing submissions/finances/users exports.
- Memory: peak +15…155 MB per build (xlsx XL highest); fine for one export at a time.
- IDML: < 1 s compute in the sidecar; payload ≤ 1.4 MB JSON per request.
- Prod path: NPMplus nginx default proxy read timeout **60 s**. Every case is far below that; the risk is event-loop blocking, not timeouts.
- **pg-boss workers run in the same Node process** (nitro plugin), so a job alone would block the loop exactly the same; it only changes UX (download later). Precedent: documents bulk ZIP uses pg-boss because it fans out to many files/S3.
- Not measured: the Prisma export query at scale (local DB too small); estimated well under 1 s for ~2k slots with includes.

**Recommendation**: **synchronous download** for all three formats, with the docx build (or just the page-number estimation) run in a **`worker_threads` worker** so the main event loop stays free; the button shows "Generating…" (up to ~15 s for the largest programs). No pg-boss job. Enable xlsx compression.

**Decision (user, 2026-11-06):** synchronous download; docx build in a `worker_threads` worker; no pg-boss job; xlsx with `compression: true`.

## `bench.ts`

Save as `poc/print-export-timing/bench.ts` (gitignored) to run.

```ts
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
	AlignmentType,
	Document,
	Footer,
	Header,
	HeadingLevel,
	Packer,
	PageNumber,
	PageOrientation,
	Paragraph,
	SectionType,
	Table,
	TableCell,
	TableOfContents,
	TableRow,
	TextRun,
	WidthType,
} from "docx";
import { estimatePageNumbers } from "docx/layout";
import { TextWatermark } from "docx/watermarks";
import * as XLSX from "xlsx";

interface Slot {
	title: string;
	authors: { first: string; last: string }[];
	presenter: number;
}
interface Session {
	code: string;
	title: string;
	room: number;
	start: number;
	end: number;
	chair: string;
	slots: Slot[];
}
interface Day {
	label: string;
	rooms: string[];
	sessions: Session[];
}

const SCALES = {
	S: { days: 2, rooms: 4, sessionsPerRoom: 5, slots: 5 },
	M: { days: 3, rooms: 8, sessionsPerRoom: 6, slots: 5 },
	L: { days: 5, rooms: 15, sessionsPerRoom: 6, slots: 5 },
	XL: { days: 5, rooms: 30, sessionsPerRoom: 6, slots: 6 },
} as const;

const WORDS =
	"materials polymer synthesis kinetic nanostructure thermal analysis catalytic surface model diffusion adaptive simulation interface fracture alloy".split(
		" ",
	);
const LAST =
	"Kowalski Nowak Wiśniewska Wójcik Kamińska Lewandowski Zieliński Szymańska Woźniak Dąbrowski Smith Müller Garcia Rossi Dubois Tanaka".split(
		" ",
	);
const FIRST =
	"Anna Jan Piotr Maria Katarzyna Tomasz Paweł Agnieszka John Emma Luca Sophie".split(
		" ",
	);
let seed = 42;
const rnd = (n: number) => {
	seed = (seed * 1103515245 + 12345) & 0x7fffffff;
	return seed % n;
};
const title = (n: number) =>
	Array.from({ length: n }, () => WORDS[rnd(WORDS.length)]).join(" ");
const person = () => ({
	first: FIRST[rnd(FIRST.length)] ?? "A",
	last: `${LAST[rnd(LAST.length)]}${rnd(400)}`,
});

function makeProgram(s: (typeof SCALES)[keyof typeof SCALES]): Day[] {
	return Array.from({ length: s.days }, (_, d) => {
		const rooms = Array.from(
			{ length: s.rooms },
			(_, r) => `Room ${String.fromCharCode(65 + (r % 26))}${r >= 26 ? r : ""}`,
		);
		const sessions: Session[] = [];
		for (let r = 0; r < s.rooms; r++) {
			for (let k = 0; k < s.sessionsPerRoom; k++) {
				const start = 9 * 60 + k * 100;
				sessions.push({
					code: `${d + 1}${String.fromCharCode(65 + (r % 26))}${k + 1}`,
					title: `Session: ${title(4)}`,
					room: r,
					start,
					end: start + 90,
					chair: `${FIRST[rnd(12)]} ${LAST[rnd(16)]}`,
					slots: Array.from({ length: s.slots }, () => ({
						title: title(9 + rnd(8)),
						authors: Array.from({ length: 1 + rnd(5) }, person),
						presenter: 0,
					})),
				});
			}
		}
		return { label: `Day ${d + 1}`, rooms, sessions };
	});
}

const hhmm = (m: number) =>
	`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function buildXlsx(days: Day[]): Buffer {
	const wb = XLSX.utils.book_new();
	const rows: (string | number)[][] = [
		[
			"Date",
			"Session code",
			"Session title",
			"Start",
			"End",
			"Room",
			"Chairs",
			"Type",
			"Start",
			"End",
			"Title",
			"Authors",
			"Presenter",
		],
	];
	for (const day of days)
		for (const s of day.sessions)
			s.slots.forEach((sl, i) => {
				rows.push([
					day.label,
					s.code,
					s.title,
					hhmm(s.start),
					hhmm(s.end),
					day.rooms[s.room] ?? "",
					s.chair,
					"Slot",
					hhmm(s.start + i * 15),
					hhmm(s.start + i * 15 + 15),
					sl.title,
					sl.authors.map((a) => `${a.first} ${a.last}`).join(", "),
					`${sl.authors[0]?.first} ${sl.authors[0]?.last}`,
				]);
			});
	const program = XLSX.utils.aoa_to_sheet(rows);
	program["!autofilter"] = { ref: `A1:M${rows.length}` };
	XLSX.utils.book_append_sheet(wb, program, "Program");
	for (const day of days) {
		const starts = [...new Set(day.sessions.map((s) => s.start))].toSorted(
			(a, b) => a - b,
		);
		const aoa: string[][] = [["Time", ...day.rooms]];
		const merges: XLSX.Range[] = [];
		for (const t of starts) {
			const r = aoa.length;
			aoa.push([
				hhmm(t),
				...day.rooms.map(
					(_, ri) =>
						day.sessions.find((s) => s.start === t && s.room === ri)?.code ??
						"",
				),
			]);
			aoa.push([hhmm(t + 45), ...day.rooms.map(() => "")]);
			day.rooms.forEach((_, ri) =>
				merges.push({ s: { r, c: ri + 1 }, e: { r: r + 1, c: ri + 1 } }),
			);
		}
		const ws = XLSX.utils.aoa_to_sheet(aoa);
		ws["!merges"] = merges;
		XLSX.utils.book_append_sheet(wb, ws, day.label);
	}
	const authors: string[][] = [
		["Surname", "First name", "Session code", "Role", "Slot title"],
	];
	for (const day of days)
		for (const s of day.sessions)
			for (const sl of s.slots)
				for (const a of sl.authors)
					authors.push([a.last, a.first, s.code, "Author", sl.title]);
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(authors), "Authors");
	return XLSX.write(wb, {
		type: "buffer",
		bookType: "xlsx",
		compression: true,
	});
}

const cell = (
	text: string,
	opts: { rowSpan?: number; columnSpan?: number; bold?: boolean } = {},
) =>
	new TableCell({
		rowSpan: opts.rowSpan,
		columnSpan: opts.columnSpan,
		children: [
			new Paragraph({
				style: "GridCell",
				children: [new TextRun({ text, bold: opts.bold })],
			}),
		],
	});

async function buildDocx(days: Day[], estimate: boolean): Promise<Buffer> {
	const watermark = () =>
		new Header({
			children: [
				new Paragraph({
					children: [new TextWatermark({ text: "DRAFT", font: "Arial" })],
				}),
			],
		});
	const footer = new Footer({
		children: [
			new Paragraph({
				children: [
					new TextRun("Conference 2026 · "),
					new TextRun({ children: [PageNumber.CURRENT] }),
				],
			}),
		],
	});
	const glance = days.map((day) => {
		const starts = [...new Set(day.sessions.map((s) => s.start))].toSorted(
			(a, b) => a - b,
		);
		const rows = [
			new TableRow({
				tableHeader: true,
				children: [
					cell("Time", { bold: true }),
					...day.rooms.map((r) => cell(r, { bold: true })),
				],
			}),
		];
		for (const t of starts) {
			rows.push(
				new TableRow({
					children: [
						cell(hhmm(t)),
						...day.rooms.map((_, ri) => {
							const s = day.sessions.find(
								(x) => x.start === t && x.room === ri,
							);
							return cell(s ? `${s.code} ${s.title}` : "", { rowSpan: 2 });
						}),
					],
				}),
			);
			rows.push(new TableRow({ children: [cell(hhmm(t + 45))] }));
		}
		return {
			properties: {
				type: SectionType.NEXT_PAGE,
				page: {
					size: {
						orientation:
							day.rooms.length >= 5
								? PageOrientation.LANDSCAPE
								: PageOrientation.PORTRAIT,
					},
				},
			},
			headers: { default: watermark() },
			footers: { default: footer },
			children: [
				new Paragraph({
					heading: HeadingLevel.HEADING_2,
					children: [new TextRun(`Program at a glance — ${day.label}`)],
				}),
				new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
			],
		};
	});
	const detailed: Paragraph[] = [
		new Paragraph({
			heading: HeadingLevel.HEADING_1,
			children: [new TextRun("Detailed program")],
		}),
	];
	for (const day of days) {
		detailed.push(
			new Paragraph({
				heading: HeadingLevel.HEADING_2,
				pageBreakBefore: true,
				children: [new TextRun(day.label)],
			}),
		);
		for (const s of day.sessions) {
			detailed.push(
				new Paragraph({
					style: "SessionHeading",
					children: [
						new TextRun({ text: `${s.code} `, bold: true }),
						new TextRun(s.title),
					],
				}),
			);
			detailed.push(
				new Paragraph({
					style: "SessionMeta",
					children: [
						new TextRun(
							`${hhmm(s.start)}–${hhmm(s.end)} · ${day.rooms[s.room]} · Chair: ${s.chair}`,
						),
					],
				}),
			);
			s.slots.forEach((sl, i) => {
				detailed.push(
					new Paragraph({
						style: "SlotTitle",
						children: [
							new TextRun({ text: `${hhmm(s.start + i * 15)} `, bold: true }),
							new TextRun(sl.title),
						],
					}),
				);
				detailed.push(
					new Paragraph({
						style: "SlotAuthors",
						children: sl.authors.map(
							(a, ai) =>
								new TextRun({
									text: `${ai ? ", " : ""}${a.first[0]}. ${a.last}`,
									underline: ai === sl.presenter ? {} : undefined,
								}),
						),
					}),
				);
			});
		}
	}
	const index = new Map<string, Set<string>>();
	for (const day of days)
		for (const s of day.sessions)
			for (const sl of s.slots)
				for (const a of sl.authors) {
					const k = `${a.last}, ${a.first}`;
					index.set(k, (index.get(k) ?? new Set()).add(s.code));
				}
	const collator = new Intl.Collator("pl");
	const indexParas = [...index.entries()]
		.toSorted(([a], [b]) => collator.compare(a, b))
		.map(
			([k, v]) =>
				new Paragraph({
					style: "IndexEntry",
					children: [new TextRun(`${k} — ${[...v].join(", ")}`)],
				}),
		);
	const para = (id: string, size: number, bold = false) => ({
		id,
		name: id,
		basedOn: "Normal",
		run: { font: "Arial", size: size * 2, bold },
		paragraph: { spacing: { after: 40 } },
	});
	const doc = new Document({
		...(estimate ? { pageNumbers: estimatePageNumbers } : {}),
		styles: {
			default: { document: { run: { font: "Arial", size: 18 } } },
			paragraphStyles: [
				para("GridCell", 7),
				para("SessionHeading", 11, true),
				para("SessionMeta", 9),
				para("SlotTitle", 9.5),
				para("SlotAuthors", 8.5),
				para("IndexEntry", 8),
			],
		},
		sections: [
			{
				headers: { default: watermark() },
				footers: { default: footer },
				children: [
					new Paragraph({
						heading: HeadingLevel.TITLE,
						children: [new TextRun("Conference 2026")],
					}),
					new TableOfContents("Contents", {
						hyperlink: true,
						headingStyleRange: "1-2",
					}),
				],
			},
			...glance,
			{
				properties: { type: SectionType.NEXT_PAGE },
				headers: { default: watermark() },
				footers: { default: footer },
				children: detailed,
			},
			{
				properties: {
					type: SectionType.NEXT_PAGE,
					column: { count: 2, space: 400 },
				},
				headers: { default: watermark() },
				footers: { default: footer },
				children: [
					new Paragraph({
						heading: HeadingLevel.HEADING_1,
						alignment: AlignmentType.LEFT,
						children: [new TextRun("Author index")],
					}),
					...indexParas,
				],
			},
		],
	});
	return Packer.toBuffer(doc);
}

async function measure<T>(fn: () => T | Promise<T>) {
	global.gc?.();
	const rss0 = process.memoryUsage().rss;
	let peak = rss0;
	let last = performance.now();
	let maxGap = 0;
	const timer = setInterval(() => {
		const now = performance.now();
		maxGap = Math.max(maxGap, now - last);
		last = now;
		peak = Math.max(peak, process.memoryUsage().rss);
	}, 2);
	await new Promise((r) => setTimeout(r, 10));
	const t0 = performance.now();
	last = t0;
	const out = await fn();
	const ms = performance.now() - t0;
	maxGap = Math.max(maxGap, performance.now() - last);
	clearInterval(timer);
	peak = Math.max(peak, process.memoryUsage().rss);
	return {
		out,
		ms: Math.round(ms),
		maxLagMs: Math.round(maxGap),
		peakMb: Math.round((peak - rss0) / 1e6),
	};
}

const only = process.argv[2];
const results: Record<string, unknown>[] = [];
for (const [name, scale] of Object.entries(SCALES)) {
	if (only && only !== name) continue;
	const days = makeProgram(scale);
	const sessions = days.reduce((n, d) => n + d.sessions.length, 0);
	const slots = sessions * scale.slots;
	const json = JSON.stringify(days);
	const x = await measure(() => buildXlsx(days));
	const d = await measure(() => buildDocx(days, false));
	const de = await measure(() => buildDocx(days, true));
	writeFileSync(new URL(`./out-${name}.docx`, import.meta.url), de.out);
	writeFileSync(new URL(`./out-${name}.xlsx`, import.meta.url), x.out);
	writeFileSync(new URL(`./program-${name}.json`, import.meta.url), json);
	const row = {
		scale: name,
		sessions,
		slots,
		rooms: scale.rooms,
		jsonKb: Math.round(json.length / 1024),
		xlsx: `${x.ms} ms, lag ${x.maxLagMs} ms, +${x.peakMb} MB, ${Math.round(x.out.length / 1024)} KB`,
		docx: `${d.ms} ms, lag ${d.maxLagMs} ms, +${d.peakMb} MB, ${Math.round(d.out.length / 1024)} KB`,
		docxToc: `${de.ms} ms, lag ${de.maxLagMs} ms, +${de.peakMb} MB`,
	};
	results.push(row);
	console.log(JSON.stringify(row));
}
```
