import { IconGauge } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { scheduleCapacityQueryOptions } from "@/utils/schedule.functions";

export function CapacityStrip() {
	const { data: cap } = useSuspenseQuery(scheduleCapacityQueryOptions());

	const color =
		cap.utilizationPct >= 95
			? "text-amber-700 dark:text-amber-400"
			: cap.utilizationPct >= 70
				? "text-foreground"
				: "text-muted-foreground";

	return (
		<div
			className="flex items-center gap-2 border-b px-3 py-1 text-[11px] tabular-nums"
			title={`${cap.days} days × ${cap.rooms} rooms × ${cap.hoursPerDay}h ÷ ${cap.slotMinutes} min`}
		>
			<IconGauge size={12} className="text-muted-foreground" />
			<span className="text-muted-foreground">
				<span className="font-medium text-foreground">{cap.talks}</span> talks
			</span>
			<span className="text-muted-foreground/50">·</span>
			<span className="text-muted-foreground">
				<span className="font-medium text-foreground">{cap.scheduled}</span>/
				{cap.theoreticalSlots} slots
			</span>
			<span className="text-muted-foreground/50">·</span>
			<span className={`font-medium ${color}`}>{cap.utilizationPct}% used</span>
		</div>
	);
}
