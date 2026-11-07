import { IconAlertTriangle } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useId } from "react";
import { PRINT_LABELS } from "@/features/planner/print/print-labels";
import {
	BOOK_SIZES,
	FORMAT_META,
	IDML_UNAVAILABLE,
	PRINT_FORMATS,
	PRINT_PARTS,
	type PrintFormat,
	type PrintOptions,
	type PrintPart,
} from "@/features/planner/print/print-options-schema";
import type { ScheduleIssue } from "@/features/planner/server/schedule-issues";
import { cn, pluralize } from "@/shared/lib/utils";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { SegmentedControl } from "@/shared/ui/segmented-control";

const { parts: partLabels } = PRINT_LABELS.en;
const PART_LABELS = {
	title: "Title & contents",
	glance: partLabels.glance,
	detailed: partLabels.detailed,
	index: partLabels.index,
} satisfies Record<PrintPart, string>;

type Layout = PrintOptions["layoutOverride"];

const LAYOUTS: ReadonlyArray<{ value: Layout; label: string; hint: string }> = [
	{
		value: "auto",
		label: "Auto",
		hint: "Picks a layout per day from the number of rooms",
	},
	{
		value: "columns",
		label: "Rooms as columns",
		hint: "One column per room; landscape pages for many rooms",
	},
	{
		value: "spread",
		label: "Spread",
		hint: "Grid split across two facing pages",
	},
	{
		value: "transposed",
		label: "Transposed",
		hint: "Rooms as rows and times as columns, for very many rooms",
	},
	{
		value: "list",
		label: "List",
		hint: "Time blocks listed one after another, no grid",
	},
];

type SetOption = <K extends keyof PrintOptions>(
	key: K,
	value: PrintOptions[K],
) => void;

interface FieldIds {
	labelledBy: string;
	describedBy: string | undefined;
}

function Row({
	label,
	hint,
	error,
	children,
}: {
	label: string;
	hint?: string;
	error?: string | null;
	children: (ids: FieldIds) => ReactNode;
}) {
	const id = useId();
	const note = error ?? hint;
	return (
		<div className="space-y-1.5">
			<p className="text-sm leading-none font-medium" id={`${id}-label`}>
				{label}
			</p>
			{children({
				labelledBy: `${id}-label`,
				describedBy: note ? `${id}-note` : undefined,
			})}
			{note && (
				<p
					className={cn(
						"text-xs",
						error ? "text-destructive" : "text-muted-foreground",
					)}
					id={`${id}-note`}
				>
					{note}
				</p>
			)}
		</div>
	);
}

function CheckItem({
	id,
	label,
	checked,
	disabled,
	onChange,
}: {
	id: string;
	label: string;
	checked: boolean;
	disabled?: boolean;
	onChange: (on: boolean) => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<Checkbox
				checked={checked}
				disabled={disabled}
				id={id}
				onCheckedChange={(v) => onChange(v === true)}
			/>
			<Label className="font-normal" htmlFor={id}>
				{label}
			</Label>
		</div>
	);
}

function IncludeRow({
	options,
	set,
	excel,
	hasLogo,
	error,
}: {
	options: PrintOptions;
	set: SetOption;
	excel: boolean;
	hasLogo: boolean;
	error: string | null;
}) {
	const toggle = (part: PrintPart, on: boolean) =>
		set(
			"parts",
			on ? [...options.parts, part] : options.parts.filter((p) => p !== part),
		);
	return (
		<Row
			error={error}
			hint={excel ? "Title and logo are not used in Excel" : undefined}
			label="Include"
		>
			{({ labelledBy, describedBy }) => (
				<div
					aria-describedby={describedBy}
					aria-labelledby={labelledBy}
					className={cn(
						"space-y-2",
						error && "border-destructive/60 -mx-2 rounded-md border p-2",
					)}
					data-testid="print-parts"
					role="group"
				>
					{PRINT_PARTS.map((part) => (
						<CheckItem
							checked={options.parts.includes(part)}
							disabled={excel && part === "title"}
							id={`print-part-${part}`}
							key={part}
							label={PART_LABELS[part]}
							onChange={(on) => toggle(part, on)}
						/>
					))}
					<CheckItem
						checked={hasLogo && options.showLogo}
						disabled={excel || !hasLogo}
						id="print-part-logo"
						label={
							hasLogo
								? "Logo"
								: "Logo (set a PNG or JPEG in Settings › Branding)"
						}
						onChange={(on) => set("showLogo", on)}
					/>
				</div>
			)}
		</Row>
	);
}

function BookRows({ options, set }: { options: PrintOptions; set: SetOption }) {
	const layoutHint = LAYOUTS.find((l) => l.value === options.layoutOverride);
	return (
		<>
			<Row label="Book size">
				{(ids) => (
					<SegmentedControl
						{...ids}
						onChange={(v) => set("bookSize", v)}
						options={BOOK_SIZES.map((b) => ({ value: b, label: b }))}
						value={options.bookSize}
					/>
				)}
			</Row>
			<Row hint={layoutHint?.hint} label="At-a-glance layout">
				{(ids) => (
					<SegmentedControl
						{...ids}
						onChange={(v) => set("layoutOverride", v)}
						options={LAYOUTS}
						value={options.layoutOverride}
					/>
				)}
			</Row>
		</>
	);
}

function ContentRows({
	options,
	set,
}: {
	options: PrintOptions;
	set: SetOption;
}) {
	return (
		<>
			<Row label="Track colour">
				{() => (
					<CheckItem
						checked={options.trackColor}
						id="print-track-colour"
						label="Colour sessions by track, with a legend"
						onChange={(on) => set("trackColor", on)}
					/>
				)}
			</Row>
			<Row label="Cancelled talks">
				{(ids) => (
					<SegmentedControl
						{...ids}
						onChange={(v) => set("includeCancelled", v === "include")}
						options={[
							{ value: "hide", label: "Hide" },
							{ value: "include", label: "Include" },
						]}
						value={options.includeCancelled ? "include" : "hide"}
					/>
				)}
			</Row>
			<Row
				hint="Fixed labels such as Room, Chair and weekdays"
				label="Labels language"
			>
				{(ids) => (
					<SegmentedControl
						{...ids}
						onChange={(v) => set("language", v)}
						options={[
							{ value: "en", label: "English" },
							{ value: "pl", label: "Polski" },
						]}
						value={options.language}
					/>
				)}
			</Row>
		</>
	);
}

function IssuesNote({ issues }: { issues: ScheduleIssue[] }) {
	if (issues.length === 0) return null;
	return (
		<details className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
			<summary className="cursor-pointer text-amber-700 dark:text-amber-400">
				<IconAlertTriangle className="mr-1.5 inline size-4 -translate-y-px" />
				{issues.length} schedule {pluralize(issues.length, "issue")}. Export
				still works and prints the schedule as it is.
			</summary>
			<ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-xs">
				{issues.map((i) => (
					<li key={`${i.kind}-${i.sessionIds.join()}-${i.message}`}>
						{i.message}
					</li>
				))}
			</ul>
			<Link
				className="text-primary-ink mt-2 inline-block text-xs underline underline-offset-2"
				to="/admin/program-planner"
			>
				Fix in the planner
			</Link>
		</details>
	);
}

function DownloadStatus({
	fileName,
	blockedReason,
	draft,
}: {
	fileName: string;
	blockedReason: string | null;
	draft: boolean;
}) {
	return (
		<div className="space-y-1 text-xs" data-testid="print-download-note">
			{blockedReason ? (
				<p className="text-destructive">{blockedReason}</p>
			) : (
				<p className="text-muted-foreground">
					<span className="text-foreground font-medium break-all">
						{fileName}
					</span>{" "}
					· the options are saved as the default when you download.
				</p>
			)}
			{draft && (
				<p className="text-muted-foreground">
					Draft: files carry a DRAFT mark until the schedule is published.
				</p>
			)}
		</div>
	);
}

interface ExportOptionsPanelProps {
	format: PrintFormat;
	onFormatChange: (format: PrintFormat) => void;
	options: PrintOptions;
	set: SetOption;
	hasLogo: boolean;
	idmlAvailable: boolean;
	issues: ScheduleIssue[];
	fileName: string;
	blockedReason: string | null;
	partsError: string | null;
	draft: boolean;
}

export function ExportOptionsPanel({
	format,
	onFormatChange,
	options,
	set,
	hasLogo,
	idmlAvailable,
	issues,
	partsError,
	...status
}: ExportOptionsPanelProps) {
	const excel = format === "xlsx";
	const formatHint = idmlAvailable
		? FORMAT_META[format].hint
		: `${FORMAT_META[format].hint}. ${IDML_UNAVAILABLE}`;
	return (
		<aside className="space-y-5 md:w-80 md:shrink-0">
			<DownloadStatus {...status} />
			<IssuesNote issues={issues} />
			<Row hint={formatHint} label="Format">
				{(ids) => (
					<SegmentedControl
						{...ids}
						onChange={onFormatChange}
						options={PRINT_FORMATS.map((f) => ({
							value: f,
							label: FORMAT_META[f].label,
							disabled: f === "idml" && !idmlAvailable,
						}))}
						testId="print-format"
						value={format}
					/>
				)}
			</Row>
			<IncludeRow
				error={partsError}
				excel={excel}
				hasLogo={hasLogo}
				options={options}
				set={set}
			/>
			{!excel && <BookRows options={options} set={set} />}
			<ContentRows options={options} set={set} />
		</aside>
	);
}
