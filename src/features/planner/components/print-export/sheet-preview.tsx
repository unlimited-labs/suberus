import { useState } from "react";
import type { XlsxCell, XlsxSheetSpec } from "@/shared/lib/xlsx-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const PREVIEW_ROWS = 50;

function cellText(cell: XlsxCell): string {
	if (cell instanceof Date) return cell.toISOString().slice(0, 10);
	if (cell === true) return "TRUE";
	if (cell === false) return "FALSE";
	return cell === null ? "" : String(cell);
}

function accentStyles(sheet: XlsxSheetSpec) {
	const accents = new Map(
		(sheet.accents ?? []).map((a) => [`${a.r}:${a.c}`, a.color]),
	);
	return (r: number, c: number) => {
		const color = accents.get(`${r}:${c}`);
		return color ? { borderLeft: `3px solid ${color}` } : undefined;
	};
}

function SheetTable({ sheet }: { sheet: XlsxSheetSpec }) {
	const accentOf = accentStyles(sheet);
	return (
		<div
			className="bg-background max-h-[calc(100vh-14rem)] overflow-auto rounded-md border text-xs"
			data-testid="print-sheet-preview"
		>
			<table className="border-collapse">
				<tbody>
					{sheet.rows.slice(0, PREVIEW_ROWS).map((row, r) => (
						<tr
							className={r === 0 ? "bg-muted font-medium" : undefined}
							key={`${sheet.name}-${r}`}
						>
							{row.map((cell, c) => (
								<td
									className="max-w-56 truncate border px-2 py-1"
									key={`${r}-${c}`}
									style={accentOf(r, c)}
								>
									{cellText(cell)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			{sheet.rows.length > PREVIEW_ROWS && (
				<p className="text-muted-foreground p-2">
					First {PREVIEW_ROWS - 1} of {sheet.rows.length - 1} rows
				</p>
			)}
		</div>
	);
}

export function SheetPreview({ sheets }: { sheets: XlsxSheetSpec[] }) {
	const [tab, setTab] = useState<string | null>(null);
	const first = sheets[0]?.name;
	if (!first) return null;
	const value = sheets.some((s) => s.name === tab) ? tab : first;
	return (
		<Tabs className="min-w-0" onValueChange={setTab} value={value}>
			<TabsList
				className="max-w-full justify-start overflow-x-auto"
				variant="line"
			>
				{sheets.map((s) => (
					<TabsTrigger key={s.name} value={s.name}>
						{s.name}
					</TabsTrigger>
				))}
			</TabsList>
			{sheets.map((s) => (
				<TabsContent key={s.name} value={s.name}>
					<SheetTable sheet={s} />
				</TabsContent>
			))}
		</Tabs>
	);
}
