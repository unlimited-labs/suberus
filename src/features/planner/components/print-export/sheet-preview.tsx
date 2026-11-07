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

function accentStyle(sheet: XlsxSheetSpec, r: number, c: number) {
	const color = sheet.accents?.find((a) => a.r === r && a.c === c)?.color;
	return color ? { borderLeft: `3px solid ${color}` } : undefined;
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
					<div
						className="bg-background max-h-[calc(100vh-14rem)] overflow-auto rounded-md border text-xs"
						data-testid="print-sheet-preview"
					>
						<table className="border-collapse">
							<tbody>
								{s.rows.slice(0, PREVIEW_ROWS).map((row, r) => (
									<tr
										className={r === 0 ? "bg-muted font-medium" : undefined}
										key={`${s.name}-${r}`}
									>
										{row.map((cell, c) => (
											<td
												className="max-w-56 truncate border px-2 py-1"
												key={`${r}-${c}`}
												style={accentStyle(s, r, c)}
											>
												{cellText(cell)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
						{s.rows.length > PREVIEW_ROWS && (
							<p className="text-muted-foreground p-2">
								First {PREVIEW_ROWS - 1} of {s.rows.length - 1} rows
							</p>
						)}
					</div>
				</TabsContent>
			))}
		</Tabs>
	);
}
