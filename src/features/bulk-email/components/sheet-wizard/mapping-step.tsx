import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { suggestPlaceholderKey } from "../../lib/placeholders";
import type { Sheet } from "../../validations";
import type { MappingRow } from "./use-sheet-wizard";

const TARGETS = [
	{ value: "skip", label: "Skip" },
	{ value: "data", label: "Placeholder" },
	{ value: "firstName", label: "First name" },
	{ value: "lastName", label: "Last name" },
] as const;

function targetValue(target: MappingRow["target"]): string {
	return target.kind === "builtin" ? target.field : target.kind;
}

function toTarget(value: string, header: string): MappingRow["target"] {
	if (value === "data")
		return { kind: "data", key: suggestPlaceholderKey(header) };
	if (value === "firstName" || value === "lastName") {
		return { kind: "builtin", field: value };
	}
	return { kind: "skip" };
}

interface MappingStepProps {
	sheet: Sheet;
	mapping: MappingRow[];
	allowNames: boolean;
	error: string | null;
	onTarget: (column: number, target: MappingRow["target"]) => void;
}

export function MappingStep({
	sheet,
	mapping,
	allowNames,
	error,
	onTarget,
}: MappingStepProps) {
	const keys = mapping.flatMap((row) =>
		row.target.kind === "data" ? [row.target.key] : [],
	);
	const options = allowNames
		? TARGETS
		: TARGETS.filter((t) => t.value !== "firstName" && t.value !== "lastName");

	return (
		<div className="max-h-[60vh] space-y-3 overflow-y-auto py-1">
			<div className="space-y-2" data-testid="sheet-mapping">
				<div className="text-muted-foreground hidden gap-2 text-xs sm:grid sm:grid-cols-[1fr_11rem_1fr]">
					<span>Column</span>
					<span>Use as</span>
					<span>Example</span>
				</div>
				{mapping.map((row) => {
					const header = sheet.columns[row.column] ?? "";
					const example = sheet.rows[0]?.[row.column] ?? "";
					return (
						<div
							className="grid grid-cols-1 items-center gap-2 border-b pb-2 last:border-0 sm:grid-cols-[1fr_11rem_1fr]"
							key={row.column}
						>
							<p className="truncate text-sm font-medium">{header}</p>
							<div className="space-y-1">
								<Select
									items={options.map((t) => ({
										value: t.value,
										label: t.label,
									}))}
									onValueChange={(value) =>
										onTarget(row.column, toTarget(value ?? "skip", header))
									}
									value={targetValue(row.target)}
								>
									<SelectTrigger
										aria-label={`Use ${header} as`}
										data-testid={`sheet-target-${row.column}`}
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{options.map((t) => (
											<SelectItem key={t.value} value={t.value}>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{row.target.kind === "data" && (
									<Input
										aria-label={`Placeholder key for ${header}`}
										className="font-mono text-xs"
										data-testid={`sheet-key-${row.column}`}
										onChange={(e) =>
											onTarget(row.column, {
												kind: "data",
												key: e.target.value,
											})
										}
										value={row.target.key}
									/>
								)}
							</div>
							<p className="text-muted-foreground truncate text-sm">
								{example}
							</p>
						</div>
					);
				})}
			</div>

			{error && (
				<p
					className="text-destructive text-sm"
					data-testid="sheet-mapping-error"
				>
					{error}
				</p>
			)}

			{keys.length > 0 && !error && (
				<p className="text-sm">
					In the message write{" "}
					{keys.map((key) => (
						<Badge
							className="mx-0.5 font-mono text-xs"
							key={key}
							variant="outline"
						>
							{`{{${key}}}`}
						</Badge>
					))}
				</p>
			)}
		</div>
	);
}
