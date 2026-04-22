import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProgramTrackWithStats } from "@/lib/server/planner/tracks";
import { cn } from "@/lib/utils";
import {
	createProgramTrackFn,
	updateProgramTrackFn,
} from "@/server-fns/planner/tracks";

const SERIES_RE = /^(.+?)\s+(\d+)$/;

function parseSeries(name: string): {
	series: string | null;
	seriesOrder: number | null;
} {
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
	"#ef4444", // red
	"#f97316", // orange
	"#eab308", // amber
	"#22c55e", // green
	"#14b8a6", // teal
	"#3b82f6", // blue
	"#8b5cf6", // violet
	"#ec4899", // pink
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function ProgramTrackDialog({
	open,
	onOpenChange,
	track,
	onSuccess,
}: ProgramTrackDialogProps) {
	const isEdit = !!track;
	const [name, setName] = useState(track?.name ?? "");
	const [color, setColor] = useState<string>(track?.color ?? "");
	const [isSaving, setIsSaving] = useState(false);

	const seriesPreview = useMemo(() => parseSeries(name), [name]);

	const handleSave = async () => {
		const trimmed = name.trim();
		if (!trimmed) {
			toast.error("Track name is required");
			return;
		}
		if (color && !HEX_RE.test(color)) {
			toast.error("Color must be in #RRGGBB format");
			return;
		}

		setIsSaving(true);
		try {
			if (isEdit) {
				await updateProgramTrackFn({
					data: {
						id: track.id,
						name: trimmed,
						color: color || null,
					},
				});
				toast.success("Program track updated");
			} else {
				await createProgramTrackFn({
					data: { name: trimmed, color: color || null },
				});
				toast.success("Program track created");
			}
			onSuccess();
			onOpenChange(false);
			setName("");
			setColor("");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to save track";
			toast.error(message);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-testid="program-track-dialog">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Program Track" : "Create Program Track"}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="track-name">Name *</Label>
						<Input
							id="track-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={'e.g. "ML" or "ML 2"'}
							maxLength={200}
							data-testid="program-track-name"
						/>
						{seriesPreview.series ? (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<span>Detected series:</span>
								<Badge variant="outline" className="font-mono">
									{seriesPreview.series} · #{seriesPreview.seriesOrder}
								</Badge>
							</div>
						) : (
							<p className="text-xs text-muted-foreground">
								Suffix with a number to link sessions into a series (e.g. "ML
								2").
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label>Color</Label>
						<div className="flex flex-wrap items-center gap-2">
							{PRESET_COLORS.map((c) => {
								const active = color.toLowerCase() === c.toLowerCase();
								return (
									<button
										key={c}
										type="button"
										onClick={() => setColor(c)}
										aria-label={`Pick ${c}`}
										aria-pressed={active}
										className={cn(
											"relative size-8 rounded-full border-2 transition-transform hover:scale-110",
											active
												? "border-foreground shadow-sm"
												: "border-transparent",
										)}
										style={{ backgroundColor: c }}
									>
										{active && (
											<IconCheck className="absolute inset-0 m-auto size-4 text-white mix-blend-difference" />
										)}
									</button>
								);
							})}
							<button
								type="button"
								onClick={() => setColor("")}
								aria-label="Clear color"
								aria-pressed={color === ""}
								className={cn(
									"flex size-8 items-center justify-center rounded-full border-2 text-xs text-muted-foreground",
									color === ""
										? "border-foreground bg-muted"
										: "border-dashed border-muted-foreground/40",
								)}
							>
								—
							</button>
						</div>
						<div className="flex gap-2">
							<Input
								type="color"
								value={color || "#64748b"}
								onChange={(e) => setColor(e.target.value)}
								className="h-8 w-12 cursor-pointer p-0.5"
								aria-label="Custom color"
							/>
							<Input
								value={color}
								onChange={(e) => setColor(e.target.value)}
								placeholder="#RRGGBB (optional)"
								className="flex-1 font-mono uppercase"
								maxLength={7}
							/>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={isSaving}
						data-testid="program-track-submit"
					>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						{isEdit ? "Save" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
