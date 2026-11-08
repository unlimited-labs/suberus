import type {
	PrintBlock,
	PrintParagraph,
	PrintRun,
	PrintSection,
	PrintTable,
} from "./print-document-schema";
import type { PrintOptions } from "./print-options-schema";

export type BookSize = PrintOptions["bookSize"];
export type Orientation = PrintSection["page"]["orientation"];

export const PAGE_MM = {
	A4: [210, 297],
	B5: [176, 250],
	A5: [148, 210],
} satisfies Record<BookSize, [number, number]>;
export const MARGIN_MM = 15;
export const FOOTER_MM = 10;
export const PX_PER_MM = 3.7795;

export function contentSizeMm(page: PrintSection["page"]): [number, number] {
	const [w, h] = pageSizeMm(page);
	return [w - 2 * MARGIN_MM, h - 2 * MARGIN_MM - FOOTER_MM];
}

export function pageSizeMm(page: PrintSection["page"]): [number, number] {
	const [w, h] = PAGE_MM[page.size];
	return page.orientation === "landscape" ? [h, w] : [w, h];
}

interface Span {
	row: number;
	col: number;
	rowSpan: number;
	colSpan: number;
}

function coveredCells(cells: readonly Span[]): Set<string> {
	const covered = new Set<string>();
	for (const c of cells)
		for (let r = c.row; r < c.row + c.rowSpan; r++)
			for (let k = c.col; k < c.col + c.colSpan; k++)
				if (r !== c.row || k !== c.col) covered.add(`${r}:${k}`);
	return covered;
}

export function tableRows<C extends Span>(
	cells: readonly C[],
	columns: number,
	from: number,
	to: number,
) {
	const covered = coveredCells(cells);
	const anchors = new Map(cells.map((c) => [`${c.row}:${c.col}`, c]));
	return Array.from({ length: Math.max(0, to - from) }, (_, i) => {
		const row = from + i;
		const slots = Array.from({ length: columns }, (_, col) => col).flatMap(
			(col) =>
				covered.has(`${row}:${col}`)
					? []
					: [{ col, cell: anchors.get(`${row}:${col}`) ?? null }],
		);
		return { row, slots };
	});
}

export const breakableAfterRow = (cells: readonly Span[], rowCount: number) =>
	Array.from(
		{ length: rowCount },
		(_, r) => !cells.some((c) => c.row <= r && r + 1 < c.row + c.rowSpan),
	);

export const para = (
	style: PrintParagraph["style"],
	...runs: PrintRun[]
): PrintParagraph => ({
	type: "paragraph",
	style,
	runs,
});
export const run = (
	text: string,
	charStyle?: PrintRun["charStyle"],
): PrintRun => (charStyle ? { text, charStyle } : { text });

export const commaRuns = <T>(
	items: readonly T[],
	toRun: (item: T) => PrintRun,
) =>
	items.flatMap((item, i): PrintRun[] => [
		...(i > 0 ? [run(", ")] : []),
		toRun(item),
	]);

export function fillHex({ color, tint }: CellFill): string {
	const mixed = [1, 3, 5].map((i) => {
		const channel = Number.parseInt(color.slice(i, i + 2), 16);
		return Math.round(255 - ((255 - channel) * tint) / 100);
	});
	return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export const columnFractions = (table: PrintTable) => {
	const total = table.columns.reduce((a, c) => a + c.widthWeight, 0);
	return table.columns.map((c) => c.widthWeight / total);
};

export interface TableCellInput {
	row: number;
	col: number;
	rowSpan?: number;
	colSpan?: number;
	accent?: string | null;
	fill?: CellFill | null;
	blocks: PrintParagraph[];
}

export type CellFill = NonNullable<PrintTable["cells"][number]["fill"]>;

export function table(
	weights: number[],
	headerRows: number,
	rowCount: number,
	cells: TableCellInput[],
): PrintTable {
	return {
		type: "table",
		columns: weights.map((widthWeight) => ({ widthWeight })),
		headerRows,
		rowCount,
		cells: cells.map((c) => ({
			row: c.row,
			col: c.col,
			rowSpan: c.rowSpan ?? 1,
			colSpan: c.colSpan ?? 1,
			accent: c.accent ?? null,
			fill: c.fill ?? null,
			blocks: c.blocks,
		})),
	};
}

export function section(
	options: PrintOptions,
	blocks: PrintBlock[],
	extra: Partial<Pick<PrintSection, "columns" | "start">> & {
		orientation?: Orientation;
	} = {},
): PrintSection {
	return {
		page: {
			size: options.bookSize,
			orientation: extra.orientation ?? "portrait",
		},
		columns: extra.columns ?? 1,
		start: extra.start ?? "nextPage",
		blocks,
	};
}
