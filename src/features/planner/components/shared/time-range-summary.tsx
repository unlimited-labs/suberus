import { IconClock } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { formatClockTime } from "@/shared/lib/tz-datetime";

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
			<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<IconClock size={12} className="shrink-0" />
				<span className="font-medium tabular-nums text-foreground">
					{formatClockTime(start, timezone)}
				</span>
				<span>—</span>
				<span className="font-medium tabular-nums text-foreground">
					{formatClockTime(end, timezone)}
				</span>
				<span className="ml-auto">
					{totalMin} min{extra}
				</span>
			</div>
		);
	}
	return (
		<div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
			<IconClock size={14} className="shrink-0 text-muted-foreground" />
			<span className="text-sm font-medium tabular-nums">
				{formatClockTime(start, timezone)}
			</span>
			<span className="text-muted-foreground">—</span>
			<span className="text-sm font-medium tabular-nums">
				{formatClockTime(end, timezone)}
			</span>
			<span className="ml-auto text-xs text-muted-foreground">
				{totalMin} min{extra}
			</span>
		</div>
	);
}
