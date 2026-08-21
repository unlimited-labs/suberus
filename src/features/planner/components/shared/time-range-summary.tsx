import { IconClock } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { formatClockTime } from "@/features/planner/tz-datetime";

interface Props {
	start: Date;
	end: Date;
	totalMin: number;
	timezone: string | undefined;
	extra?: ReactNode;
	compact?: boolean;
}

export function TimeRangeSummary({
	start,
	end,
	totalMin,
	timezone,
	extra,
	compact = false,
}: Props) {
	if (compact) {
		return (
			<div className="text-muted-foreground flex items-center gap-1.5 text-xs">
				<IconClock className="shrink-0" size={12} />
				<span className="text-foreground font-medium tabular-nums">
					{formatClockTime(start, timezone)}
				</span>
				<span>—</span>
				<span className="text-foreground font-medium tabular-nums">
					{formatClockTime(end, timezone)}
				</span>
				<span className="ml-auto">
					{totalMin} min{extra}
				</span>
			</div>
		);
	}
	return (
		<div className="bg-muted/60 flex items-center gap-2 rounded-md px-3 py-2">
			<IconClock className="text-muted-foreground shrink-0" size={14} />
			<span className="text-sm font-medium tabular-nums">
				{formatClockTime(start, timezone)}
			</span>
			<span className="text-muted-foreground">—</span>
			<span className="text-sm font-medium tabular-nums">
				{formatClockTime(end, timezone)}
			</span>
			<span className="text-muted-foreground ml-auto text-xs">
				{totalMin} min{extra}
			</span>
		</div>
	);
}
