import type { PrintSection } from "./print-document-schema";

interface MeasuredTable {
	rows: number[];
	headerRows: number;
	breakable: boolean[];
}

export type MeasuredBlock = { height: number } | MeasuredTable;

interface MeasuredSection extends Pick<PrintSection, "start" | "columns"> {
	blocks: MeasuredBlock[];
	pageHeight: number;
}

interface PageItem {
	block: number;
	rows?: [number, number];
}

export interface Page {
	section: number;
	blank: boolean;
	items: PageItem[];
}

interface Cursor {
	pages: Page[];
	used: number;
	section: number;
}

function newPage(c: Cursor, blank = false): Page {
	const page = { section: c.section, blank, items: [] };
	c.pages.push(page);
	c.used = 0;
	return page;
}

function current(c: Cursor): Page {
	return c.pages.at(-1) ?? newPage(c);
}

function fitRows(
	rows: number[],
	breakable: boolean[],
	from: number,
	room: number,
) {
	let used = 0;
	let end = from;
	let lastBreak = -1;
	while (end < rows.length && used + (rows[end] ?? 0) <= room) {
		used += rows[end] ?? 0;
		if (breakable[end]) lastBreak = end;
		end++;
	}
	return { end, used, lastBreak };
}

function placeTable(
	c: Cursor,
	index: number,
	{ rows, breakable, headerRows }: MeasuredTable,
	capacity: number,
) {
	const header = rows.slice(0, headerRows).reduce((a, b) => a + b, 0);
	let from = headerRows;
	while (from < rows.length) {
		const fit = fitRows(rows, breakable, from, capacity - c.used - header);
		if (fit.end === rows.length) {
			current(c).items.push({ block: index, rows: [from, fit.end] });
			c.used += header + fit.used;
			return;
		}
		const pageIsEmpty = c.used === 0;
		const end =
			fit.lastBreak >= from
				? fit.lastBreak + 1
				: pageIsEmpty
					? Math.max(fit.end, from + 1)
					: from;
		if (end > from) current(c).items.push({ block: index, rows: [from, end] });
		from = end;
		newPage(c);
	}
}

export function paginate(sections: readonly MeasuredSection[]): Page[] {
	const c: Cursor = { pages: [], used: 0, section: 0 };
	sections.forEach((section, si) => {
		c.section = si;
		if (section.start === "evenPage" && c.pages.length % 2 === 0)
			newPage(c, true);
		newPage(c);
		const capacity = section.pageHeight * section.columns;
		section.blocks.forEach((block, bi) => {
			if ("rows" in block) return placeTable(c, bi, block, capacity);
			if (c.used > 0 && c.used + block.height > capacity) newPage(c);
			current(c).items.push({ block: bi });
			c.used += block.height;
		});
	});
	return c.pages;
}
