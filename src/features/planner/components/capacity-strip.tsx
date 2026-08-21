import { IconGauge } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { scheduleCapacityQueryOptions } from "@/features/planner/api/schedule";
import { formatDurationShort } from "@/shared/lib/format-date";

export function CapacityStrip() {
	const { data: cap } = useSuspenseQuery(scheduleCapacityQueryOptions());

	const fullUtilization =
		cap.sessionMinutes > 0 && cap.usedMinutes >= cap.sessionMinutes;

	return (
		<div
			className="flex flex-wrap items-center gap-2 border-b px-3 py-1 text-[11px] tabular-nums"
			data-testid="capacity-strip"
			title={`${cap.sessions} session${cap.sessions === 1 ? "" : "s"} · ${formatDurationShort(cap.sessionMinutes)} total · ${formatDurationShort(cap.usedMinutes)} used`}
		>
			<IconGauge className="text-muted-foreground" size={12} />
			<span className="text-muted-foreground">
				<span className="text-foreground font-medium">{cap.scheduled}</span>
				<span className="text-muted-foreground/70"> / </span>
				<span className="text-foreground font-medium">{cap.talks}</span> placed
			</span>
			<span className="text-muted-foreground/50">·</span>
			<span
				className={
					fullUtilization
						? "text-amber-700 dark:text-amber-400"
						: "text-muted-foreground"
				}
				title="Slots assume the default presentation length"
			>
				<span className="font-medium">
					{formatDurationShort(cap.freeMinutes)}
				</span>{" "}
				<span className="text-muted-foreground/70">
					(<span className="text-foreground font-medium">{cap.freeSlots}</span>{" "}
					slot{cap.freeSlots === 1 ? "" : "s"})
				</span>{" "}
				free{fullUtilization ? " (sessions full)" : ""}
			</span>
		</div>
	);
}
