import { IconAlertTriangle } from "@tabler/icons-react";
import { nameDisagreements, sheetLine } from "@/shared/lib/sheet-analysis";
import type {
	Sheet,
	SheetMatchResult,
	SheetProblem,
} from "@/shared/lib/sheet-mapping";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import type { UnmatchedChoice } from "./use-sheet-wizard";

const LIST_LIMIT = 8;

function problemText(problem: SheetProblem, sheet: Sheet): string {
	if (problem.kind === "invalidEmail") {
		return `Row ${sheetLine(sheet, problem.row)}: “${problem.value}” is not an email address`;
	}
	return `${problem.email} appears in rows ${problem.rows
		.map((r) => sheetLine(sheet, r))
		.join(", ")}`;
}

const CHOICES = {
	choose: [
		{ value: "add", label: "Add them to the campaign anyway" },
		{ value: "skip", label: "Leave them out" },
	],
	confirm: [
		{ value: "block", label: "Stop, I will fix the file" },
		{ value: "skip", label: "Ignore them and carry on" },
	],
} satisfies Record<
	"choose" | "confirm",
	Array<{ value: UnmatchedChoice; label: string }>
>;

function toChoice(value: string | null, fallback: UnmatchedChoice) {
	return value === "add" || value === "skip" || value === "block"
		? value
		: fallback;
}

function More({ hidden }: { hidden: number }) {
	if (hidden <= 0) return null;
	return <li className="text-muted-foreground">and {hidden} more</li>;
}

interface MatchStepProps {
	sheet: Sheet;
	result: SheetMatchResult;
	problems: SheetProblem[];
	unmatchedMode: "choose" | "confirm";
	unmatched: UnmatchedChoice;
	recipientCount: number;
	onUnmatched: (value: UnmatchedChoice) => void;
}

export function MatchStep({
	sheet,
	result,
	problems,
	unmatchedMode,
	unmatched,
	recipientCount,
	onUnmatched,
}: MatchStepProps) {
	const matched = result.rows.filter((r) => r.kind === "user");
	const unknown = result.rows.filter((r) => r.kind === "unknown");
	const disagreements = nameDisagreements(sheet, result.rows);

	if (problems.length > 0) {
		return (
			<Alert data-testid="sheet-problems" variant="destructive">
				<AlertTitle>Correct the file before importing it</AlertTitle>
				<AlertDescription>
					<ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-4">
						{problems.slice(0, LIST_LIMIT).map((problem) => (
							<li key={problemText(problem, sheet)}>
								{problemText(problem, sheet)}
							</li>
						))}
						<More hidden={problems.length - LIST_LIMIT} />
					</ul>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="min-w-0 space-y-5 py-1 text-sm">
			<p data-testid="sheet-counts">
				<span className="text-base font-medium tabular-nums">
					{matched.length}
				</span>{" "}
				of <span className="tabular-nums">{result.rows.length}</span> have an
				account
				{unknown.length > 0 && (
					<span className="text-muted-foreground">
						{" · "}
						<span className="tabular-nums">{unknown.length}</span> not found
					</span>
				)}
			</p>

			{unknown.length > 0 && (
				<div className="space-y-2">
					<Label>Addresses with no account</Label>
					<RadioGroup
						onValueChange={(value) => onUnmatched(toChoice(value, unmatched))}
						value={unmatched}
					>
						{CHOICES[unmatchedMode].map((choice) => (
							<div className="flex items-center gap-2" key={choice.value}>
								<RadioGroupItem
									id={`unmatched-${choice.value}`}
									value={choice.value}
								/>
								<Label htmlFor={`unmatched-${choice.value}`}>
									{choice.label}
								</Label>
							</div>
						))}
					</RadioGroup>
					<ul className="text-muted-foreground max-h-28 overflow-y-auto text-xs">
						{unknown.slice(0, LIST_LIMIT).map((row) => (
							<li key={row.email}>
								{row.email} — row {sheetLine(sheet, row.row)}
							</li>
						))}
						<More hidden={unknown.length - LIST_LIMIT} />
					</ul>
				</div>
			)}

			{recipientCount === 0 && (
				<p className="text-destructive" data-testid="sheet-no-recipients">
					Nobody would be added. Add the addresses without an account, or import
					a file whose people are already in Suberus.
				</p>
			)}

			{disagreements.length > 0 && (
				<div className="space-y-1" data-testid="sheet-name-mismatch">
					<Label>Rows whose name differs from the account</Label>
					<ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs">
						{disagreements.slice(0, LIST_LIMIT).map((item) => (
							<li key={item.row}>
								<span className="text-muted-foreground">
									Row {sheetLine(sheet, item.row)}: {item.sheetText || "—"}{" "}
									→{" "}
								</span>
								{item.accountName}
							</li>
						))}
						<More hidden={disagreements.length - LIST_LIMIT} />
					</ul>
				</div>
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
								{warning.rows.length === 1 ? "row" : "rows"}{" "}
								{warning.rows
									.slice(0, 10)
									.map((r) => sheetLine(sheet, r))
									.join(", ")}
								{warning.rows.length > 10
									? ` and ${warning.rows.length - 10} more`
									: ""}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
