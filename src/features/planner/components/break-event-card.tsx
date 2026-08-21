import { IconCalendarEvent, IconCoffee } from "@tabler/icons-react";

export interface BreakEventData {
	kind: "break";
	breakId: string;
	itemKind: "break" | "event";
}

export function BreakEventCard({
	title,
	data,
}: {
	title: string;
	data?: BreakEventData;
}) {
	const isEvent = data?.itemKind === "event";
	return (
		<div
			className={
				isEvent
					? "flex h-full items-center gap-1.5 overflow-hidden rounded-md border border-violet-300 bg-violet-100 px-2 py-1 text-[11px] text-violet-900 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200"
					: "flex h-full items-center gap-1.5 overflow-hidden rounded-md border border-dashed border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
			}
			data-testid={data ? `break-card-${data.breakId}` : "break-card"}
		>
			{isEvent ? (
				<IconCalendarEvent className="size-3.5 shrink-0" />
			) : (
				<IconCoffee className="size-3.5 shrink-0" />
			)}
			<span className="truncate font-medium">{title}</span>
		</div>
	);
}
