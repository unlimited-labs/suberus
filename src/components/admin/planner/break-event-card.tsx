import { IconCoffee } from "@tabler/icons-react";

export interface BreakEventData {
	kind: "break";
	breakId: string;
}

export function BreakEventCard({
	title,
	data,
}: {
	title: string;
	data?: BreakEventData;
}) {
	return (
		<div
			data-testid={data ? `break-card-${data.breakId}` : "break-card"}
			className="flex h-full items-center gap-1.5 overflow-hidden rounded-md border border-dashed border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
		>
			<IconCoffee className="size-3.5 shrink-0" />
			<span className="truncate font-medium">{title}</span>
		</div>
	);
}
