import { IconCheck } from "@tabler/icons-react";
import type { ProgramTrackWithStats } from "@/features/planner/server/tracks";
import { Form } from "@/shared/components/composable/form";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useTrackForm } from "./hooks/use-track-form";

const SERIES_RE = /^(.+?)\s+(\d+)$/;

function parseSeries(name: string) {
	const m = name.trim().match(SERIES_RE);
	if (!m) return { series: null, seriesOrder: null };
	return { series: m[1].trim(), seriesOrder: Number.parseInt(m[2], 10) };
}

interface ProgramTrackDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	track?: ProgramTrackWithStats;
	onSuccess: () => void;
}

const PRESET_COLORS = [
	"#ef4444",
	"#f97316",
	"#eab308",
	"#22c55e",
	"#14b8a6",
	"#3b82f6",
	"#8b5cf6",
	"#ec4899",
];

export function ProgramTrackDialog({
	open,
	onOpenChange,
	track,
	onSuccess,
}: ProgramTrackDialogProps) {
	const { form, isEdit } = useTrackForm({
		track,
		onSuccess,
		onClose: () => onOpenChange(false),
	});

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent data-testid="program-track-dialog">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Program Track" : "Create Program Track"}
					</DialogTitle>
					<DialogDescription className="sr-only">
						Set the program track's name and color.
					</DialogDescription>
				</DialogHeader>

				<Form
					className="space-y-4"
					onSubmit={() => {
						void form.handleSubmit();
					}}
				>
					<form.AppField name="name">
						{(field) => {
							const series = parseSeries(field.state.value);
							return (
								<div className="space-y-2">
									<field.InputField
										label="Name"
										placeholder={'e.g. "ML" or "ML 2"'}
										testId="program-track-name"
									/>
									{series.series ? (
										<div className="text-muted-foreground flex items-center gap-2 text-xs">
											<span>Detected series:</span>
											<Badge className="font-mono" variant="outline">
												{series.series} · #{series.seriesOrder}
											</Badge>
										</div>
									) : (
										<p className="text-muted-foreground text-xs">
											Suffix with a number to link sessions into a series (e.g.
											"ML 2").
										</p>
									)}
								</div>
							);
						}}
					</form.AppField>

					<form.Field name="color">
						{(field) => (
							<div className="space-y-2">
								<Label>Color</Label>
								<div className="flex flex-wrap items-center gap-2">
									{PRESET_COLORS.map((c) => {
										const active =
											field.state.value.toLowerCase() === c.toLowerCase();
										return (
											<button
												aria-label={`Pick ${c}`}
												aria-pressed={active}
												className={cn(
													"relative size-8 rounded-full border-2 transition-transform hover:scale-110",
													active
														? "border-foreground shadow-sm"
														: "border-transparent",
												)}
												key={c}
												onClick={() => field.handleChange(c)}
												style={{ backgroundColor: c }}
												type="button"
											>
												{active && (
													<IconCheck className="absolute inset-0 m-auto size-4 text-white mix-blend-difference" />
												)}
											</button>
										);
									})}
									<button
										aria-label="Clear color"
										aria-pressed={field.state.value === ""}
										className={cn(
											"flex size-8 items-center justify-center rounded-full border-2 text-xs text-muted-foreground",
											field.state.value === ""
												? "border-foreground bg-muted"
												: "border-dashed border-muted-foreground/40",
										)}
										onClick={() => field.handleChange("")}
										type="button"
									>
										—
									</button>
								</div>
								<div className="flex gap-2">
									<Input
										aria-label="Custom color"
										className="h-8 w-12 cursor-pointer p-0.5"
										onChange={(e) => field.handleChange(e.target.value)}
										type="color"
										value={field.state.value || "#64748b"}
									/>
									<Input
										className="flex-1 font-mono uppercase"
										maxLength={7}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="#RRGGBB (optional)"
										value={field.state.value}
									/>
								</div>
							</div>
						)}
					</form.Field>

					<DialogFooter>
						<Button
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<form.AppForm>
							<form.SubmitButton
								label={isEdit ? "Save" : "Create"}
								testId="program-track-submit"
							/>
						</form.AppForm>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
