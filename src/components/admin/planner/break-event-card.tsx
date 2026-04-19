import { IconCoffee } from "@tabler/icons-react";

export interface BreakEventData {
	kind: "break";
	breakId: string;
}

export function BreakEventCard({ title }: { title: string }) {
	return (
		<div className="flex h-full items-center gap-1.5 overflow-hidden rounded-md border border-dashed bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
			<IconCoffee className="size-3.5 shrink-0" />
			<span className="truncate font-medium">{title}</span>
		</div>
	);
}
