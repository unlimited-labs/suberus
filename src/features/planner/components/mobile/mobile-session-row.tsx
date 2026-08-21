import { IconUsers } from "@tabler/icons-react";
import {
	formatClockTime,
	formatDurationMin,
} from "@/features/planner/tz-datetime";
import type { SessionItem } from "./planner-item";

interface Props {
	item: SessionItem;
	timezone: string | undefined;
	onClick: (id: string) => void;
}

export function MobileSessionRow({ item, timezone, onClick }: Props) {
	const dur = formatDurationMin(item.startAt, item.endAt);
	return (
		<button
			className="hover:bg-muted/40 flex w-full items-stretch gap-3 px-3 py-3 text-left"
			data-testid={`mobile-session-${item.id}`}
			onClick={() => onClick(item.id)}
			type="button"
		>
			<div className="w-14 shrink-0 text-center">
				<div className="text-xs font-medium tabular-nums">
					{formatClockTime(item.startAt, timezone)}
				</div>
				<div className="text-muted-foreground text-[10px]">{dur}m</div>
			</div>
			<div
				aria-hidden
				className="w-1 shrink-0 rounded-full"
				style={{ backgroundColor: item.trackColor ?? "var(--border)" }}
			/>
			<div className="min-w-0 flex-1">
				<div className="line-clamp-2 text-sm font-medium">{item.title}</div>
				<div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1 text-xs">
					{item.roomName && <span>{item.roomName}</span>}
					{item.trackName && (
						<>
							{item.roomName && <span>·</span>}
							<span>{item.trackName}</span>
						</>
					)}
					<span>·</span>
					<span>
						{item.presentationCount} talk
						{item.presentationCount === 1 ? "" : "s"}
					</span>
				</div>
				{item.chairs.length > 0 && (
					<div className="text-muted-foreground mt-1 flex items-center gap-1 text-[11px]">
						<IconUsers size={10} />
						{item.chairs
							.map((c) => `${c.firstName} ${c.lastName}`.trim())
							.join(", ")}
					</div>
				)}
			</div>
		</button>
	);
}
