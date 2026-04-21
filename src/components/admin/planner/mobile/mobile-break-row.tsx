import { formatClockTime, formatDurationMin } from "@/utils/tz-datetime";
import type { BreakItem } from "./planner-item";

interface Props {
	item: BreakItem;
	timezone: string | undefined;
	onClick: (id: string) => void;
}

export function MobileBreakRow({ item, timezone, onClick }: Props) {
	const dur = formatDurationMin(item.startAt, item.endAt);
	return (
		<button
			type="button"
			onClick={() => onClick(item.id)}
			data-testid={`mobile-break-${item.id}`}
			className="flex w-full items-center gap-3 bg-muted/30 px-3 py-3 text-left hover:bg-muted/50"
		>
			<div className="w-14 shrink-0 text-center">
				<div className="text-xs font-medium tabular-nums">
					{formatClockTime(item.startAt, timezone)}
				</div>
				<div className="text-[10px] text-muted-foreground">{dur}m</div>
			</div>
			<div className="flex-1 min-w-0">
				<div className="text-sm font-medium">{item.title}</div>
				{item.roomName && (
					<div className="text-xs text-muted-foreground">{item.roomName}</div>
				)}
			</div>
		</button>
	);
}
