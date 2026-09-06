import { IconAlertTriangle } from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import type { Sheet, SheetMatchResult } from "../../validations";

const ROSTER_LIMIT = 20;

function problemText(problem: SheetMatchResult["problems"][number]): string {
	if (problem.kind === "invalidEmail") {
		return `Data row ${problem.row + 1}: “${problem.value}” is not an email address`;
	}
	return `${problem.email} appears in data rows ${problem.rows
		.map((r) => r + 1)
		.join(", ")}`;
}

interface MatchStepProps {
	sheet: Sheet;
	result: SheetMatchResult;
	unmatched: "add" | "skip";
	recipientCount: number;
	onUnmatched: (value: "add" | "skip") => void;
}

export function MatchStep({
	sheet,
	result,
	unmatched,
	recipientCount,
	onUnmatched,
}: MatchStepProps) {
	const matched = result.rows.filter((r) => r.kind === "user");
	const unknown = result.rows.filter((r) => r.kind === "unknown");

	return (
		<div className="max-h-[60vh] space-y-4 overflow-y-auto py-1 text-sm">
			{result.problems.length > 0 ? (
				<Alert data-testid="sheet-problems" variant="destructive">
					<AlertTitle>
						The file has to be corrected before it can be imported
					</AlertTitle>
					<AlertDescription>
						<ul className="list-disc space-y-1 pl-4">
							{result.problems.map((problem) => (
								<li key={problemText(problem)}>{problemText(problem)}</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			) : (
				<p data-testid="sheet-counts">
					<span className="font-medium tabular-nums">{matched.length}</span>{" "}
					have an account
					<span className="text-muted-foreground">
						{" · "}
						<span className="tabular-nums">{unknown.length}</span> not found
					</span>
				</p>
			)}

			{unknown.length > 0 && result.problems.length === 0 && (
				<div className="space-y-2">
					<Label>Not found in Suberus</Label>
					<RadioGroup
						onValueChange={(value) =>
							onUnmatched(value === "add" ? "add" : "skip")
						}
						value={unmatched}
					>
						<div className="flex items-center gap-2">
							<RadioGroupItem id="unmatched-add" value="add" />
							<Label htmlFor="unmatched-add">
								Add them to the campaign anyway
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<RadioGroupItem id="unmatched-skip" value="skip" />
							<Label htmlFor="unmatched-skip">Leave them out</Label>
						</div>
					</RadioGroup>
					<ul className="text-muted-foreground max-h-32 overflow-y-auto text-xs">
						{unknown.map((row) => (
							<li key={row.email}>
								{row.email} — data row {row.row + 1}
							</li>
						))}
					</ul>
				</div>
			)}

			{recipientCount === 0 && result.problems.length === 0 && (
				<p className="text-destructive" data-testid="sheet-no-recipients">
					Nobody would be added. Add the addresses without an account, or import
					a file whose people are already in Suberus.
				</p>
			)}

			{result.emptyCells.length > 0 && (
				<div
					className="rounded-md border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20"
					data-testid="sheet-empty-cells"
				>
					<div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
						<IconAlertTriangle className="size-3.5" />
						Empty cells
					</div>
					<ul className="space-y-0.5 text-xs">
						{result.emptyCells.map((warning) => (
							<li key={warning.column}>
								{sheet.columns[warning.column]}:{" "}
								{warning.rows.length === 1 ? "data row" : "data rows"}{" "}
								{warning.rows
									.slice(0, 10)
									.map((r) => r + 1)
									.join(", ")}
								{warning.rows.length > 10
									? ` and ${warning.rows.length - 10} more`
									: ""}
							</li>
						))}
					</ul>
				</div>
			)}

			{matched.length > 0 && (
				<div className="space-y-1">
					<Label>Spreadsheet → account</Label>
					<ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs">
						{matched.slice(0, ROSTER_LIMIT).map((row) => (
							<li
								className="grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-2"
								key={row.email}
							>
								<span className="text-muted-foreground truncate text-right">
									{sheet.rows[row.row]?.filter(Boolean).slice(0, 2).join(" ")}
								</span>
								<span className="text-muted-foreground">→</span>
								<span className="truncate">
									{[row.firstName, row.lastName].filter(Boolean).join(" ") ||
										row.email}
								</span>
							</li>
						))}
					</ul>
					{matched.length > ROSTER_LIMIT && (
						<p className="text-muted-foreground text-xs">
							and {matched.length - ROSTER_LIMIT} more
						</p>
					)}
				</div>
			)}
		</div>
	);
}
