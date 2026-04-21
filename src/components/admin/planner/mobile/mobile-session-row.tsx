import { IconUsers } from "@tabler/icons-react";
import { formatClockTime, formatDurationMin } from "@/utils/tz-datetime";
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
			type="button"
			onClick={() => onClick(item.id)}
			data-testid={`mobile-session-${item.id}`}
			className="flex w-full items-stretch gap-3 px-3 py-3 text-left hover:bg-muted/40"
		>
			<div className="w-14 shrink-0 text-center">
				<div className="text-xs font-medium tabular-nums">
					{formatClockTime(item.startAt, timezone)}
				</div>
				<div className="text-[10px] text-muted-foreground">{dur}m</div>
			</div>
			<div
				className="w-1 shrink-0 rounded-full"
				style={{ backgroundColor: item.trackColor ?? "var(--border)" }}
				aria-hidden
			/>
			<div className="flex-1 min-w-0">
				<div className="line-clamp-2 text-sm font-medium">{item.title}</div>
				<div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
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
					<div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
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
