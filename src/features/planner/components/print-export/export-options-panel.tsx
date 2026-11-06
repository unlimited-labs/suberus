import { IconAlertTriangle, IconDownload } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { GLANCE_LAYOUTS } from "@/features/planner/print/print-options-schema";
import {
	BOOK_SIZES,
	PRINT_FORMATS,
	PRINT_PARTS,
	type PrintFormat,
	type PrintOptions,
	type PrintPart,
} from "@/features/planner/print/print-options-schema";
import type { ScheduleIssue } from "@/features/planner/server/schedule-issues";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { SegmentedControl } from "./segmented-control";
import { FORMAT_META } from "./use-print-export";

const PART_LABELS = {
	title: "Title & contents",
	glance: "Program at a glance",
	detailed: "Detailed program",
	index: "Author index",
} satisfies Record<PrintPart, string>;

const LAYOUT_OPTIONS = [
	{ value: "auto", label: "Auto" },
	{ value: "columns", label: "Rooms as columns" },
	{ value: "spread", label: "Spread" },
	{ value: "transposed", label: "Transposed" },
	{ value: "list", label: "List" },
] satisfies {
	value: "auto" | (typeof GLANCE_LAYOUTS)[number];
	label: string;
}[];

const ON_OFF = [
	{ value: "on", label: "On" },
	{ value: "off", label: "Off" },
] as const;

const NOT_FOR_EXCEL = "Not used for Excel";

type SetOption = <K extends keyof PrintOptions>(
	key: K,
	value: PrintOptions[K],
) => void;

function Row({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<Label>{label}</Label>
			{children}
			{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
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
	disabled: boolean;
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

function IncludeList({
	options,
	set,
	excel,
	hasLogo,
}: {
	options: PrintOptions;
	set: SetOption;
	excel: boolean;
	hasLogo: boolean;
}) {
	const toggle = (part: PrintPart, on: boolean) =>
		set(
			"parts",
			on ? [...options.parts, part] : options.parts.filter((p) => p !== part),
		);
	return (
		<div className="space-y-2" data-testid="print-parts">
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
				label={hasLogo ? "Logo" : "Logo (no logo set)"}
				onChange={(on) => set("showLogo", on)}
			/>
		</div>
	);
}

function LayoutRows({
	options,
	set,
	excel,
}: {
	options: PrintOptions;
	set: SetOption;
	excel: boolean;
}) {
	return (
		<>
			<Row hint={excel ? NOT_FOR_EXCEL : undefined} label="Book size">
				<SegmentedControl
					disabled={excel}
					label="Book size"
					onChange={(v) => set("bookSize", v)}
					options={BOOK_SIZES.map((b) => ({ value: b, label: b }))}
					value={options.bookSize}
				/>
			</Row>
			<Row
				hint={
					excel
						? "Excel always uses rooms as columns"
						: "Auto picks per day from the number of rooms"
				}
				label="At-a-glance layout"
			>
				<SegmentedControl
					disabled={excel}
					label="At-a-glance layout"
					onChange={(v) => set("layoutOverride", v)}
					options={LAYOUT_OPTIONS}
					value={options.layoutOverride}
				/>
			</Row>
			<Row hint={excel ? NOT_FOR_EXCEL : undefined} label="Track colour">
				<SegmentedControl
					disabled={excel}
					label="Track colour"
					onChange={(v) => set("trackColor", v === "on")}
					options={ON_OFF}
					value={options.trackColor ? "on" : "off"}
				/>
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
			<Row label="Cancelled talks">
				<SegmentedControl
					label="Cancelled talks"
					onChange={(v) => set("includeCancelled", v === "include")}
					options={[
						{ value: "hide", label: "Hide" },
						{ value: "include", label: "Include" },
					]}
					value={options.includeCancelled ? "include" : "hide"}
				/>
			</Row>
			<Row
				hint="Fixed labels such as Room, Chair and weekdays"
				label="Labels language"
			>
				<SegmentedControl
					label="Labels language"
					onChange={(v) => set("language", v)}
					options={[
						{ value: "en", label: "English" },
						{ value: "pl", label: "Polski" },
					]}
					value={options.language}
				/>
			</Row>
		</>
	);
}

function IssuesAlert({ issues }: { issues: ScheduleIssue[] }) {
	if (issues.length === 0) return null;
	return (
		<Alert>
			<IconAlertTriangle />
			<AlertTitle>{issues.length} schedule issues</AlertTitle>
			<AlertDescription>
				<ul className="list-disc pl-4">
					{issues.slice(0, 3).map((i) => (
						<li key={`${i.kind}-${i.sessionIds.join()}-${i.message}`}>
							{i.message}
						</li>
					))}
				</ul>
				Export still works.
			</AlertDescription>
		</Alert>
	);
}

interface DownloadProps {
	fileName: string;
	blockedReason: string | null;
	downloading: boolean;
	onDownload: () => void;
}

function DownloadFooter({
	fileName,
	blockedReason,
	downloading,
	onDownload,
}: DownloadProps) {
	return (
		<div className="space-y-1.5 border-t pt-4">
			<Button
				className="w-full"
				data-testid="print-download"
				disabled={blockedReason !== null || downloading}
				onClick={onDownload}
				size="lg"
			>
				<IconDownload />
				{downloading ? "Generating…" : `Download ${fileName}`}
			</Button>
			<p
				className="text-muted-foreground text-xs"
				data-testid="print-download-note"
			>
				{blockedReason ??
					"Options are saved as the default for the next export."}
			</p>
		</div>
	);
}

interface ExportOptionsPanelProps extends DownloadProps {
	format: PrintFormat;
	onFormatChange: (format: PrintFormat) => void;
	options: PrintOptions;
	set: SetOption;
	hasLogo: boolean;
	issues: ScheduleIssue[];
}

export function ExportOptionsPanel({
	format,
	onFormatChange,
	options,
	set,
	hasLogo,
	issues,
	...download
}: ExportOptionsPanelProps) {
	const excel = format === "xlsx";
	return (
		<aside className="space-y-5 md:sticky md:top-4 md:h-fit md:w-80 md:shrink-0">
			<Row hint={FORMAT_META[format].hint} label="Format">
				<SegmentedControl
					label="Format"
					onChange={onFormatChange}
					options={PRINT_FORMATS.map((f) => ({
						value: f,
						label: FORMAT_META[f].label,
					}))}
					testId="print-format"
					value={format}
				/>
			</Row>
			<Row label="Include">
				<IncludeList
					excel={excel}
					hasLogo={hasLogo}
					options={options}
					set={set}
				/>
			</Row>
			<LayoutRows excel={excel} options={options} set={set} />
			<ContentRows options={options} set={set} />
			<IssuesAlert issues={issues} />
			<DownloadFooter {...download} />
		</aside>
	);
}
