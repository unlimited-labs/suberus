import { IconCircleCheckFilled } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface Props {
	slotCount: number;
	usedMin: number;
	totalMin: number;
}

export function CapacityBar({ slotCount, usedMin, totalMin }: Props) {
	const full = usedMin >= totalMin;
	const pct =
		totalMin > 0 ? Math.min(100, Math.round((usedMin / totalMin) * 100)) : 0;

	return (
		<div className="mt-auto pt-1" data-testid="session-card-capacity">
			<div className="flex items-center justify-between text-[9px] text-muted-foreground/70">
				<span>
					{slotCount} {slotCount === 1 ? "talk" : "talks"} ·{" "}
					<span className="tabular-nums">
						{usedMin}/{totalMin} min
					</span>
				</span>
				{full && (
					<IconCircleCheckFilled
						className="size-3.5 text-emerald-600 dark:text-emerald-400"
						aria-label="Full"
					/>
				)}
			</div>
			<div className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full bg-muted">
				<div
					className={cn(
						"h-full rounded-full transition-all",
						full ? "bg-emerald-500" : "bg-primary/60",
					)}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}
