import { IconAlertTriangle, IconDownload } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
	ON_OFF,
	Segmented,
	useExportState,
	type VariantProps,
} from "./export-state";
import { PreviewPages } from "./preview-pages";
import {
	appliesToFormat,
	BOOK_SIZES,
	FORMATS,
	LANGUAGES,
	LAYOUTS,
} from "./prototype-model";

export const VARIANT_A_NAME = "Print dialog: options left, pages right";

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

export function VariantA({ data, format, onFormatChange }: VariantProps) {
	const s = useExportState(data, format);
	const na = (k: Parameters<typeof appliesToFormat>[1]) =>
		!appliesToFormat(format, k);
	return (
		<div className="flex flex-col gap-6 p-4 md:flex-row md:p-6">
			<aside className="space-y-5 md:sticky md:top-4 md:h-fit md:w-80 md:shrink-0">
				<Row hint={s.meta.hint} label="Format">
					<Segmented
						onChange={onFormatChange}
						options={FORMATS}
						value={format}
					/>
				</Row>
				<Row
					hint={na("bookSize") ? "Not used for Excel" : undefined}
					label="Book size"
				>
					<Segmented
						disabled={na("bookSize")}
						onChange={(v) => s.set("bookSize", v)}
						options={BOOK_SIZES}
						value={s.options.bookSize}
					/>
				</Row>
				<Row
					hint={
						na("layoutOverride")
							? "Excel always uses rooms as columns"
							: "Auto picks per day from the number of rooms"
					}
					label="At-a-glance layout"
				>
					<Segmented
						disabled={na("layoutOverride")}
						onChange={(v) => s.set("layoutOverride", v)}
						options={LAYOUTS}
						value={s.options.layoutOverride}
					/>
				</Row>
				<Row label="Track colour">
					<Segmented
						disabled={na("trackColor")}
						onChange={(v) => s.set("trackColor", v === "on")}
						options={ON_OFF}
						value={s.options.trackColor ? "on" : "off"}
					/>
				</Row>
				<Row label="Cancelled talks">
					<Segmented
						onChange={(v) => s.set("includeCancelled", v === "on")}
						options={[
							{ value: "off", label: "Hide" },
							{ value: "on", label: "Include" },
						]}
						value={s.options.includeCancelled ? "on" : "off"}
					/>
				</Row>
				<Row hint="Fixed labels: Room, Chair, weekdays" label="Labels language">
					<Segmented
						onChange={(v) => s.set("language", v)}
						options={LANGUAGES}
						value={s.options.language}
					/>
				</Row>
				{data.issues.length > 0 && (
					<Alert>
						<IconAlertTriangle />
						<AlertTitle>{data.issues.length} schedule issues</AlertTitle>
						<AlertDescription>
							<ul className="list-disc pl-4">
								{data.issues.slice(0, 3).map((i) => (
									<li key={`${i.kind}-${i.message}`}>{i.message}</li>
								))}
							</ul>
							Export still works.
						</AlertDescription>
					</Alert>
				)}
				<div className="space-y-1.5 border-t pt-4">
					<Button
						className="w-full"
						disabled={s.blockedReason !== null || s.downloading}
						onClick={() => s.download(true)}
						size="lg"
					>
						<IconDownload />
						{s.downloading ? "Generating…" : `Download ${s.fileName}`}
					</Button>
					<p className="text-muted-foreground text-xs">
						{s.blockedReason ??
							"Options are saved as the default for the next export."}
					</p>
				</div>
			</aside>
			<section className="bg-muted/50 min-w-0 flex-1 rounded-xl p-4 md:p-6">
				<div className="md:hidden">
					<PreviewPages
						{...data}
						days={s.days}
						direction="grid"
						format={format}
						options={s.options}
						pageWidth={150}
					/>
				</div>
				<div className="hidden md:block">
					<PreviewPages
						{...data}
						days={s.days}
						format={format}
						options={s.options}
						pageWidth={520}
					/>
				</div>
			</section>
		</div>
	);
}
