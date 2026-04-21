import { IconClock } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface Props {
	start: Date;
	end: Date;
	totalMin: number;
	timezone: string | undefined;
	extra?: ReactNode;
}

function formatTime(date: Date, timezone: string | undefined) {
	return date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: timezone || undefined,
	});
}

export function TimeRangeSummary({
	start,
	end,
	totalMin,
	timezone,
	extra,
}: Props) {
	return (
		<div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
			<IconClock size={14} className="shrink-0 text-muted-foreground" />
			<span className="text-sm font-medium tabular-nums">
				{formatTime(start, timezone)}
			</span>
			<span className="text-muted-foreground">→</span>
			<span className="text-sm font-medium tabular-nums">
				{formatTime(end, timezone)}
			</span>
			<span className="ml-auto text-xs text-muted-foreground">
				{totalMin} min{extra}
			</span>
		</div>
	);
}
