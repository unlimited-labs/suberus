import { useState } from "react";
import { toast } from "sonner";
import type { ScheduleIssue } from "@/features/planner/server/schedule-issues";
import type { ProgramSessionDetail } from "@/features/planner/server/sessions";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
	buildDays,
	type DayBreak,
	DEFAULT_OPTIONS,
	type ExportFormat,
	FORMATS,
	type PrintOptions,
} from "./prototype-model";

export interface ExportPageData {
	sessions: ProgramSessionDetail[];
	breaks: DayBreak[];
	roomOrder: string[];
	tz: string;
	conferenceName: string;
	dates: string;
	draft: boolean;
	issues: ScheduleIssue[];
	sidecarAvailable: boolean;
}

export interface VariantProps {
	data: ExportPageData;
	format: ExportFormat;
	onFormatChange: (f: ExportFormat) => void;
}

let savedDefaults: PrintOptions = DEFAULT_OPTIONS;

export function useExportState(data: ExportPageData, format: ExportFormat) {
	const [options, setOptions] = useState<PrintOptions>(savedDefaults);
	const [downloading, setDownloading] = useState(false);
	const [lastSaved, setLastSaved] = useState<PrintOptions>(savedDefaults);
	const days = buildDays(
		data.sessions,
		data.breaks,
		data.roomOrder,
		data.tz,
		options,
	);
	const set = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) =>
		setOptions((o) => ({ ...o, [key]: value }));
	const saveDefaults = (o: PrintOptions = options) => {
		savedDefaults = o;
		setLastSaved(o);
	};
	const meta = FORMATS.find((f) => f.value === format) ?? FORMATS[0];
	const fileName = `program${data.draft ? "-DRAFT" : ""}.${meta.ext}`;
	const blockedReason =
		data.sessions.length === 0
			? "The program has no sessions yet."
			: format === "idml" && !data.sidecarAvailable
				? "InDesign export needs the document service (DOCX_API_URL)."
				: null;
	const download = (persist: boolean) => {
		setDownloading(true);
		setTimeout(() => {
			setDownloading(false);
			if (persist) saveDefaults();
			toast.success(`Prototype: would download ${fileName}`, {
				description: persist ? "Options saved as defaults." : undefined,
			});
		}, 900);
	};
	const dirty = JSON.stringify(options) !== JSON.stringify(lastSaved);
	return {
		options,
		setOptions,
		set,
		days,
		download,
		downloading,
		fileName,
		blockedReason,
		saveDefaults,
		dirty,
		meta,
	};
}

export function Segmented<T extends string>({
	value,
	options,
	onChange,
	disabled,
	size = "sm",
}: {
	value: T;
	options: ReadonlyArray<{ value: T; label: string }>;
	onChange: (v: T) => void;
	disabled?: boolean;
	size?: "sm" | "xs";
}) {
	return (
		<div className="bg-muted inline-flex flex-wrap gap-0.5 rounded-lg p-0.5">
			{options.map((o) => (
				<Button
					className={cn(value !== o.value && "text-muted-foreground")}
					disabled={disabled}
					key={o.value}
					onClick={() => onChange(o.value)}
					size={size}
					type="button"
					variant={value === o.value ? "outline" : "ghost"}
				>
					{o.label}
				</Button>
			))}
		</div>
	);
}

export const ON_OFF: ReadonlyArray<{ value: "on" | "off"; label: string }> = [
	{ value: "on", label: "On" },
	{ value: "off", label: "Off" },
];
