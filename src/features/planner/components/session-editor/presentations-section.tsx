import {
	IconBan,
	IconChevronDown,
	IconChevronUp,
	IconX,
} from "@tabler/icons-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useSessionEditor } from "./session-editor-context";

export function PresentationsSection() {
	const {
		sortedPresentations: presentations,
		usedMin,
		sessionDurationMin,
		mutations,
	} = useSessionEditor();
	const remainingMin = sessionDurationMin - usedMin;
	const capacityFull = usedMin >= sessionDurationMin;

	const handleMove = (index: number, dir: "up" | "down") => {
		const reordered = [...presentations];
		const swap = dir === "up" ? index - 1 : index + 1;
		[reordered[index], reordered[swap]] = [reordered[swap], reordered[index]];
		mutations.reorderPresentations(reordered.map((p) => p.id));
	};

	return (
		<div className="space-y-2 p-4">
			<div className="flex items-center justify-between">
				<Label className="text-sm font-medium">
					Presentations{" "}
					<span className="font-normal text-muted-foreground">
						({presentations.length})
					</span>
				</Label>
				<span
					className={`text-xs tabular-nums ${capacityFull ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
				>
					{usedMin}/{sessionDurationMin} min
					{!capacityFull && remainingMin > 0 && (
						<span className="opacity-60"> · {remainingMin} free</span>
					)}
				</span>
			</div>

			{presentations.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					No presentations assigned
				</p>
			) : (
				<div className="space-y-1">
					{presentations.map((p, i) => (
						<div
							key={p.id}
							data-testid={`session-editor-slot-${p.id}`}
							className="flex items-center gap-2 rounded-md border px-2 py-1.5"
						>
							<div className="flex flex-col">
								<Button
									variant="ghost"
									size="icon-xs"
									disabled={i === 0}
									onClick={() => handleMove(i, "up")}
								>
									<IconChevronUp size={11} />
								</Button>
								<Button
									variant="ghost"
									size="icon-xs"
									disabled={i === presentations.length - 1}
									onClick={() => handleMove(i, "down")}
								>
									<IconChevronDown size={11} />
								</Button>
							</div>
							<div className="min-w-0 flex-1">
								<p
									className={cn(
										"line-clamp-2 text-sm leading-snug",
										p.cancelled && "text-muted-foreground line-through",
									)}
								>
									{p.submissionTitle}
								</p>
								<p className="mt-0.5 truncate text-xs text-muted-foreground">
									{p.authors.length > 0
										? p.authors
												.map((a) => `${a.firstName} ${a.lastName}`)
												.join(", ")
										: "No authors"}
								</p>
							</div>
							<div className="flex items-center gap-1">
								<Input
									type="number"
									min={1}
									step={5}
									defaultValue={p.durationMin}
									key={`${p.id}:${p.durationMin}`}
									onBlur={(e) => {
										const v = Number(e.target.value);
										if (v > 0 && v !== p.durationMin) {
											mutations.updatePresentationDuration(p.id, v);
										}
									}}
									aria-label={`Duration of ${p.submissionTitle}`}
									className="h-7 w-14 px-1.5 text-center text-xs tabular-nums"
								/>
								<span className="text-[10px] text-muted-foreground">min</span>
							</div>
							<Button
								variant="ghost"
								size="icon-sm"
								data-testid={`presentation-cancel-${p.id}`}
								aria-pressed={p.cancelled}
								aria-label={
									p.cancelled
										? `Restore ${p.submissionTitle}`
										: `Cancel ${p.submissionTitle}`
								}
								className={cn(p.cancelled && "text-destructive")}
								onClick={() => mutations.setCancelled(p.id, !p.cancelled)}
							>
								<IconBan size={12} />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => mutations.removePresentation(p.id)}
							>
								<IconX size={12} />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
