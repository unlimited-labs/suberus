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
			className="bg-muted/30 hover:bg-muted/50 flex w-full items-center gap-3 p-3 text-left"
			data-testid={`mobile-break-${item.id}`}
			onClick={() => onClick(item.id)}
			type="button"
		>
			<div className="w-14 shrink-0 text-center">
				<div className="text-xs font-medium tabular-nums">
					{formatClockTime(item.startAt, timezone)}
				</div>
				<div className="text-muted-foreground text-[10px]">{dur}m</div>
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 text-sm font-medium">
					{isEvent && <IconCalendarEvent className="size-3.5 shrink-0" />}
					{item.title}
				</div>
				{isEvent && item.description && (
					<div className="text-muted-foreground truncate text-xs">
						{item.description}
					</div>
				)}
				{isEvent
					? item.location && (
							<div className="text-muted-foreground text-xs">
								{item.location}
							</div>
						)
					: item.roomName && (
							<div className="text-muted-foreground text-xs">
								{item.roomName}
							</div>
						)}
			</div>
		</button>
	);
}
