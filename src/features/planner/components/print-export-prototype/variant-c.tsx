import {
	IconArrowLeft,
	IconArrowRight,
	IconDownload,
} from "@tabler/icons-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { StepIndicator } from "@/shared/ui/step-indicator";
import { Segmented, useExportState, type VariantProps } from "./export-state";
import { PreviewPages } from "./preview-pages";
import {
	appliesToFormat,
	BOOK_SIZES,
	FORMATS,
	LANGUAGES,
	LAYOUTS,
	type Layout,
} from "./prototype-model";

export const VARIANT_C_NAME = "Guided steps: format → layout per day → review";

const STEPS = [
	{ id: 1, title: "Format" },
	{ id: 2, title: "Content & layout" },
	{ id: 3, title: "Review & download" },
] as const;

const PER_DAY: ReadonlyArray<{ value: Layout; label: string }> =
	LAYOUTS.flatMap((l) =>
		l.value === "auto" ? [] : [{ value: l.value, label: l.label }],
	);

export function VariantC({ data, format, onFormatChange }: VariantProps) {
	const s = useExportState(data, format);
	const [step, setStep] = useState(1);
	const [remember, setRemember] = useState(true);
	const xlsx = format === "xlsx";
	return (
		<div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
			<StepIndicator
				currentStep={step}
				orientation="horizontal"
				steps={STEPS}
			/>

			{step === 1 && (
				<div className="grid gap-3 sm:grid-cols-3">
					{FORMATS.map((f) => {
						const disabled = f.value === "idml" && !data.sidecarAvailable;
						return (
							<button
								className={cn(
									"hover:border-primary rounded-xl border p-4 text-left transition-colors disabled:opacity-50",
									f.value === format && "border-primary ring-primary/30 ring-2",
								)}
								disabled={disabled}
								key={f.value}
								onClick={() => onFormatChange(f.value)}
								type="button"
							>
								<div className="text-lg font-medium">{f.label}</div>
								<div className="text-muted-foreground text-sm">.{f.ext}</div>
								<div className="mt-2 text-sm">
									{disabled ? "Needs the document service" : f.hint}
								</div>
							</button>
						);
					})}
				</div>
			)}

			{step === 2 && (
				<div className="grid gap-6 md:grid-cols-2">
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label>Book size</Label>
							<Segmented
								disabled={xlsx}
								onChange={(v) => s.set("bookSize", v)}
								options={BOOK_SIZES}
								value={s.options.bookSize}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Labels language</Label>
							<Segmented
								onChange={(v) => s.set("language", v)}
								options={LANGUAGES}
								value={s.options.language}
							/>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								checked={s.options.trackColor}
								disabled={!appliesToFormat(format, "trackColor")}
								id="c-track"
								onCheckedChange={(v) => s.set("trackColor", v === true)}
							/>
							<Label htmlFor="c-track">Colour-code tracks (bar + legend)</Label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								checked={s.options.includeCancelled}
								id="c-cancelled"
								onCheckedChange={(v) => s.set("includeCancelled", v === true)}
							/>
							<Label htmlFor="c-cancelled">
								Include cancelled talks (struck through)
							</Label>
						</div>
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>At-a-glance layout per day</Label>
							<Button
								disabled={xlsx}
								onClick={() => s.set("layoutOverride", "auto")}
								size="xs"
								variant="ghost"
							>
								Reset to auto
							</Button>
						</div>
						<div className="divide-y rounded-lg border">
							{s.days.map((d) => (
								<div
									className="flex flex-wrap items-center justify-between gap-2 p-2 text-sm"
									key={d.index}
								>
									<div>
										<div className="font-medium">
											Day {d.index} · {d.label}
										</div>
										<div className="text-muted-foreground text-xs">
											{d.rooms.length} rooms · auto: {d.autoLayout}
											{d.landscape ? " · landscape" : ""}
										</div>
									</div>
									<Segmented
										disabled={xlsx}
										onChange={(v) => s.set("layoutOverride", v)}
										options={PER_DAY}
										size="xs"
										value={d.layout}
									/>
								</div>
							))}
						</div>
						<p className="text-muted-foreground text-xs">
							v1: picking a layout applies to every day.
						</p>
					</div>
				</div>
			)}

			{step === 3 && (
				<div className="space-y-4">
					{data.issues.length > 0 && (
						<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
							{data.issues.length} schedule issues will be printed as they are:{" "}
							{data.issues
								.slice(0, 2)
								.map((i) => i.message)
								.join("; ")}
							…
						</div>
					)}
					<div className="bg-muted/40 rounded-xl p-4">
						<PreviewPages
							{...data}
							days={s.days}
							direction="grid"
							format={format}
							options={s.options}
							pageWidth={180}
						/>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<Checkbox
								checked={remember}
								id="c-remember"
								onCheckedChange={(v) => setRemember(v === true)}
							/>
							<Label htmlFor="c-remember">
								Remember these options for next time
							</Label>
						</div>
						<Button
							disabled={s.blockedReason !== null || s.downloading}
							onClick={() => s.download(remember)}
							size="lg"
						>
							<IconDownload />
							{s.downloading ? "Generating…" : `Download ${s.fileName}`}
						</Button>
					</div>
					{s.blockedReason && (
						<p className="text-destructive text-sm">{s.blockedReason}</p>
					)}
				</div>
			)}

			<div className="flex justify-between border-t pt-4">
				<Button
					disabled={step === 1}
					onClick={() => setStep(step - 1)}
					variant="outline"
				>
					<IconArrowLeft /> Back
				</Button>
				{step < 3 && (
					<Button onClick={() => setStep(step + 1)}>
						Next <IconArrowRight />
					</Button>
				)}
			</div>
		</div>
	);
}
