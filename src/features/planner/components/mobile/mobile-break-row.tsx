import { IconCalendarEvent } from "@tabler/icons-react";
import {
	formatClockTime,
	formatDurationMin,
} from "@/features/planner/tz-datetime";
import type { BreakItem } from "./planner-item";

interface Props {
	item: BreakItem;
	timezone: string | undefined;
	onClick: (id: string) => void;
}

export function MobileBreakRow({ item, timezone, onClick }: Props) {
	const dur = formatDurationMin(item.startAt, item.endAt);
	const isEvent = item.itemKind === "event";
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
				<div className="flex items-center gap-1.5 text-sm font-medium">
					{isEvent && <IconCalendarEvent className="size-3.5 shrink-0" />}
					{item.title}
				</div>
				{isEvent && item.description && (
					<div className="truncate text-xs text-muted-foreground">
						{item.description}
					</div>
				)}
				{isEvent
					? item.location && (
							<div className="text-xs text-muted-foreground">
								{item.location}
							</div>
						)
					: item.roomName && (
							<div className="text-xs text-muted-foreground">
								{item.roomName}
							</div>
						)}
			</div>
		</button>
	);
}
