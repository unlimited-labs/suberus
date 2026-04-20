import { IconGauge } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { scheduleCapacityQueryOptions } from "@/utils/schedule.functions";

function formatMinutes(min: number): string {
	if (min <= 0) return "0 min";
	const h = Math.floor(min / 60);
	const m = Math.round(min % 60);
	if (h === 0) return `${m} min`;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

export function CapacityStrip() {
	const { data: cap } = useSuspenseQuery(scheduleCapacityQueryOptions());

	const unplaced = Math.max(0, cap.talks - cap.scheduled);
	const fullUtilization =
		cap.sessionMinutes > 0 && cap.usedMinutes >= cap.sessionMinutes;

	return (
		<div
			data-testid="capacity-strip"
			className="flex flex-wrap items-center gap-2 border-b px-3 py-1 text-[11px] tabular-nums"
			title={`${cap.sessions} session${cap.sessions === 1 ? "" : "s"} · ${formatMinutes(cap.sessionMinutes)} total · ${formatMinutes(cap.usedMinutes)} used`}
		>
			<IconGauge size={12} className="text-muted-foreground" />
			<span className="text-muted-foreground">
				<span className="font-medium text-foreground">{cap.scheduled}</span>
				<span className="text-muted-foreground/70"> / </span>
				<span className="font-medium text-foreground">{cap.talks}</span> placed
			</span>
			{unplaced > 0 && (
				<>
					<span className="text-muted-foreground/50">·</span>
					<span className="text-muted-foreground">
						<span className="font-medium text-foreground">{unplaced}</span>{" "}
						unassigned
					</span>
				</>
			)}
			<span className="text-muted-foreground/50">·</span>
			<span
				className={
					fullUtilization
						? "text-amber-700 dark:text-amber-400"
						: "text-muted-foreground"
				}
			>
				<span className="font-medium">{formatMinutes(cap.freeMinutes)}</span>{" "}
				free{fullUtilization ? " (sessions full)" : ""}
			</span>
		</div>
	);
}
