import type { CSSProperties } from "react";
import type {
	ParagraphStyle,
	PrintBlock,
	PrintParagraph,
	PrintRun,
	PrintTable,
} from "@/features/planner/print/print-document-schema";
import {
	columnFractions,
	fillHex,
	tableRows,
} from "@/features/planner/print/print-layout-rules";
import { cn } from "@/shared/lib/utils";

const PARAGRAPH_CLASS = {
	Title: "text-[22pt] font-bold leading-tight",
	Subtitle: "mb-[4mm] text-[13pt]",
	PartHeading: "mb-[3mm] text-[17pt] font-bold",
	DayHeading: "mt-[1mm] mb-[2mm] text-[13pt] font-bold",
	SessionHeading: "mt-[3mm] text-[10.5pt] font-bold",
	SessionMeta: "text-[8.5pt]",
	ChairLine: "text-[8.5pt] italic",
	SlotTitle: "mt-[1mm] text-[9pt]",
	SlotAuthors: "text-[8pt] opacity-75",
	BreakLine: "mt-[2mm] text-[9pt] italic",
	EventTitle: "mt-[2mm] text-[9pt] font-bold",
	EventText: "text-[8.5pt]",
	GridHeader: "text-[7.5pt] font-bold",
	GridTime: "text-[7pt] tabular-nums",
	GridCell: "text-[7pt]",
	GridBand: "text-center text-[7.5pt] font-bold",
	BlockHeading: "text-[8.5pt] font-bold",
	GridRoom: "text-center text-[8pt] font-bold uppercase",
	GridSession: "text-center text-[7.5pt]",
	GridChairs: "text-center text-[7pt]",
	TalkTime:
		"mx-auto rotate-180 text-[6.5pt] whitespace-nowrap tabular-nums [writing-mode:vertical-rl]",
	TalkBadge: "text-[6.5pt] underline",
	TalkTitle: "text-[7.5pt]",
	TalkPresenter: "mt-[0.7mm] text-[7pt] font-bold",
	TalkAffiliation: "text-[6.5pt] italic",
	Legend: "mb-[2mm] text-[7.5pt]",
	IndexLetter: "mt-[2mm] text-[11pt] font-bold break-after-avoid",
	IndexEntry: "text-[8pt]",
	TocEntry1: "text-[10pt]",
	TocEntry2: "pl-[4mm] text-[9pt]",
} satisfies Record<ParagraphStyle, string>;

const RUN_CLASS = {
	Code: "font-bold",
	Time: "font-bold tabular-nums",
	Presenter: "underline",
	Presenting: "font-bold",
	Cancelled: "line-through",
	Badge: "text-[0.85em] font-semibold uppercase",
	Invited: "text-[0.85em] font-semibold uppercase",
	Label: "font-bold",
} satisfies Record<NonNullable<PrintRun["charStyle"]>, string>;

function Run({ run }: { run: PrintRun }) {
	const style: CSSProperties | undefined = run.color
		? { color: run.color }
		: undefined;
	return (
		<span
			className={run.charStyle ? RUN_CLASS[run.charStyle] : undefined}
			style={style}
		>
			{run.text}
		</span>
	);
}

function Paragraph({ block }: { block: PrintParagraph }) {
	return (
		<p className={PARAGRAPH_CLASS[block.style]}>
			{block.runs.map((r, i) => (
				<Run key={`${i}-${r.text}`} run={r} />
			))}
		</p>
	);
}

function visibleCells(table: PrintTable, from: number, to: number) {
	return table.cells
		.filter((c) => c.row < to && c.row + c.rowSpan > from)
		.map((c) => {
			const row = Math.max(c.row, from);
			return { ...c, row, rowSpan: Math.min(c.row + c.rowSpan, to) - row };
		});
}

function TableSlice({
	table,
	rows,
}: {
	table: PrintTable;
	rows?: [number, number];
}) {
	const [from, to] = rows ?? [table.headerRows, table.rowCount];
	const ranges: [number, number][] = [
		[0, table.headerRows],
		[from, to],
	];
	return (
		<table
			className="mb-[2mm] w-full table-fixed border-collapse"
			data-testid="print-preview-table"
		>
			<colgroup>
				{columnFractions(table).map((f, i) => (
					<col key={`${i}-${f}`} style={{ width: `${f * 100}%` }} />
				))}
			</colgroup>
			<tbody>
				{ranges.flatMap(([a, b]) =>
					tableRows(visibleCells(table, a, b), table.columns.length, a, b).map(
						({ row, slots }) => (
							<tr data-row={row} key={row}>
								{slots.map(({ col, cell }) =>
									cell ? (
										<td
											className="border border-black/40 p-[1mm] align-top"
											colSpan={cell.colSpan}
											key={col}
											rowSpan={cell.rowSpan}
											style={{
												borderLeft: cell.accent
													? `3pt solid ${cell.accent}`
													: undefined,
												backgroundColor: cell.fill
													? fillHex(cell.fill)
													: undefined,
												verticalAlign:
													cell.blocks[0]?.style === "TalkTime"
														? "middle"
														: undefined,
											}}
										>
											{cell.blocks.map((b, bi) => (
												<Paragraph block={b} key={`${bi}-${b.style}`} />
											))}
										</td>
									) : (
										<td
											className="border border-black/40 bg-[repeating-linear-gradient(45deg,transparent_0_3px,var(--color-border)_3px_5px)]"
											key={col}
										/>
									),
								)}
							</tr>
						),
					),
				)}
			</tbody>
		</table>
	);
}

export interface TocEntry {
	level: 1 | 2;
	text: string;
	page: number;
}

export function Block({
	block,
	rows,
	toc,
}: {
	block: PrintBlock;
	rows?: [number, number];
	toc: TocEntry[];
}) {
	if (block.type === "paragraph") return <Paragraph block={block} />;
	if (block.type === "table") return <TableSlice rows={rows} table={block} />;
	if (block.type === "image")
		return (
			<img
				alt=""
				className="mb-[4mm]"
				src={`data:${block.mime};base64,${block.dataBase64}`}
				style={{ width: `${block.widthFraction * 100}%` }}
			/>
		);
	return (
		<div className="mt-[6mm]">
			<p className="mb-[2mm] text-[12pt] font-bold">{block.title}</p>
			{toc.map((e) => (
				<p
					className={cn(
						"flex gap-[2mm]",
						PARAGRAPH_CLASS[e.level === 1 ? "TocEntry1" : "TocEntry2"],
					)}
					key={`${e.level}-${e.text}-${e.page}`}
				>
					<span>{e.text}</span>
					<span className="min-w-0 flex-1 border-b border-dotted border-black/40" />
					<span className="tabular-nums">{e.page}</span>
				</p>
			))}
		</div>
	);
}
