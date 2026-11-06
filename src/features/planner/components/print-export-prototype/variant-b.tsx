import {
	IconAlertTriangle,
	IconCheck,
	IconChevronDown,
	IconDownload,
} from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
	ON_OFF,
	Segmented,
	useExportState,
	type VariantProps,
} from "./export-state";
import { pageCount, PreviewPages } from "./preview-pages";
import {
	appliesToFormat,
	BOOK_SIZES,
	FORMATS,
	LANGUAGES,
	LAYOUTS,
	type PrintOptions,
} from "./prototype-model";

export const VARIANT_B_NAME = "Preview first: toolbar chips, autosave";

function Chip({
	label,
	value,
	disabled,
	children,
}: {
	label: string;
	value: string;
	disabled?: boolean;
	children: ReactNode;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					className="hover:bg-muted inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs disabled:opacity-40"
					disabled={disabled}
					type="button"
				>
					<span className="text-muted-foreground">{label}</span>
					<span className="font-medium">{value}</span>
					<IconChevronDown className="size-3" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-auto">{children}</PopoverContent>
		</Popover>
	);
}

// fallow-ignore-next-line complexity -- throwaway prototype, never merged
export function VariantB({ data, format, onFormatChange }: VariantProps) {
	const s = useExportState(data, format);
	const [zoom, setZoom] = useState<"fit" | "strip">("strip");
	const na = (k: keyof PrintOptions) => !appliesToFormat(format, k);
	const setAndSave = <K extends keyof PrintOptions>(
		key: K,
		value: PrintOptions[K],
	) => {
		const next = { ...s.options, [key]: value };
		s.setOptions(next);
		s.saveDefaults(next);
	};
	const label = <T extends string>(
		list: ReadonlyArray<{ value: T; label: string }>,
		v: T,
	) => list.find((x) => x.value === v)?.label ?? v;
	const pages = pageCount({
		...data,
		days: s.days,
		format,
		options: s.options,
		pageWidth: 0,
	});
	return (
		<div className="flex flex-col">
			<div className="bg-background/95 sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b px-4 py-2 backdrop-blur md:px-6">
				<Segmented onChange={onFormatChange} options={FORMATS} value={format} />
				<div className="bg-border mx-1 hidden h-6 w-px md:block" />
				<Chip disabled={na("bookSize")} label="Size" value={s.options.bookSize}>
					<Segmented
						onChange={(v) => setAndSave("bookSize", v)}
						options={BOOK_SIZES}
						value={s.options.bookSize}
					/>
				</Chip>
				<Chip
					disabled={na("layoutOverride")}
					label="Grid"
					value={label(LAYOUTS, s.options.layoutOverride)}
				>
					<div className="max-w-xs space-y-2">
						<Segmented
							onChange={(v) => setAndSave("layoutOverride", v)}
							options={LAYOUTS}
							value={s.options.layoutOverride}
						/>
						<ul className="text-muted-foreground text-xs">
							{s.days.map((d) => (
								<li key={d.index}>
									Day {d.index}: {d.rooms.length} rooms → {d.autoLayout}
								</li>
							))}
						</ul>
					</div>
				</Chip>
				<Chip
					disabled={na("trackColor")}
					label="Colour"
					value={s.options.trackColor ? "On" : "Off"}
				>
					<Segmented
						onChange={(v) => setAndSave("trackColor", v === "on")}
						options={ON_OFF}
						value={s.options.trackColor ? "on" : "off"}
					/>
				</Chip>
				<Chip
					label="Cancelled"
					value={s.options.includeCancelled ? "Shown" : "Hidden"}
				>
					<Segmented
						onChange={(v) => setAndSave("includeCancelled", v === "on")}
						options={ON_OFF}
						value={s.options.includeCancelled ? "on" : "off"}
					/>
				</Chip>
				<Chip label="Labels" value={s.options.language.toUpperCase()}>
					<Segmented
						onChange={(v) => setAndSave("language", v)}
						options={LANGUAGES}
						value={s.options.language}
					/>
				</Chip>
				<div className="ml-auto flex items-center gap-3">
					<span className="text-muted-foreground hidden items-center gap-1 text-xs sm:inline-flex">
						<IconCheck className="size-3.5" /> Saved as default
					</span>
					{data.issues.length > 0 && (
						<Popover>
							<PopoverTrigger asChild>
								<button
									className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
									type="button"
								>
									<IconAlertTriangle className="size-3.5" />{" "}
									{data.issues.length}
								</button>
							</PopoverTrigger>
							<PopoverContent className="text-xs">
								<ul className="list-disc space-y-1 pl-4">
									{data.issues.map((i) => (
										<li key={`${i.kind}-${i.message}`}>{i.message}</li>
									))}
								</ul>
							</PopoverContent>
						</Popover>
					)}
					<Button
						disabled={s.blockedReason !== null || s.downloading}
						onClick={() => s.download(false)}
						title={s.blockedReason ?? undefined}
					>
						<IconDownload />
						{s.downloading ? "Generating…" : "Download"}
					</Button>
				</div>
			</div>
			<div className="text-muted-foreground flex items-center justify-between px-4 pt-3 text-xs md:px-6">
				<span>
					{s.blockedReason ??
						(format === "xlsx"
							? `${s.fileName} · sheets: Program, one per day, Authors`
							: `${s.fileName} · ${pages} pages (estimate)`)}
				</span>
				{format !== "xlsx" && (
					<Segmented
						onChange={setZoom}
						options={[
							{ value: "strip", label: "Filmstrip" },
							{ value: "fit", label: "Large" },
						]}
						size="xs"
						value={zoom}
					/>
				)}
			</div>
			<div className="bg-muted/40 m-4 rounded-xl p-4 md:m-6">
				<PreviewPages
					{...data}
					days={s.days}
					direction={zoom === "strip" ? "row" : "column"}
					format={format}
					options={s.options}
					pageWidth={zoom === "strip" ? 260 : 680}
				/>
			</div>
		</div>
	);
}
