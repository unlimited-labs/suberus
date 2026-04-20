import { IconGauge } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { scheduleCapacityQueryOptions } from "@/utils/schedule.functions";

export function CapacityStrip() {
	const { data: cap } = useSuspenseQuery(scheduleCapacityQueryOptions());

	const deficit = cap.talks - cap.totalSlots;
	const coverageColor =
		deficit > 0
			? "text-amber-700 dark:text-amber-400"
			: deficit === 0 && cap.talks > 0
				? "text-emerald-700 dark:text-emerald-400"
				: "text-muted-foreground";

	return (
		<div
			className="flex items-center gap-2 border-b px-3 py-1 text-[11px] tabular-nums"
			title={`${cap.sessions} session${cap.sessions === 1 ? "" : "s"} × ${cap.slotMinutes}-min slots`}
		>
			<IconGauge size={12} className="text-muted-foreground" />
			<span className={`font-medium ${coverageColor}`}>
				<span className="text-foreground">{cap.talks}</span>
				<span className="text-muted-foreground/70"> / </span>
				<span className="text-foreground">{cap.totalSlots}</span>{" "}
				<span className="text-muted-foreground">slots</span>
			</span>
			{deficit > 0 && (
				<span className="text-amber-700 dark:text-amber-400">
					· need {deficit} more
				</span>
			)}
			{deficit < 0 && (
				<span className="text-muted-foreground">
					· {Math.abs(deficit)} spare
				</span>
			)}
			<span className="text-muted-foreground/50">·</span>
			<span className="text-muted-foreground">
				<span className="font-medium text-foreground">{cap.scheduled}</span>{" "}
				placed
			</span>
		</div>
	);
}
